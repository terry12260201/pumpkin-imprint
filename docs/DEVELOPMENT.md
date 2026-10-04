
# 🎃 南瓜拓印 Pumpkin Imprint v2.2（舊名：紋理撕裂機，skill 資料夾名不變）

對標 Puck's Seamlessifier + Ripper。核心流程是**拓印優先**：貼上照片 → 點 4 個角 → 圖立刻拓成正面、自動放進左邊圖集 → 在圖集拖曳／拉角縮放／旋轉自己排 UV → 匯出圖集 PNG＋UV JSON。無縫化、去光影、PBR 都是**選配**，預設關。

- v2.2（2026-09-22）：改名「南瓜拓印」；拓印框新增**多點**（N 點多邊形，Enter 收合、Alt 插入／刪除點、外面透明）、**矩形**、**橢圓**拉框（含 alpha 遮罩、邊緣抗鋸齒）；圖集**整組材質匯出**（Albedo／Normal／Roughness／AO／Height 五張＋UV JSON，引擎命名）；alpha 通道全管線保留。
- v2.1（2026-09-22）：版面改為「圖集工作區（左）＋照片舞台（右）」、無縫改選配、新拓印框自動依像素密度定尺寸、圖集可拉角縮放（重拓成該解析度）、像素風取樣、外擴輸出。
- v2（2026-09-21）：多拓印框物件、Web Worker、復原／重做、平鋪預覽、四種無縫、De-Light、PBR、guillotine 圖集、專案存讀、墨金日／夜版。

## 🧠 大腦（資料／本體）位置

- **工具本體**：跟本 skill 同資料夾的 `index.html`（單檔、零相依、零 CDN、file:// 可開）。
  - 本機開發副本：`<開發機>\pumpkin-texture-ripper\index.html`（PC-02）；v1 備份 `index_v1_backup.html`
  - 測試腳本與截圖：`<開發機>\pumpkin-texture-ripper\_test_shots\`（`test2.js` 全流程、`algo.js` 無縫法輸出比較）
  - Tauri 完整版藍圖（未做）：`<開發機>\TextureForge_GOAL.md`
- **美術規範**：`pumpkin-ink-gold` skill（token 內嵌在 `<style>` 的 `--ig-*`，夜間為 `html[data-theme="night"]` 覆寫）。
- 純前端，不需 vault 資料庫。localStorage：`ptr.presets`（自訂預設）、`ptr.theme`、`ptr.onb`（上手提示看過）、`ptr.split`（左右分割寬度）。

## 🚀 使用方式（給團隊）

1. 雙擊 `index.html`。截圖後 `Ctrl+V`，或拖照片進右邊畫布（可多張，`Tab` 切換）。
2. 選拓印方式（左欄或按鍵）：**四點透視 Q**（點 4 角，歪的面校正成正面）、**多點 P**（沿邊逐點描，Enter 或點回起點收合，外面透明）、**矩形 M**／**橢圓 O**（按住拖框）、**曲線 C**（6 點展平圓柱）。圖立刻拓下來、出現在左邊圖集；尺寸依像素密度自動估算。
3. 想改：拖角點微調、拖中心方塊整體移動、`R` 旋轉、翻轉、改名、`N` 再拓一張、`Del` 刪除。
4. 圖集：拖曳搬移（貼齊格線）、拉四角縮放（鎖比例，`Alt` 自由比例，放開後以該尺寸重新拓印）、自動排／補排／移出、尺寸 256–4096。
5. 匯出：圖集工具列「匯出材質組」＝整張圖集的 Albedo／Normal／Roughness／AO／Height 五張＋UV JSON（引擎命名，如 Unity `atlas_BaseColor.png`）；「匯出圖集」只出顏色；右欄「輸出」可匯單張、單張 PBR。
6. 要平鋪材質才做：右欄「無縫」勾「啟用無縫化」→ 底欄平鋪預覽自動展開、即時打分；「補光」去光影；「材質」PBR。

## ✅ 功能對照（Puck's → 我們）

| Puck's | 我們 | 程式碼位置（搜註解標記） |
|---|---|---|
| 多邊形 Ripper、可多個、事後調整 | 四點透視、多點多邊形、矩形、橢圓、曲線展平；多個、可拖點／插入刪除點／整體移動／旋轉／翻轉／複製 | `/* ---------- stage` 與 `/* ---------- region 操作` |
| 每個 Ripper 即時輸出 | 撕完立即進圖集＋清單縮圖；Worker 重算 | `/* ---------- pipeline`、worker `extract` |
| Texture Atlas：自動放入、拖曳、縮放、顯示尺寸 | 圖集工作區：自動放第一個空位、拖曳貼齊、拉角縮放（重新拓印）、格線、重疊標紅、使用率 | `/* ---------- atlas：圖集工作區` |
| Enable → Smoothed Collage／Scattered Edges、Blend／Detail／Contrast／Lighting、Apply | 啟用無縫化 → offsetLF／freq／scatter／mirror；羽化／低頻半徑／貼片；亮度／對比／銳化；De-Light 另頁 | worker `seamOffsetLF / seamFreq / seamScatter / seamMirror / delight` |
| Tiling 預覽 | 底欄 1×1～4×4、接縫線、灰階、處理前、打光、分數 | `/* ---------- preview` |
| Export selected / all / atlas PNG | 同，另有單張 PBR 五張、**圖集整組 PBR 五張**、UV JSON、引擎命名 | `/* ---------- export` |
| Copy／Paste、Rotate、Undo／Redo | 同 | `/* ---------- io`、`/* ---------- history` |
| Pixel-art 模式 | 拓印框「像素風」＝最近鄰取樣、不平滑 | worker `sampleBilinear(...,nearest)`、`applyOrient` |
| — | 額外：PBR 材質組、材質預設組、專案 JSON、四步流程條、日／夜 | `/* ---------- pbr`、`BUILTIN_PRESETS`、`saveProject` |

## ⌨️ 快捷鍵

| 按鍵 | 功能 |
|---|---|
| 滾輪 / `+` `−` / `0` | 縮放 / 適合視窗 |
| Shift＋拖曳、空白鍵＋拖曳、中鍵 | 平移照片 |
| `Ctrl+F` | 全螢幕 |
| `Ctrl+V` | 貼上剪貼簿圖片 |
| `Tab` / `Shift+Tab` | 切換來源圖 |
| `N` / `Del` / `Ctrl+D` / `R` | 新拓印框 / 刪除 / 複製 / 旋轉 90° |
| `Q` `P` `M` `O` `C` | 模式：四點／多點／矩形／橢圓／曲線 |
| `Enter`、點回起點 / `Alt`＋點邊 / `Alt`＋點頂點 | 多點：收合 / 插入點 / 刪除點 |
| 圖集：拖曳 / 拉角 / `Alt`＋拉角 | 搬移 / 等比縮放 / 自由比例 |
| `S` | 重算目前拓印框（沿用 v1） |
| `1`–`5` | 無縫方法：不處理 / 位移低頻 / 頻率分離 / 散佈貼片 / 鏡像 |
| `L` / `G` / `B` | 接縫線 / 灰階 / 處理前 |
| `Ctrl+1`–`4` | 平鋪格數 |
| `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` | 復原 / 重做 |
| `Ctrl+S` / `Ctrl+O` | 存 / 開專案 JSON |
| `Ctrl+E` / `Ctrl+C` | 匯出目前貼圖 / 複製結果到剪貼簿 |
| `?` / `Esc` | 快捷鍵面板 / 關閉面板 |

## 🔧 維護指南

單一 `index.html` 五段，改完 file:// 重新整理即可：
1. `<style>`：`--ig-*` token、夜間覆寫、元件 class、`/* ===== 圖集工作區` 版面。
2. `<body>`：header（Logo＋流程條）、左欄（來源／拓印框清單／拓印框設定）、中央 `#work`（`#atlasPane` 圖集 ＋ `#splitter` ＋ `#stageWrap` 照片）、底欄 `#dock`（平鋪預覽，預設收合）、右欄 tabs（無縫／補光／材質／輸出）。
3. `<script type="text/worker" id="wk">`：純像素函式。**改演算法只改這裡**；`self.onmessage` 分 `base / proc / pbr`。
4. `<script>` 核心：state → history → worker client → pipeline → io → stage → region 操作。
5. `<script>` UI：preview → pbr 縮圖 → atlas → export → 專案 → 預設組 → ui 綁定 → shortcuts → init。

規則：
- 加參數：body 放 `<input data-p="群組.鍵" id="p_鍵">`＋`<span id="v_鍵">`，`DEFAULTS` 加預設值，綁定與復原自動生效；`class="seamOnly"` 只在啟用無縫時顯示。
- 模式定義在 `MODE_INFO`（label／最少點數／提示）；遮罩模式（poly／rect／ellipse）在 worker `extract` 以外框裁切＋2×2 超取樣 alpha；alpha 經 `alphaOf / merge(...,alpha)` 全管線保留，PBR 四張也帶 alpha。圖集整組輸出 `renderAtlasFull(kind)`，非 albedo 的底色見 `ATLAS_BG`（normal 平面藍、rough／height 中灰、AO 白）。
- 資料流：`extract(base) → delight → seamless → colorAdjust = result → rot/flip = resultCanvas → 自動進圖集 →（按需）PBR / score / 預覽`。`rt.baseKey / procKey / pbrKey` 是快取鍵。
- 圖集 `placements[]` 只存位置尺寸；拉角縮放放開時把 `outW/outH` 設成新尺寸重新拓印，不做二次縮放。
- 新快捷鍵要同步改 body 的快捷鍵面板與本檔。

## 🧪 驗收（2026-09-22，Playwright＋本機 Chrome，file://）

`test3.js`：多點 5 點＋Enter（中心 alpha 255／角落 0）→ Alt 插入點 → 矩形拖框 → 橢圓拖框（角落透明）→ 四點 → 圖集材質組匯出（Unity 命名 5 張＋JSON）。`test2.js`：貼圖 → 四點拓印（自動 824×548、未無縫、進圖集第一空位）→ 圖集拖曳、拉角縮放（重新拓印 608×404）、R 旋轉 → 第二張自動補位 → 勾啟用無縫（底欄展開、分數 100）→ 取消 → Del＋Ctrl+Z → 匯出圖集 PNG＋JSON → 專案存讀還原 → 分割拉桿 → 夜間 → 快捷鍵面板。Console 零錯誤。`algo.js`：五種無縫法與去光影輸出圖。

## 🗺️ 未做／下一版

- 多點多邊形目前是「外框裁切＋遮罩」，不做透視校正（透視數學只支援 4 點）；要校正請先用四點再疊多點。
- Blender／Unity 即時同步（純前端做不到，用 PNG＋UV JSON 交接）。
- 圖集內縮放／平移檢視（目前整張 fit）。
- 墨金磁吸點格 JS 未內嵌。

## 🔄 同步狀態

三處同步制：①本機 `~/.claude/skills/pumpkin-texture-ripper/` ②vault `_系統/skills/pumpkin-texture-ripper/` ③GitHub `pumpkin-skills`（由 Mac 統一 push，**push 前先問南瓜**）。去敏：工具內僅「創作者：南瓜」與公司 Logo。
