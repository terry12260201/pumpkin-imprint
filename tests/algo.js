const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const target = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
const out = path.resolve(__dirname, '..', 'shots', 'algo'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///' + target.replace(/\\/g, '/')); await page.evaluate(() => closeOnboarding());
  await page.evaluate(async () => {
    // 自然感材質：噪聲石材 + 強烈方向光
    const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d');
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#8a8478'; x.fillRect(0, 0, 1200, 900);
    for (let i = 0; i < 9000; i++) { const s = 4 + rnd() * 30; x.fillStyle = `hsl(${30 + rnd() * 20},${10 + rnd() * 20}%,${35 + rnd() * 35}%)`; x.beginPath(); x.ellipse(rnd() * 1200, rnd() * 900, s, s * (0.5 + rnd()), rnd() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.3})`; x.fillRect(rnd() * 1200, rnd() * 900, 2, 2); }
    const lg = x.createLinearGradient(0, 0, 1200, 900); lg.addColorStop(0, 'rgba(255,250,230,0.45)'); lg.addColorStop(1, 'rgba(0,0,20,0.55)'); x.fillStyle = lg; x.fillRect(0, 0, 1200, 900);
    const blob = await new Promise(r => c.toBlob(r, 'image/png')); addSourceFile(new File([blob], 'stone.png', { type: 'image/png' }));
  });
  await page.waitForFunction(() => state.sources.length === 1); await page.waitForTimeout(150);
  await page.evaluate(() => { const r = addRegion(true); r.pts = [{ x: 100, y: 80 }, { x: 1100, y: 120 }, { x: 1150, y: 850 }, { x: 60, y: 800 }]; onRegionGeomChanged(r.id); });
  const wait = () => page.waitForFunction(() => { const r = selected(); const rt = RT.get(r.id); const key = JSON.stringify([rt.baseKey, r.delight, r.seamless]); return rt.procKey === key && !rt.busy && rt.resultCanvas; }, null, { timeout: 30000 });
  const dump = async (name) => { await wait(); const d = await page.evaluate(() => { const rt = RT.get(selected().id); const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const x = c.getContext('2d'); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) x.drawImage(rt.resultCanvas, i * 512, j * 512, 512, 512); return { url: c.toDataURL(), score: rt.score, ms: $('jobMeta').textContent }; }); fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(d.url.split(',')[1], 'base64')); console.log(name, d.score, d.ms); };
  const set = async (obj) => { await page.evaluate(o => { const r = selected(); deepMerge(r, o); scheduleRegion(r.id, 10); }, obj); await page.waitForTimeout(80); };
  await set({ seamless: { method: 'none' } }); await dump('0_none');
  await set({ seamless: { method: 'offsetLF' } }); await dump('1_offsetLF');
  await set({ seamless: { method: 'freq' } }); await dump('2_freq');
  await set({ seamless: { method: 'scatter' } }); await dump('3_scatter');
  await set({ seamless: { method: 'mirror' } }); await dump('4_mirror');
  await set({ seamless: { method: 'none' }, delight: { enabled: true, strength: 100, radius: 128 } }); await dump('5_delight_only');
  await set({ seamless: { method: 'scatter' }, delight: { enabled: true, strength: 100, radius: 128 } }); await dump('6_delight_scatter');
  await page.evaluate(() => runPBR(selected().id)); await page.waitForFunction(() => RT.get(selected().id).pbr, null, { timeout: 20000 });
  const maps = await page.evaluate(() => { const p = RT.get(selected().id).pbr; return { normal: p.normal.toDataURL(), ao: p.ao.toDataURL(), rough: p.rough.toDataURL() }; });
  for (const k in maps) fs.writeFileSync(path.join(out, '7_' + k + '.png'), Buffer.from(maps[k].split(',')[1], 'base64'));
  console.log('errors:', errors); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
