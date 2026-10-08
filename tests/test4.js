// 南瓜拓印 v2.3 驗收：M1（A1–A6）＋ M2（B1、像素風）＋ M3（C1–C5）
// 用法：node test4.js [index.html 路徑] [--only m1|m2|m3]
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const target = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : path.join(ROOT, 'index.html');
const v22 = path.join(__dirname, 'v2.2', 'index_v2.2.html');
const onlyArg = process.argv.indexOf('--only'); const ONLY = onlyArg > -1 ? process.argv[onlyArg + 1] : null;
const shots = path.join(__dirname, 'shots4'); fs.mkdirSync(shots, { recursive: true });
const log = (...a) => console.log(...a);
const R = {}; const pass = (k, ok, info) => { R[k] = { ok: !!ok, info }; log(`${ok ? 'PASS' : 'FAIL'} ${k}`, info !== undefined ? JSON.stringify(info) : ''); };
const fileUrl = f => 'file:///' + f.replace(/\\/g, '/');
const LAUNCH = { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] };

// ---- 最小 ZIP 讀取（store-only） ----
function readZip(buf) {
  let eo = buf.length - 22; while (eo >= 0 && buf.readUInt32LE(eo) !== 0x06054b50) eo--; if (eo < 0) throw new Error('no EOCD');
  const n = buf.readUInt16LE(eo + 10), cdOff = buf.readUInt32LE(eo + 16); const out = []; let p = cdOff;
  for (let i = 0; i < n; i++) { if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central header');
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString('utf8'); const lnl = buf.readUInt16LE(lo + 26), lxl = buf.readUInt16LE(lo + 28); const data = buf.slice(lo + 30 + lnl + lxl, lo + 30 + lnl + lxl + size);
    out.push({ name, method, crc, size, data }); p += 46 + nl + xl + cl; }
  return out;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xFFFFFFFF; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }; })();

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1600, height: 960 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [], warns = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  return { ctx, page, errors, warns };
}
// 頁面內共用輔助（screen 座標、像素讀取、等待）
const H = {
  S: (page, p) => page.evaluate(p => { const q = imgToScreen(p); const r = stage.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; }, p),
  A: (page, p) => page.evaluate(p => { const q = a2s(p.x, p.y); const r = atlasView.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; }, p),
  idle: (page, full = true) => page.waitForFunction(full => { const r = selected(); const rt = r && RT.get(r.id); return rt && rt.resultCanvas && (full ? isSettled(r.id) : !rt.busy) && placementOf(r.id); }, full, { timeout: 20000 }),
};
const PAGE_HELPERS = () => {
  window.__px = c => { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; const x = k.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  window.__hash = c => { const d = __px(c); let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + ':' + c.width + 'x' + c.height; };
  // 彎邊貼合度：沿每條邊 5 個位置，往法線方向找原圖「螢幕像素（亮或飽和）」真正的邊界，量曲線離它幾 px（原圖像素）
  window.__edgeFit = (r) => { /* v2.3.2 量法（2026-10-07 協調器裁定）：範例 CRT 螢幕邊緣會發光，像素級邊界不穩，
      改量「彎邊離遮罩邊界穩健擬合曲線的偏差」。每條邊在 15%–85% 取 21 點，沿法線由外往內找遮罩邊界（亮或飽和＝螢幕），
      對偏移量做穩健二次擬合（剔除閃光／光暈離群點），再看邊的 25%–75% 五個取樣點離擬合曲線多遠。 */
    const src = sourceStore.get(r.sourceId).canvas, W = src.width, Hh = src.height; const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, Hh).data;
    const isScr = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= Hh) return false; const i = (y * W + x) * 4, rr = d[i], g = d[i + 1], b = d[i + 2]; return (rr + g + b) / 3 > 85 || Math.max(rr, g, b) - Math.min(rr, g, b) > 60; };
    const c = r.pts.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
    const fit2 = (xs, ys) => { const n = 3, A = [...Array(n)].map((_, i) => [...Array(n)].map((_, j) => xs.reduce((s, x) => s + x ** (i + j), 0))), B = [...Array(n)].map((_, i) => xs.reduce((s, x, k) => s + ys[k] * x ** i, 0));
      const M = A.map((row, i) => [...row, B[i]]); for (let i = 0; i < n; i++) { let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; [M[i], M[p]] = [M[p], M[i]]; for (let k = 0; k < n; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; } }
      const co = M.map((row, i) => row[n] / row[i]); return u => co[0] + co[1] * u + co[2] * u * u; };
    const out = [], raw = [];
    for (let e = 0; e < 4; e++) { const E = quadEdgeImgPts(r, e, 200), a = r.pts[e], b = r.pts[(e + 1) % 4]; let nx = -(b.y - a.y), ny = b.x - a.x; const L = Math.hypot(nx, ny); nx /= L; ny /= L;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if ((m.x - c.x) * nx + (m.y - c.y) * ny < 0) { nx = -nx; ny = -ny; }
      const scan = P => { for (let t = 24; t >= -24; t -= 0.5) { if (isScr(P.x + nx * t, P.y + ny * t) && isScr(P.x + nx * (t - 1), P.y + ny * (t - 1)) && isScr(P.x + nx * (t - 2), P.y + ny * (t - 2))) return t; } return null; };
      let us = [], ts = []; for (let k = 0; k <= 20; k++) { const u = 0.15 + k * 0.035, t = scan(E[Math.round(u * 200)]); if (t !== null) { us.push(u); ts.push(t); } }
      let f = fit2(us, ts); for (let it = 0; it < 3; it++) { const res = us.map((u, k) => Math.abs(ts[k] - f(u))), med = [...res].sort((x, y) => x - y)[res.length >> 1]; const keep = res.map(v => v <= Math.max(1.5, 3 * med)); us = us.filter((_, k) => keep[k]); ts = ts.filter((_, k) => keep[k]); f = fit2(us, ts); }
      out.push([0.25, 0.375, 0.5, 0.625, 0.75].map(u => +f(u).toFixed(2))); raw.push(ts.length); }
    const all = out.flat().map(Math.abs).sort((x, y) => x - y); const p80 = all[Math.ceil(all.length * 0.8) - 1];
    return { perEdge: out, p80: +p80.toFixed(2), maxErr: +all[all.length - 1].toFixed(2), keptPts: raw }; };
  window.__redLine = c => { const d = __px(c), W = c.width, Hh = c.height; const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => Math.round(f * (W - 1)));
    const ys = xs.map(x => { let n = 0, s = 0; for (let y = 0; y < Hh; y++) { const i = (y * W + x) * 4; const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 100 && r > 2 * g && r > 2 * b) { n++; s += y; } } return n ? s / n : NaN; });
    const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const k = sxy / sxx; const res = ys.map((y, i) => Math.abs(y - (my + k * (xs[i] - mx)))); return { xs, ys: ys.map(v => +v.toFixed(2)), maxErr: +Math.max(...res).toFixed(3) }; };
};

async function M1(browser) {
  log('\n===== M1 =====');
  const { page, errors, warns } = await newPage(browser);
  await page.goto(fileUrl(target)); await page.waitForTimeout(300); await page.evaluate(() => closeOnboarding()); await page.evaluate(PAGE_HELPERS);
  await page.evaluate(() => loadSample('gameboy')); await page.waitForFunction(() => state.sources.length === 1);
  // ---------- A1：四點框（範例 Game Boy 螢幕）→ 參考結果；Alt＋點邊加控制點 → 拖彎 → 拖直回去 ----------
  for (const p of await page.evaluate(() => SAMPLES.gameboy.screen)) { const s = await H.S(page, p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(60); }
  await H.idle(page);
  const ref = await page.evaluate(() => { const r = selected(); const rt = RT.get(r.id); return { id: r.id, pts: r.pts, outW: r.outW, outH: r.outH, base: Array.from(rt.base.data), w: rt.base.width, h: rt.base.height, hash: __hash(rt.resultCanvas) }; });
  log('panel quad:', ref.outW + 'x' + ref.outH);
  // v2.2 原檔同一張圖、同 4 點、同尺寸 → base 像素
  const sampleURL = await page.evaluate(() => sourceStore.get(state.sources[0].id).canvas.toDataURL('image/png'));
  const p22 = await newPage(browser); await p22.page.goto(fileUrl(v22)); await p22.page.waitForTimeout(300); await p22.page.evaluate(() => closeOnboarding());
  const base22 = await p22.page.evaluate(async ({ url, pts, outW, outH }) => { const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = url; }); registerSource(im, 's.png', 'image/png');
    const r = addRegion(true); r.pts = pts; r.outW = outW; r.outH = outH; r.autoSize = false; onRegionGeomChanged(r.id);
    await new Promise(res => { const t = setInterval(() => { const rt = RT.get(r.id); if (rt && rt.resultCanvas && !rt.busy) { clearInterval(t); res(); } }, 50); });
    return Array.from(RT.get(r.id).base.data); }, { url: sampleURL, pts: ref.pts, outW: ref.outW, outH: ref.outH });
  await p22.ctx.close();
  const maxDiff = (a, b) => { if (a.length !== b.length) return 999; let m = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; } return m; };
  const diffRef22 = maxDiff(ref.base, base22); log('v2.3 直線四點 vs v2.2：max diff', diffRef22);
  // Alt＋點上邊中段
  const mid = await page.evaluate(() => { const r = selected(); const a = r.pts[0], b = r.pts[1]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; });
  const ms = await H.S(page, mid); await page.keyboard.down('Alt'); await page.mouse.click(ms.x, ms.y); await page.keyboard.up('Alt'); await page.waitForTimeout(150);
  const afterAdd = await page.evaluate(() => selected().bend.map(e => e.length));
  // 拖彎（期間檢查 ¼ 解析度預覽 = A6）
  await page.mouse.move(ms.x, ms.y); await page.mouse.down(); await page.mouse.move(ms.x, ms.y - 45, { steps: 6 }); await page.waitForTimeout(700);
  const during = await page.evaluate(() => { const r = selected(); const rt = RT.get(r.id); return { res: rt.res, baseW: rt.base.width, baseH: rt.base.height, outW: r.outW, outH: r.outH, status: $('status').textContent, place: (({ w, h }) => [w, h])(placementOf(r.id)) }; });
  await page.screenshot({ path: path.join(shots, 'A1_bending_lowres.png') });
  await page.mouse.up(); await page.waitForTimeout(100); await H.idle(page);
  const bent = await page.evaluate(() => { const r = selected(); const rt = RT.get(r.id); return { bend: r.bend, has: GEO.hasBend(r.bend), res: rt.res, w: rt.base.width, h: rt.base.height, hash: __hash(rt.resultCanvas), status: $('status').textContent }; });
  await page.screenshot({ path: path.join(shots, 'A1_bent.png') });
  // 拖直回去（拖回原中點，5px 內吸附 d=0）
  const hp = await page.evaluate(() => { const r = selected(); const H = quadH(r); const q = imgToScreen(bendHandleImg(H, 0, r.bend[0][0])); const b = stage.getBoundingClientRect(); return { x: q.x + b.left, y: q.y + b.top }; });
  await page.mouse.move(hp.x, hp.y); await page.mouse.down(); await page.mouse.move(ms.x + 1, ms.y + 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100); await H.idle(page);
  const straight = await page.evaluate(() => { const r = selected(); const rt = RT.get(r.id); return { bend: r.bend, has: GEO.hasBend(r.bend), base: Array.from(rt.base.data), hash: __hash(rt.resultCanvas) }; });
  const diffBack = maxDiff(straight.base, ref.base), diffBack22 = maxDiff(straight.base, base22);
  pass('A1', afterAdd[0] === 1 && bent.has && bent.hash !== ref.hash && !straight.has && straight.bend[0].length === 1 && diffBack <= 1 && diffBack22 <= 1 && diffRef22 <= 1,
    { addHandles: afterAdd, bentChanged: bent.hash !== ref.hash, handleKeptAfterStraight: straight.bend[0].length, snappedD: straight.bend[0][0] && straight.bend[0][0].d, maxDiff_vs_unbent: diffBack, maxDiff_vs_v22: diffBack22, unbent_vs_v22: diffRef22 });
  pass('A6', during.res === 'low' && during.baseW === Math.max(16, Math.round(during.outW / 4)) && /¼/.test(during.status) && bent.res === 'full' && bent.w === during.outW && !/¼/.test(bent.status) && during.place[0] === ref.outW,
    { during: { res: during.res, base: [during.baseW, during.baseH], out: [during.outW, during.outH], atlasPlace: during.place, status: during.status.slice(0, 80) }, after: { res: bent.res, base: [bent.w, bent.h] } });

  // ---------- A2：範例 CRT 電視微弧螢幕（彎邊四點）→ 四條邊貼合真正的螢幕邊界 ----------
  // 原 SPEC A2 量的是程序化桶標籤的紅中線；v2.3.1 範例換成真照片（南瓜指示），改量「彎邊是否貼合螢幕的弧形邊」：
  // 沿每條邊 5 點找原圖亮區邊界，最大偏差 < 2px（直四點對照組約 5px）。
  const crtDo = async (pg, zoom) => { await pg.evaluate(() => loadSample('crt')); await pg.waitForFunction(() => state.sources.some(s => s.name === SAMPLES.crt.name) && img && img.width === SAMPLES.crt.w);
    if (zoom) await pg.evaluate(() => focusView(SAMPLES.crt.screen, 1.35));
    for (const p of await pg.evaluate(() => SAMPLES.crt.screen)) { const s = await H.S(pg, p); await pg.mouse.click(s.x, s.y); await pg.waitForTimeout(60); }
    await H.idle(pg);
    const flat = await pg.evaluate(() => __edgeFit(selected()));
    const ghost = e => pg.evaluate(e => { const r = selected(); const g = ghostOf(r, e, quadH(r), GEO.bendFns(r.bend)); const b = stage.getBoundingClientRect(); return { x: g.x + b.left, y: g.y + b.top }; }, e);
    for (let e = 0; e < 4; e++) { const g = await ghost(e), t = await H.S(pg, await pg.evaluate(e => SAMPLES.crt.edges[e], e)); await pg.mouse.move(g.x, g.y); await pg.mouse.down(); await pg.mouse.move(t.x, t.y, { steps: 8 }); await pg.mouse.up(); await pg.waitForTimeout(100); }
    await H.idle(pg);
    return pg.evaluate(flat => { const r = selected(); const need = SAMPLES.crt.edges.map((p, e) => { const a = imgToScreen(r.pts[e]), b = imgToScreen(r.pts[(e + 1) % 4]), q = imgToScreen(p); return +(Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y)).toFixed(2); });
      return { viewScale: +view.scale.toFixed(3), neededBendScreenPx: need, bend: r.bend.map(e => e.map(h => +h.d.toFixed(4))), straightQuad: flat, bentQuad: __edgeFit(r), out: [r.outW, r.outH] }; }, flat); };
  const crt = await crtDo(page, true);
  await page.screenshot({ path: path.join(shots, 'A2_crt.png') });
  const u2 = await page.evaluate(() => RT.get(selected().id).resultCanvas.toDataURL()); fs.writeFileSync(path.join(shots, 'A2_crt_out.png'), Buffer.from(u2.split(',')[1], 'base64'));
  /* 門檻（2026-10-07 裁定）：P80 < 2px、最大 < 8px、P80 比直四點改善 ≥ 70% */
  const a2ok = q => q.bend.every(e => e.length === 1 && e[0] !== 0) && q.bentQuad.p80 < 2 && q.bentQuad.maxErr < 8 && q.bentQuad.p80 <= q.straightQuad.p80 * 0.3;
  pass('A2', a2ok(crt), crt);

  // ---------- A2-fit（QA FAIL-1 回歸）：預設全覽縮放、不放大，直接拖中間小圓到真正的弧形邊 ----------
  { const p2 = await newPage(browser); const pg = p2.page; await pg.goto(fileUrl(target)); await pg.waitForTimeout(300); await pg.evaluate(() => closeOnboarding()); await pg.evaluate(PAGE_HELPERS);
    const fit = await crtDo(pg, false);
    pass('A2_fit', a2ok(fit), fit);
    await p2.ctx.close(); }

  // ---------- A3：右欄拓印清單（第 3 個 region：矩形） ----------
  await page.evaluate(() => resetView());
  await page.keyboard.press('n'); await page.keyboard.press('m'); await page.waitForTimeout(80);
  let a = await H.S(page, { x: 30, y: 60 }), b = await H.S(page, { x: 170, y: 170 }); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up(); await H.idle(page);
  await page.waitForFunction(() => state.regions.length === 3 && state.regions.every(r => { const rt = RT.get(r.id); return rt && rt.thumb && !rt.busy; }), null, { timeout: 15000 });
  const cards = await page.evaluate(() => [...document.querySelectorAll('#rgList .rg')].map(d => ({ rid: +d.dataset.rid, img: !!d.querySelector('img'), sel: d.classList.contains('sel') })));
  await page.click('#rgList .rg:nth-child(1)'); await page.waitForTimeout(150);
  const afterClick = await page.evaluate(() => ({ sel: state.selectedRegionId, first: state.regions[0].id, cardSel: document.querySelector('#rgList .rg.sel').dataset.rid }));
  await page.screenshot({ path: path.join(shots, 'A3_gallery.png') });
  const thumbBefore = await page.evaluate(() => document.querySelector('#rgList .rg:nth-child(1) img').src.length);

  // ---------- A5：匯出全部拓印 ZIP ----------
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportAllZip('albedo'))]);
  const zipName = dl.suggestedFilename(); const zbuf = fs.readFileSync(await dl.path()); fs.writeFileSync(path.join(shots, 'A5_' + zipName), zbuf);
  const entries = readZip(zbuf); const pngSig = '89504e470d0a1a0a';
  const expectNames = await page.evaluate(() => state.regions.map(r => baseName(state.sources.find(s => s.id === r.sourceId).name) + '_' + r.name + '.png'));
  const zipOk = entries.length === 3 && entries.every(e => e.method === 0 && e.data.slice(0, 8).toString('hex') === pngSig && CRC(e.data) === e.crc && e.name.startsWith('範例_') && e.name.endsWith('.png')) && JSON.stringify(entries.map(e => e.name).sort()) === JSON.stringify(expectNames.sort());
  const unz = path.join(shots, 'A5_unzipped'); fs.rmSync(unz, { recursive: true, force: true }); fs.mkdirSync(unz, { recursive: true }); entries.forEach(e => fs.writeFileSync(path.join(unz, e.name), e.data));
  pass('A5', zipOk, { zip: zipName, files: entries.map(e => `${e.name} (${e.size}B)`) });

  // A3 續：刪除後清單同步（hover 卡片點 ✕）
  await page.hover('#rgList .rg:nth-child(2)'); await page.click('#rgList .rg:nth-child(2) .x'); await page.waitForTimeout(200);
  const afterDel = await page.evaluate(() => ({ cards: document.querySelectorAll('#rgList .rg').length, regions: state.regions.length, count: $('rgCount').textContent, ids: [...document.querySelectorAll('#rgList .rg')].map(d => +d.dataset.rid), rids: state.regions.map(r => r.id) }));
  pass('A3', cards.length === 3 && cards.every(c => c.img) && afterClick.sel === afterClick.first && +afterClick.cardSel === afterClick.first && afterDel.cards === 2 && afterDel.regions === 2 && afterDel.count === '2' && JSON.stringify(afterDel.ids) === JSON.stringify(afterDel.rids),
    { cards: cards.length, allThumbs: cards.every(c => c.img), clickSwitch: afterClick, afterDelete: afterDel, thumbDataLen: thumbBefore });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300); // 復原刪除，留 3 張給 A4

  // ---------- A4：圖集縮放／平移／Home；縮放下拖曳與拉角 ----------
  await page.uncheck('#atlasSnap');
  const ab = await page.locator('#atlasView').boundingBox();
  const fit0 = await page.evaluate(() => ({ scale: AV.scale, fit: AZ.fit }));
  await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
  const wheelScale = await page.evaluate(() => AV.scale);
  await page.evaluate(() => selectRegion(state.regions[0].id));
  const pc = await page.evaluate(() => { atlasHome(); const p = placementOf(selected().id); const s = a2s(p.x + p.w / 2, p.y + p.h / 2); return s; });
  await page.evaluate(({ x, y }) => atlasZoomTo(4, x, y), pc); await page.waitForTimeout(100);
  const z4 = await page.evaluate(() => ({ scale: AV.scale, label: $('atlasZoomV').textContent }));
  await page.screenshot({ path: path.join(shots, 'A4_zoom400.png') });
  // Shift＋拖曳平移
  const cBefore = await page.evaluate(() => ({ ox: AV.ox, oy: AV.oy }));
  await page.keyboard.down('Shift'); await page.mouse.move(ab.x + 100, ab.y + 100); await page.mouse.down(); await page.mouse.move(ab.x + 160, ab.y + 140, { steps: 5 }); await page.mouse.up(); await page.keyboard.up('Shift'); await page.waitForTimeout(80);
  const cAfter = await page.evaluate(() => ({ ox: AV.ox, oy: AV.oy, scale: AV.scale }));
  const panOk = Math.abs((cAfter.ox - cBefore.ox) - 60) <= 1 && Math.abs((cAfter.oy - cBefore.oy) - 40) <= 1 && Math.abs(cAfter.scale - 4) < 1e-6;
  // 縮放下拖曳搬移：螢幕 +40,+20 → 圖集 +10,+5
  const pl0 = await page.evaluate(() => { const p = placementOf(selected().id); return { x: p.x, y: p.y, w: p.w, h: p.h }; });
  const grab = await H.A(page, { x: pl0.x + pl0.w / 2, y: pl0.y + pl0.h / 2 });
  await page.mouse.move(grab.x, grab.y); await page.mouse.down(); await page.mouse.move(grab.x + 40, grab.y + 20, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(80);
  const pl1 = await page.evaluate(() => { const p = placementOf(selected().id); return { x: p.x, y: p.y, w: p.w, h: p.h }; });
  // 縮放下拉 NW 角（鎖比例）：螢幕 +40 → 寬 -10
  await page.evaluate(p => { AZ.cx = p.x + 40; AZ.cy = p.y + 40; renderAtlas(); }, pl1); // 把左上角移進畫面（仍是 400%）
  const nw = await H.A(page, { x: pl1.x, y: pl1.y });
  await page.mouse.move(nw.x, nw.y); await page.mouse.down(); await page.mouse.move(nw.x + 40, nw.y + 40, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(100);
  const pl2 = await page.evaluate(() => { const p = placementOf(selected().id); return { x: p.x, y: p.y, w: p.w, h: p.h }; });
  await page.waitForFunction(() => { const r = selected(); const rt = RT.get(r.id); return !rt.busy && rt.resultCanvas && rt.resultCanvas.width === Math.round(placementOf(r.id).w); }, null, { timeout: 15000 });
  await page.keyboard.press('Home'); await page.waitForTimeout(80);
  const home = await page.evaluate(() => ({ scale: AV.scale, fit: AZ.fit, z: AZ.z }));
  const moveOk = Math.abs(pl1.x - pl0.x - 10) <= 1 && Math.abs(pl1.y - pl0.y - 5) <= 1;
  const resizeOk = Math.abs(pl2.w - (pl1.w - 10)) <= 1 && Math.abs((pl2.x + pl2.w) - (pl1.x + pl1.w)) <= 1;
  pass('A4', wheelScale > fit0.scale * 1.5 && Math.abs(z4.scale - 4) < 1e-6 && z4.label === '400%' && panOk && moveOk && resizeOk && Math.abs(home.scale - home.fit) < 1e-9,
    { fit: +fit0.scale.toFixed(3), afterWheel: +wheelScale.toFixed(3), zoom400: z4, pan: { before: cBefore, after: cAfter }, move: [pl0, pl1], resize: [pl1, pl2], home });
  await page.screenshot({ path: path.join(shots, 'A4_home.png') });
  log('M1 console errors:', errors.length ? errors : 'none', '| warnings:', warns.length ? warns : 'none');
  R.M1_console = { ok: errors.length === 0, errors, warns };
  await page.context().close();
}

async function M2(browser) {
  log('\n===== M2 =====');
  const { page, errors, warns } = await newPage(browser);
  await page.goto(fileUrl(target)); await page.waitForTimeout(300); await page.evaluate(() => closeOnboarding()); await page.evaluate(PAGE_HELPERS);
  await page.evaluate(() => loadSample('gameboy')); await page.waitForFunction(() => state.sources.length === 1);
  for (const p of await page.evaluate(() => SAMPLES.gameboy.screen)) { const s = await H.S(page, p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(60); }
  await H.idle(page);
  await page.check('#seamOn'); await page.waitForTimeout(100); await H.idle(page);
  // 接縫帶（中央十字 ±16px）的高頻能量
  await page.evaluate(() => { window.__seamHF = c => { const d = __px(c), W = c.width, Hh = c.height, cx = W >> 1, cy = Hh >> 1; let e = 0, n = 0;
    for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) { if (Math.abs(x - cx) > 16 && Math.abs(y - cy) > 16) continue; const i = (y * W + x) * 4; const l = k => d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
      const lap = 4 * l(i) - l(i - 4) - l(i + 4) - l(i - W * 4) - l(i + W * 4); e += lap * lap; n++; } return Math.sqrt(e / n); }; });
  const st0 = await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; return { method: r.seamless.method, hash: __hash(c), hf: +__seamHF(c).toFixed(2), visible: getComputedStyle($('p_detail').closest('.field')).display !== 'none' && getComputedStyle($('p_lcon').closest('.field')).display !== 'none' }; });
  await page.screenshot({ path: path.join(shots, 'B1_seam_before.png') });
  const setSlider = (id, v) => page.evaluate(([id, v]) => { const el = $(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  // 細節回復 80
  await setSlider('p_detail', 80); await page.waitForTimeout(100); await H.idle(page);
  const st1 = await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; return { detail: r.seamless.detail, label: $('v_detail').textContent, hash: __hash(c), hf: +__seamHF(c).toFixed(2) }; });
  await page.screenshot({ path: path.join(shots, 'B1_detail80.png') });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100); await H.idle(page);
  const st2 = await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; return { detail: r.seamless.detail, slider: $('p_detail').value, hash: __hash(c) }; });
  // 對比（局部）60
  await setSlider('p_lcon', 60); await page.waitForTimeout(100); await H.idle(page);
  const st3 = await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; const d = __px(c); let s = 0, s2 = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; } return { lcon: r.seamless.lcon, hash: __hash(c), std: +Math.sqrt(s2 / n - (s / n) ** 2).toFixed(2) }; });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100); await H.idle(page);
  const st4 = await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; const d = __px(c); let s = 0, s2 = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; } return { lcon: r.seamless.lcon, slider: $('p_lcon').value, hash: __hash(c), std: +Math.sqrt(s2 / n - (s / n) ** 2).toFixed(2) }; });
  pass('B1', st0.visible && st0.method !== 'none' && st1.hash !== st0.hash && st1.hf > st0.hf && st1.label === '80' && st2.detail === 0 && st2.slider === '0' && st2.hash === st0.hash && st3.hash !== st0.hash && st3.std > st4.std && st4.lcon === 0 && st4.slider === '0' && st4.hash === st0.hash,
    { method: st0.method, seamBandHF: { before: st0.hf, detail80: st1.hf }, undoDetail: st2, lumStd: { lcon60: st3.std, afterUndo: st4.std }, undoLcon: { lcon: st4.lcon, slider: st4.slider, sameAsBefore: st4.hash === st0.hash } });

  // ---------- 像素風：nearest 不糊、匯出對齊 ----------
  await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 96; c.height = 64; const x = c.getContext('2d'); const pal = ['#e43b44', '#3e8948', '#124e89', '#feae34'];
    for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) { x.fillStyle = pal[(i * 3 + j * 5 + ((i * j) % 3)) % 4]; x.fillRect(i * 8, j * 8, 8, 8); }
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); addSourceFile(new File([blob], 'pixel_art.png', { type: 'image/png' })); });
  await page.waitForFunction(() => state.sources.length === 2);
  const px = await page.evaluate(async () => { const mk = pixel => { const r = addRegion(true); r.mode = 'rect'; r.pts = [{ x: 0, y: 0 }, { x: 96, y: 64 }]; r.outW = 192; r.outH = 128; r.autoSize = false; r.pixel = pixel; r.seamless.method = 'none'; onRegionGeomChanged(r.id); return r.id; };
    const a = mk(true); const b = mk(false);
    await new Promise(res => { const t = setInterval(() => { if ([a, b].every(id => isSettled(id) && RT.get(id).resultCanvas && placementOf(id))) { clearInterval(t); res(); } }, 50); });
    const src = __px(sourceStore.get(state.sources[1].id).canvas), SW = 96; const palette = new Set(); for (let i = 0; i < src.length; i += 4) palette.add(src[i] + ',' + src[i + 1] + ',' + src[i + 2]);
    const check = (d, W, Hh) => { let mism = 0, off = 0; const cols = new Set(); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; cols.add(k); if (!palette.has(k)) off++; const si = ((y >> 1) * SW + (x >> 1)) * 4; if (d[i] !== src[si] || d[i + 1] !== src[si + 1] || d[i + 2] !== src[si + 2]) mism++; } return { colors: cols.size, offPalette: off, mismatchVsExact2x: mism }; };
    const ra = check(__px(RT.get(a).resultCanvas), 192, 128), rb = check(__px(RT.get(b).resultCanvas), 192, 128);
    const p = placementOf(a); const atlas = renderAtlasFull('albedo'); const k = document.createElement('canvas'); k.width = 192; k.height = 128; k.getContext('2d').drawImage(atlas, p.x, p.y, 192, 128, 0, 0, 192, 128); const rAtlas = check(__px(k), 192, 128);
    return { palette: palette.size, pixelOn: ra, pixelOff: rb, atlasExportPixelOn: rAtlas, place: [p.x, p.y, p.w, p.h] }; });
  pass('B2_pixel', px.pixelOn.offPalette === 0 && px.pixelOn.mismatchVsExact2x === 0 && px.atlasExportPixelOn.offPalette === 0 && px.atlasExportPixelOn.mismatchVsExact2x === 0 && px.pixelOff.offPalette > 0, px);
  log('M2 console errors:', errors.length ? errors : 'none', '| warnings:', warns.length ? warns : 'none');
  R.M2_console = { ok: errors.length === 0, errors, warns };
  await page.context().close();
}

async function M3(browser) {
  log('\n===== M3 =====');
  const allErr = [], allWarn = [];
  // ---------- C1：首次開啟導覽、略過、不再顯示、頂欄「教學」重開 ----------
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  const watch = pg => { pg.on('console', m => { if (m.type() === 'error') allErr.push(m.text()); else if (m.type() === 'warning') allWarn.push(m.text()); }); pg.on('pageerror', e => allErr.push('[pageerror] ' + e.message)); return pg; };
  const tourState = pg => pg.evaluate(() => ({ shown: $('ov_onb').classList.contains('show'), idx: $('tourIdx').textContent, title: $('tourTitle').textContent, ls: localStorage.getItem('ptr.tour') }));
  let pg = watch(await ctx.newPage()); await pg.goto(fileUrl(target)); await pg.waitForTimeout(400);
  const first = await tourState(pg); await pg.screenshot({ path: path.join(shots, 'C1_tour_step1.png') });
  await pg.click('#tourSkip'); await pg.waitForTimeout(100); const afterSkip = await tourState(pg);
  const pg2 = watch(await ctx.newPage()); await pg2.goto(fileUrl(target)); await pg2.waitForTimeout(400); const newTabAfterSkip = await tourState(pg2); // 略過＝這次不看，下次開還會出現
  await pg2.click('#tourNever'); await pg2.waitForTimeout(100); const afterNever = await tourState(pg2);
  const pg3 = watch(await ctx.newPage()); await pg3.goto(fileUrl(target)); await pg3.waitForTimeout(400); const newTabAfterNever = await tourState(pg3);
  await pg3.click('#btnTour'); await pg3.waitForTimeout(200); const reopened = await tourState(pg3);
  await pg3.click('#tourNext'); await pg3.waitForTimeout(100); const step2 = await tourState(pg3);
  pass('C1', first.shown && first.idx === '1' && !afterSkip.shown && afterSkip.ls === null && newTabAfterSkip.shown && !afterNever.shown && afterNever.ls === 'never' && !newTabAfterNever.shown && reopened.shown && reopened.idx === '1' && step2.idx === '2',
    { first, afterSkip, newTabAfterSkip: newTabAfterSkip.shown, afterNever, newTabAfterNever: newTabAfterNever.shown, reopenedByHeaderBtn: reopened, next: step2.idx });
  await ctx.close();

  // ---------- C2：載入範例（空狀態按鈕）＋導覽第 2 步自動預放四角並拓出 ----------
  const c2 = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  pg = watch(await c2.newPage()); await pg.goto(fileUrl(target)); await pg.waitForTimeout(300);
  await pg.click('#tourNext'); // → 第 2 步
  await pg.waitForFunction(() => { const r = state.regions.find(r => r.name === '範例_GameBoy螢幕'); return r && isComplete(r) && isSettled(r.id) && RT.get(r.id).resultCanvas && placementOf(r.id); }, null, { timeout: 20000 });
  await pg.waitForTimeout(300);
  const demo = await pg.evaluate(() => { const r = state.regions.find(r => r.name === '範例_GameBoy螢幕'); const p = placementOf(r.id); return { source: state.sources.map(s => s.name), tourIdx: $('tourIdx').textContent, pts: r.pts, expected: SAMPLES.gameboy.screen, out: [r.outW, r.outH], atlas: [p.x, p.y, p.w, p.h], gallery: document.querySelectorAll('#rgList .rg img').length }; });
  await pg.screenshot({ path: path.join(shots, 'C2_tour_step2_demo.png') });
  await pg.click('#tourNext'); await pg.waitForTimeout(150); await pg.screenshot({ path: path.join(shots, 'C2_tour_step3.png') });
  await pg.click('#tourNext'); await pg.waitForTimeout(150); await pg.screenshot({ path: path.join(shots, 'C2_tour_step4.png') });
  await pg.click('#tourNext'); await pg.waitForTimeout(100); const done = await tourState(pg);
  // QA FAIL-2 回歸：自動點角途中按略過再點畫布 / 狂按下一步 → 任何框都不超過 4 點
  const race = [];
  for (const mode of ['skipThenClick', 'nextNextSkip', 'clickDuringDemo']) { const rc = await browser.newContext({ viewport: { width: 1600, height: 960 } }); const pr = watch(await rc.newPage()); await pr.goto(fileUrl(target)); await pr.waitForTimeout(300);
    await pr.click('#tourNext'); await pr.waitForTimeout(mode === 'nextNextSkip' ? 300 : 450);
    const sp = await pr.evaluate(() => { const q = imgToScreen({ x: 820, y: 1050 }); const r = stage.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; });
    if (mode === 'skipThenClick') { await pr.click('#tourSkip'); await pr.mouse.click(sp.x, sp.y); }
    else if (mode === 'nextNextSkip') { await pr.click('#tourNext'); await pr.click('#tourSkip'); }
    else { await pr.mouse.click(sp.x, sp.y); }
    await pr.waitForTimeout(2000);
    race.push({ mode, regions: await pr.evaluate(() => state.regions.map(r => ({ name: r.name, n: r.pts.length, complete: isComplete(r) }))) }); await rc.close(); }
  pass('C2_race', race.every(x => x.regions.every(r => r.n <= 4)) && race[1].regions.some(r => r.name === '範例_GameBoy螢幕' && r.complete) && race[2].regions.some(r => r.name === '範例_GameBoy螢幕' && r.complete && r.n === 4), race);
  // 空狀態「載入範例」
  const pgE = watch(await c2.newPage()); await pgE.goto(fileUrl(target)); await pgE.waitForTimeout(300);
  const empty = await pgE.evaluate(() => ({ tour: $('ov_onb').classList.contains('show'), hintVisible: getComputedStyle($('dropHint')).display !== 'none', text: $('dropHint').innerText.replace(/\s+/g, ' ') }));
  await pgE.screenshot({ path: path.join(shots, 'C2_empty_state.png') });
  await pgE.click('#btnSampleEmpty'); await pgE.waitForTimeout(300);
  const loaded = await pgE.evaluate(() => ({ sources: state.sources.map(s => `${s.name} ${s.w}x${s.h}`), hintVisible: getComputedStyle($('dropHint')).display !== 'none' }));
  pass('C2', demo.source[0] === '範例_GameBoy.jpg' && demo.tourIdx === '2' && JSON.stringify(demo.pts) === JSON.stringify(demo.expected) && demo.gallery >= 1 && done.ls === 'done' && !done.shown
    && !empty.tour && empty.hintVisible && /Ctrl\+V/.test(empty.text) && /載入範例/.test(empty.text) && loaded.sources.length === 1 && !loaded.hintVisible,
    { demo: { source: demo.source, out: demo.out, atlas: demo.atlas, ptsMatch: JSON.stringify(demo.pts) === JSON.stringify(demo.expected) }, finish: done, emptyState: empty.text, afterEmptyBtn: loaded });
  await c2.close();

  // ---------- C3：教學面板六分頁、字數、手機寬 ----------
  const c3 = await browser.newContext({ viewport: { width: 1600, height: 960 } });
  pg = watch(await c3.newPage()); await pg.goto(fileUrl(target)); await pg.waitForTimeout(300); await pg.evaluate(() => closeOnboarding());
  await pg.keyboard.press('?'); await pg.waitForTimeout(150);
  const tabs = await pg.evaluate(() => [...document.querySelectorAll('.tut-tabs button')].map(b => b.textContent));
  const panes = [];
  for (const tt of ['quick', 'modes', 'uv', 'engine', 'terms', 'keys']) { await pg.evaluate(t => setTut(t), tt); await pg.waitForTimeout(60);
    panes.push(await pg.evaluate(t => { const p = document.querySelector(`.tut-pane[data-tt="${t}"]`); return { tt: t, rows: p.querySelectorAll('li').length, chars: p.innerText.replace(/\s+/g, '').length, visible: getComputedStyle(p).display !== 'none' }; }, tt)); }
  await pg.evaluate(() => setTut('quick')); await pg.screenshot({ path: path.join(shots, 'C3_tutorial_desktop.png') });
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(200); const mobile = [];
  for (const tt of ['quick', 'modes', 'uv', 'engine', 'terms', 'keys']) { await pg.evaluate(t => setTut(t), tt); await pg.waitForTimeout(80);
    mobile.push(await pg.evaluate(t => { const m = document.querySelector('#ov_help .modal'), r = m.getBoundingClientRect(), p = document.querySelector(`.tut-pane[data-tt="${t}"]`);
      const over = [...p.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1); }).length;
      return { tt: t, inViewport: r.left >= 0 && r.right <= innerWidth, modalNoHScroll: m.scrollWidth <= m.clientWidth + 1, childrenOverflow: over }; }, tt));
    if (tt === 'modes' || tt === 'keys') await pg.screenshot({ path: path.join(shots, `C3_tutorial_mobile_${tt}.png`) }); }
  const c3ok = tabs.length === 6 && panes.every(p => p.rows >= 1 && p.rows <= 8 && p.chars <= 520 && p.visible) && mobile.every(m => m.inViewport && m.modalNoHScroll && m.childrenOverflow === 0);
  pass('C3', c3ok, { tabs, panes, mobile });
  await c3.close();

  // ---------- C4／C5：文件 ----------
  const md = fs.existsSync(path.join(ROOT, 'docs', '教學.md')) ? fs.readFileSync(path.join(ROOT, 'docs', '教學.md'), 'utf8') : '';
  const imgs = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => decodeURI(m[1]));
  const imgsExist = imgs.filter(f => fs.existsSync(path.join(ROOT, 'docs', f)));
  const steps = (md.match(/^#{2,3} /gm) || []).length;
  pass('C4', imgs.length >= 6 && imgsExist.length === imgs.length && steps >= 5, { images: imgs.length, existing: imgsExist.length, headings: steps });
  const skill = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8'), hand = fs.readFileSync(fs.existsSync(path.join(ROOT, 'HANDOFF.md')) ? path.join(ROOT, 'HANDOFF.md') : path.join(ROOT, 'docs', 'HANDOFF.md'), 'utf8') /* 公開 repo 放在 docs/ */, readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const sec = (t, n) => { const m = t.split(/^## /m).find(x => x.startsWith(n + '.')); return m || ''; };
  const c5 = { skillVersion: /v2\.3/.test(skill.split('\n').slice(0, 12).join('\n')), skillFeat: /彎邊/.test(skill) && /ZIP/.test(skill), skillKeys: /Home/.test(skill) && /Alt＋點邊/.test(skill), skillLog: /v2\.3（2026-10-07）/.test(skill),
    handoff5: /v2\.3/.test(sec(hand, '5')), handoff6: /v2\.3|彎邊/.test(sec(hand, '6')), readmeTut: /^## .*教學/m.test(readme) };
  pass('C5', Object.values(c5).every(Boolean), c5);
  log('M3 console errors:', allErr.length ? allErr : 'none', '| warnings:', allWarn.length ? allWarn : 'none');
  R.M3_console = { ok: allErr.length === 0, errors: allErr, warns: allWarn };
}

(async () => {
  const browser = await chromium.launch(LAUNCH);
  try {
    if (!ONLY || ONLY === 'm1') await M1(browser);
    if ((!ONLY || ONLY === 'm2') && typeof M2 === 'function') await M2(browser);
    if ((!ONLY || ONLY === 'm3') && typeof M3 === 'function') await M3(browser);
  } finally { await browser.close(); }
  const fails = Object.entries(R).filter(([, v]) => !v.ok).map(([k]) => k);
  fs.writeFileSync(path.join(shots, 'result.json'), JSON.stringify(R, null, 2));
  log('\nSUMMARY:', Object.entries(R).map(([k, v]) => `${k}:${v.ok ? 'PASS' : 'FAIL'}`).join('  '));
  log('CONSOLE ISSUES:', Object.values(R).some(v => v.errors && v.errors.length) ? 'see above' : 'none');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
