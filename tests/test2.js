const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const target = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
const shots = path.resolve(__dirname, '..', 'shots2'); fs.mkdirSync(shots, { recursive: true });
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 960 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); }); page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  await page.goto('file:///' + target.replace(/\\/g, '/')); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, '00_onboarding.png') }); await page.evaluate(() => closeOnboarding());
  await page.screenshot({ path: path.join(shots, '01_empty.png') });
  // photo: a "device with screen" scene: tilted screen with a pixel-art-like content
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const x = c.getContext('2d');
    x.fillStyle = '#4b3fd8'; x.fillRect(0, 0, 1600, 1000);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // screen content drawn then perspective-skewed via transform
    const sc = document.createElement('canvas'); sc.width = 640; sc.height = 480; const sx = sc.getContext('2d');
    sx.fillStyle = '#9ad98a'; sx.fillRect(0, 0, 640, 480); for (let i = 0; i < 300; i++) { sx.fillStyle = `hsl(${rnd() * 360},60%,${40 + rnd() * 30}%)`; sx.fillRect(Math.floor(rnd() * 40) * 16, Math.floor(rnd() * 30) * 16, 16, 16); }
    sx.fillStyle = '#222'; sx.font = 'bold 60px sans-serif'; sx.fillText('GAME SCREEN', 80, 260);
    x.save(); x.setTransform(1, 0.25, -0.35, 1, 600, 150); x.drawImage(sc, 0, 0, 800, 520); x.restore();
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); addSourceFile(new File([blob], 'device.png', { type: 'image/png' }));
  });
  await page.waitForFunction(() => state.sources.length === 1); await page.waitForTimeout(150);
  // corners of the skewed screen in image space: transform (x,y)->(x - 0.35y + 600, 0.25x + y + 150) for sc 800x520
  const T = (u, v) => ({ x: u - 0.35 * v + 600, y: 0.25 * u + v + 150 });
  const pts = [T(0, 0), T(800, 0), T(800, 520), T(0, 520)];
  for (const p of pts) { const s = await page.evaluate(p => { const q = imgToScreen(p); const r = stage.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; }, p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(60); }
  await page.waitForFunction(() => { const r = selected(); const rt = r && RT.get(r.id); return rt && rt.resultCanvas && placementOf(r.id); }, null, { timeout: 15000 });
  const t1 = await page.evaluate(() => { const r = selected(); const p = placementOf(r.id); return { name: r.name, out: [r.outW, r.outH], auto: r.autoSize, method: r.seamless.method, delight: r.delight.enabled, place: [p.x, p.y, p.w, p.h], step: document.querySelector('.step.active').dataset.step, dockCollapsed: $('dock').classList.contains('collapsed') }; });
  log('rip:', JSON.stringify(t1));
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(shots, '02_ripped.png') });
  // dump rip result
  const url = await page.evaluate(() => RT.get(selected().id).resultCanvas.toDataURL()); fs.writeFileSync(path.join(shots, '02_rip_result.png'), Buffer.from(url.split(',')[1], 'base64'));
  // atlas drag move
  const P0 = await page.evaluate(() => { const p = placementOf(selected().id); const s = a2s(p.x + p.w / 2, p.y + p.h / 2); const r = atlasView.getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top }; });
  await page.mouse.move(P0.x, P0.y); await page.mouse.down(); await page.mouse.move(P0.x + 120, P0.y + 90, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(100);
  log('after move:', JSON.stringify(await page.evaluate(() => { const p = placementOf(selected().id); return [p.x, p.y, p.w, p.h, p.manual]; })));
  // atlas resize via SE handle (aspect locked)
  const H = await page.evaluate(() => { const p = placementOf(selected().id); const s = a2s(p.x + p.w, p.y + p.h); const r = atlasView.getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top }; });
  await page.mouse.move(H.x, H.y); await page.mouse.down(); await page.mouse.move(H.x - 80, H.y - 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(150);
  await page.waitForFunction(() => { const r = selected(); const rt = RT.get(r.id); return !rt.busy && rt.resultCanvas && rt.resultCanvas.width === Math.round(placementOf(r.id).w); }, null, { timeout: 15000 });
  log('after resize:', JSON.stringify(await page.evaluate(() => { const r = selected(); const p = placementOf(r.id); return { place: [p.x, p.y, p.w, p.h], out: [r.outW, r.outH], res: [RT.get(r.id).resultCanvas.width, RT.get(r.id).resultCanvas.height] }; })));
  // rotate
  await page.keyboard.press('r'); await page.waitForTimeout(200);
  log('after rotate:', JSON.stringify(await page.evaluate(() => { const r = selected(); const p = placementOf(r.id); return { rot: r.rot, place: [p.w, p.h] }; })));
  // second rip: another quad on the blue body → auto placed
  await page.evaluate(() => addRegion(true));
  for (const p of [{ x: 100, y: 600 }, { x: 500, y: 620 }, { x: 480, y: 900 }, { x: 120, y: 880 }]) { const s = await page.evaluate(p => { const q = imgToScreen(p); const r = stage.getBoundingClientRect(); return { x: q.x + r.left, y: q.y + r.top }; }, p); await page.mouse.click(s.x, s.y); await page.waitForTimeout(50); }
  await page.waitForFunction(() => state.atlas.placements.length === 2 && state.regions.every(r => { const rt = RT.get(r.id); return rt && rt.resultCanvas && !rt.busy; }), null, { timeout: 15000 });
  log('two pieces:', JSON.stringify(await page.evaluate(() => state.atlas.placements.map(p => [p.x, p.y, p.w, p.h, p.overlap]))));
  await page.screenshot({ path: path.join(shots, '03_two_pieces.png') });
  // enable seamless on piece 2 → dock expands, method restored
  await page.check('#seamOn'); await page.waitForTimeout(600);
  await page.waitForFunction(() => { const r = selected(); const rt = RT.get(r.id); return !rt.busy && rt.score != null; }, null, { timeout: 15000 });
  log('seam on:', JSON.stringify(await page.evaluate(() => ({ method: selected().seamless.method, dock: !$('dock').classList.contains('collapsed'), score: RT.get(selected().id).score }))));
  await page.screenshot({ path: path.join(shots, '04_seam_on.png') });
  await page.uncheck('#seamOn'); await page.waitForTimeout(300); log('seam off:', await page.evaluate(() => selected().seamless.method));
  // undo chain
  const n0 = await page.evaluate(() => state.regions.length); await page.keyboard.press('Delete'); await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  log('undo delete regions:', n0, '->', await page.evaluate(() => state.regions.length), 'placements', await page.evaluate(() => state.atlas.placements.length));
  // export atlas + project roundtrip
  const dls = []; page.on('download', d => dls.push(d.suggestedFilename()));
  await page.evaluate(() => exportAtlas()); await page.waitForTimeout(800);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => saveProject())]); const json = fs.readFileSync(await dl.path(), 'utf8');
  await page.evaluate(async j => { window.confirm = () => true; await loadProject(JSON.parse(j)); }, json);
  await page.waitForFunction(() => state.regions.length === 2 && state.regions.every(r => { const rt = RT.get(r.id); return rt && rt.resultCanvas; }), null, { timeout: 20000 });
  log('downloads:', JSON.stringify(dls), 'after load placements:', await page.evaluate(() => state.atlas.placements.length));
  // splitter drag
  const sp = await page.locator('#splitter').boundingBox(); await page.mouse.move(sp.x + 3, sp.y + 200); await page.mouse.down(); await page.mouse.move(sp.x + 150, sp.y + 200, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(200);
  await page.evaluate(() => toggleTheme()); await page.waitForTimeout(200); await page.screenshot({ path: path.join(shots, '05_night_split.png') }); await page.evaluate(() => toggleTheme());
  await page.keyboard.press('?'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(shots, '06_help.png') }); await page.keyboard.press('Escape');
  log('CONSOLE ISSUES:', errors.length ? errors : 'none'); await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
