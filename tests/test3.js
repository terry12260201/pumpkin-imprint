// 多點／矩形／橢圓 拓印 ＋ 圖集材質組匯出
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const target = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
const shots = path.resolve(__dirname, '..', 'shots3'); fs.mkdirSync(shots, { recursive: true });
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 960 }, acceptDownloads: true }); const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); }); page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  await page.goto('file:///' + target.replace(/\\/g, '/')); await page.waitForTimeout(300); await page.evaluate(() => closeOnboarding());
  await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 1400; c.height = 1000; const x = c.getContext('2d'); x.fillStyle = '#3b3b8f'; x.fillRect(0, 0, 1400, 1000);
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 4000; i++) { x.fillStyle = `hsl(${rnd() * 360},50%,${40 + rnd() * 40}%)`; x.fillRect(rnd() * 1400, rnd() * 1000, 6 + rnd() * 30, 6 + rnd() * 30); }
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); addSourceFile(new File([blob], 'scene.png', { type: 'image/png' })); });
  await page.waitForFunction(() => state.sources.length === 1); await page.waitForTimeout(150);
  const S = async p => page.evaluate(p => { const q = imgToScreen(p); const r = stage.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; }, p);
  const done = () => page.waitForFunction(() => { const r = selected(); const rt = r && RT.get(r.id); return rt && rt.resultCanvas && !rt.busy && placementOf(r.id); }, null, { timeout: 15000 });
  const alphaAt = (fx, fy) => page.evaluate(([fx, fy]) => { const c = RT.get(selected().id).resultCanvas; return c.getContext('2d').getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data[3]; }, [fx, fy]);
  // 1. 多點：P 鍵 → 5 點 → Enter
  await page.keyboard.press('p'); await page.waitForTimeout(100);
  for (const p of [{ x: 200, y: 200 }, { x: 600, y: 150 }, { x: 700, y: 500 }, { x: 450, y: 650 }, { x: 150, y: 480 }]) { const s = await S(p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(40); }
  log('poly before enter:', JSON.stringify(await page.evaluate(() => ({ mode: selected().mode, n: selected().pts.length, closed: selected().closed, complete: isComplete(selected()) }))));
  await page.keyboard.press('Enter'); await done();
  log('poly:', JSON.stringify(await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; return { out: [r.outW, r.outH], res: [c.width, c.height] }; })), 'alpha center/corner:', await alphaAt(0.5, 0.5), await alphaAt(0.02, 0.02));
  // Alt 插入點、Alt 刪除點
  const mid = await S({ x: 400, y: 175 }); await page.keyboard.down('Alt'); await page.mouse.click(mid.x, mid.y); await page.keyboard.up('Alt'); await page.waitForTimeout(100);
  log('after alt-insert pts:', await page.evaluate(() => selected().pts.length));
  // 2. 矩形：M 鍵 → 拖框
  await page.keyboard.press('n'); await page.keyboard.press('m'); await page.waitForTimeout(80);
  let a = await S({ x: 800, y: 100 }), b = await S({ x: 1300, y: 400 }); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up(); await done();
  log('rect:', JSON.stringify(await page.evaluate(() => { const r = selected(); const c = RT.get(r.id).resultCanvas; return { mode: r.mode, out: [r.outW, r.outH], res: [c.width, c.height] }; })), 'alpha corner:', await alphaAt(0.01, 0.01));
  // 3. 橢圓：O 鍵 → 拖框
  await page.keyboard.press('n'); await page.keyboard.press('o'); await page.waitForTimeout(80);
  a = await S({ x: 800, y: 550 }); b = await S({ x: 1250, y: 900 }); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up(); await done();
  log('ellipse:', JSON.stringify(await page.evaluate(() => ({ mode: selected().mode, out: [selected().outW, selected().outH] }))), 'alpha center/corner:', await alphaAt(0.5, 0.5), await alphaAt(0.02, 0.02));
  // 4. 四點仍可用
  await page.keyboard.press('n'); await page.keyboard.press('q'); for (const p of [{ x: 100, y: 750 }, { x: 500, y: 760 }, { x: 480, y: 950 }, { x: 120, y: 940 }]) { const s = await S(p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(40); } await done();
  await page.waitForFunction(() => state.atlas.placements.length === 4, null, { timeout: 10000 });
  await page.screenshot({ path: path.join(shots, '01_shapes.png') });
  const url = await page.evaluate(() => renderAtlasFull('albedo').toDataURL()); fs.writeFileSync(path.join(shots, '01_atlas_albedo.png'), Buffer.from(url.split(',')[1], 'base64'));
  // 5. 圖集材質組匯出
  const dls = []; page.on('download', d => dls.push(d.suggestedFilename()));
  await page.click('#tabs button[data-tab="export"]'); await page.selectOption('#engine', 'unity'); await page.evaluate(() => exportAtlasSet());
  await page.waitForFunction(() => state.atlas.placements.every(p => RT.get(p.regionId).pbr), null, { timeout: 30000 }); await page.waitForTimeout(2500);
  log('downloads:', JSON.stringify(dls));
  const nurl = await page.evaluate(() => renderAtlasFull('normal').toDataURL()); fs.writeFileSync(path.join(shots, '02_atlas_normal.png'), Buffer.from(nurl.split(',')[1], 'base64'));
  // 6. 標題
  log('title:', await page.title(), '| onboarding h2:', await page.evaluate(() => document.querySelector('#ov_onb h2').textContent));
  log('CONSOLE ISSUES:', errors.length ? errors : 'none'); await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
