---
name: pumpkin-texture-ripper
description: >-
  南瓜拓印工具（Pumpkin Imprint，舊名紋理撕裂機）v2.3.2——3D／遊戲美術用的「照片秒拓成正面貼圖 → 排進圖集當 UV → 整組 PBR 匯出；選配無縫化／去光影」單檔工具的維護與使用指南。
  當使用者要求「開拓印／紋理工具／貼圖工具、撕裂機、texture ripper、從照片擷取貼圖、透視校正貼圖、彎邊四點／瓶身桶身標籤拉平、多點／矩形／橢圓框選貼圖、
  圓柱標籤展平、圖集／atlas 排版、無縫貼圖／seamless、去光影／de-light、法線貼圖／normal map、PBR 材質組、拓印教學／新手導覽、
  修改/擴充紋理撕裂機」時使用。工具純前端單檔、離線可用，雙擊 index.html 即開。
---

# 🎃 南瓜拓印工具 · Pumpkin Imprint v2.3.2（舊名：紋理撕裂機，skill 資料夾名不變）

對標 Puck's Seamlessifier + Ripper。核心流程是**拓印優先**：貼上照片 → 點 4 個角 → 圖立刻拓成正面、自動放進左邊圖集 → 在圖集拖曳／拉角縮放／旋轉自己排 UV → 匯出圖集 PNG＋UV JSON。無縫化、去光影、PBR 都是**選配**，預設關。

- v2.3.2（2026-10-07）：範例圖換成南瓜提供的 AI 生成示意圖（無真實品牌）：`gameboy_v2.png`（Game Boy＋虛構卡帶，綠色像素畫面）、`crt_v2.png`（CRT 播「SUNSET PLAYGROUND」海報，微弧螢幕），縮到長邊 ≤1200、JPEG 85 內嵌；舊照片與署名全刪；導覽四角、A2 取樣座標、教學文字、全部截圖跟著換。範例圖：南瓜提供（AI 生成示意圖，無真實品牌）。
- v2.3.1（2026-10-07）：南瓜指示三項——工具名稱「**南瓜拓印工具 · Pumpkin Imprint**」顯示在頂欄（Logo 右側）、`<title>`、導覽卡、教學面板；**範例改用南瓜提供的兩張照片**（base64 內嵌、長邊 ≤1200、JPEG 85，仍單檔零 CDN）：「載入範例 ▾」→ **Game Boy**（平面四點：主機螢幕或任一卡帶標籤）、**CRT 電視**（彎邊四點：微弧螢幕）；導覽第 2 步改自動點 Game Boy 螢幕；程序化範例全部刪除；README 依 GitHub 圖文寫手格式更新。
- v2.3（2026-10-07）：**可彎邊四點框**（每條邊點中間小圓或 Alt＋點邊加 1～2 個控制點拖成弧線，瓶身／桶身標籤拉平；邊是直線時與純單應性像素級一致）；右欄**拓印清單**（每張即時縮圖、點選切換）；圖集**縮放平移**（滾輪、Shift／空白鍵＋拖曳、中鍵、Home 回全覽）；**匯出全部拓印 ZIP**（自寫 store-only ZIP，檔名＝來源檔名_拓印名.png）；拖點期間 **¼ 解析度預覽**、放開全解析度；無縫面板加**細節回復**與**對比（局部）**；像素風遮罩模式取樣修半格偏移；**教學系統**：首次開啟 4 步 spotlight 導覽、頂欄「教學」重開、內建程序化**範例圖**（斜拍機器面板＋桶狀標籤）、`?` 教學面板六分頁、空畫布提示、`docs/教學.md`。
- v2.2（2026-09-22）：改名「南瓜拓印」；拓印框新增**多點**（N 點多邊形，Enter 收合、Alt 插入／刪除點、外面透明）、**矩形**、**橢圓**拉框（含 alpha 遮罩、邊緣抗鋸齒）；圖集**整組材質匯出**（Albedo／Normal／Roughness／AO／Height 五張＋UV JSON，引擎命名）；alpha 通道全管線保留。
- v2.1（2026-09-22）：版面改為「圖集工作區（左）＋照片舞台（右）」、無縫改選配、新拓印框自動依像素密度定尺寸、圖集可拉角縮放（重拓成該解析度）、像素風取樣、外擴輸出。
- v2（2026-09-21）：多拓印框物件、Web Worker、復原／重做、平鋪預覽、四種無縫、De-Light、PBR、guillotine 圖集、專案存讀、墨金日／夜版。

## 🧠 大腦（資料／本體）位置

- **工具本體**：跟本 skill 同資料夾的 `index.html`（單檔、零相依、零 CDN、file:// 可開）。
  - 本機開發副本：`E:\Claude\Terry_Agent\pumpkin-texture-ripper\index.html`（PC-02）；v1 備份 `index_v1_backup.html`；v2.2 基準 `_test_shots\v2.2\index_v2.2.html`
  - 測試腳本與截圖：`E:\Claude\Terry_Agent\pumpkin-texture-ripper\_test_shots\`（`test4.js` v2.3 驗收、`test2.js` 全流程、`test3.js` 多點／矩形／橢圓、`algo.js` 無縫法、`docs_shots.js` 教學截圖）
  - 同事用教學：`docs\教學.md`（截圖在 `docs\img\tut_*.png`）
  - 開發日誌：`_crew\日誌.md`；規格：`_crew\SPEC_v2.3.md`
  - Tauri 完整版藍圖（未做）：`E:\Claude\Terry_Agent\TextureForge_GOAL.md`
- **美術規範**：`pumpkin-ink-gold` skill（token 內嵌在 `<style>` 的 `--ig-*`，夜間為 `html[data-theme="night"]` 覆寫）。
- 純前端，不需 vault 資料庫。localStorage：`ptr.presets`（自訂預設）、`ptr.theme`、`ptr.tour`（`never`＝不再顯示／`done`＝看完導覽）、`ptr.onb`（舊版上手提示）、`ptr.bendTip`（彎邊提示看過）、`ptr.split`（左右分割寬度）；sessionStorage `ptr.tourSkip`（這個分頁按過略過）。

## 🚀 使用方式（給團隊）

1. 雙擊 `index.html`。第一次會跳 4 步導覽（可略過／不再顯示；頂欄「教學」重開）。截圖後 `Ctrl+V`，或拖照片進右邊畫布（可多張，`Tab` 切換）；沒照片按「**載入範例**」。
2. 選拓印方式（左欄或按鍵）：**四點透視 Q**（點 4 角，歪的面校正成正面；**彎的面**點邊中間小圓或 `Alt`＋點邊加控制點、拖成弧線）、**多點 P**（沿邊逐點描，Enter 或點回起點收合，外面透明）、**矩形 M**／**橢圓 O**（按住拖框）、**曲線 C**（6 點展平圓柱）。圖立刻拓下來、出現在左邊圖集與右上「拓印清單」；尺寸依像素密度自動估算。
3. 想改：拖角點／控制點微調（拖曳中 ¼ 解析度預覽，放開全解析度）、拖中心方塊整體移動、`R` 旋轉、翻轉、改名、`N` 再拓一張、`Del` 刪除。
4. 圖集：拖曳搬移（貼齊格線）、拉四角縮放（鎖比例，`Alt` 自由比例，放開後以該尺寸重新拓印）、滾輪縮放、`Shift`／中鍵拖曳平移、`Home` 回全覽、自動排／補排／移出、尺寸 256–4096。
5. 匯出：圖集工具列「匯出材質組」＝整張圖集的 Albedo／Normal／Roughness／AO／Height 五張＋UV JSON（引擎命名，如 Unity `atlas_BaseColor.png`）；「匯出圖集」只出顏色；拓印清單「匯出全部 ZIP」／右欄「輸出」＝全部拓印打包一個 ZIP（另有全部 PBR 的 ZIP）；也可匯單張、單張 PBR。
6. 要平鋪材質才做：右欄「無縫」勾「啟用無縫化」→ 底欄平鋪預覽自動展開、即時打分；「細節回復」補回接縫處被抹掉的紋理、「對比（局部）」加立體感；「補光」去光影；「材質」PBR。
7. 忘了怎麼用：`?` 打開教學面板（30 秒上手／五種框法／排 UV 訣竅／匯出到引擎／名詞表／快捷鍵）。

## ✅ 功能對照（Puck's → 我們）

| Puck's | 我們 | 程式碼位置（搜註解標記） |
|---|---|---|
| 多邊形 Ripper（可拉彎邊）、可多個、事後調整 | 四點透視＋**可彎邊**（每邊 0～2 控制點，校正空間 Coons patch）、多點多邊形、矩形、橢圓、曲線展平；多個、可拖點／插入刪除點／整體移動／旋轉／翻轉／複製 | worker `bendFn / coonsPoint / extract`；主程式 `/* ---------- 可彎邊四點框`、`/* ---------- stage`、`/* ---------- region 操作` |
| 每個 Ripper 即時個別輸出 | 撕完立即進圖集＋右欄**拓印清單**縮圖（點選切換、✕ 刪除）＋左欄清單；Worker 重算 | `renderRipGallery`、`/* ---------- pipeline`、worker `extract` |
| Slow mode | 拖角點／控制點期間 ¼ 解析度預覽（`rt.res='low'`、狀態列提示），放開全解析度 | `runRegion`（`const low=…`）、`isSettled` |
| Texture Atlas：自動放入、拖曳、縮放、**縮放檢視** | 圖集工作區：自動放第一個空位、拖曳貼齊、拉角縮放（重新拓印）、格線、重疊標紅、使用率；**滾輪縮放、平移、Home 全覽**（`AZ`） | `/* ---------- atlas：圖集工作區`、`atlasZoomTo / atlasHome` |
| Enable → Smoothed Collage／Scattered Edges、Blend／**Detail／Contrast**／Lighting、Apply | 啟用無縫化 → offsetLF／freq／scatter／mirror；羽化／低頻半徑／貼片；**細節回復／對比（局部）**；亮度／整體對比／銳化；De-Light 另頁 | worker `seamOffsetLF / seamFreq / seamScatter / seamMirror / detailRecover / localContrast / delight` |
| Tiling 預覽 | 底欄 1×1～4×4、接縫線、灰階、處理前、打光、分數 | `/* ---------- preview` |
| Export selected / **all** / atlas PNG（檔名跟來源） | 同；**全部拓印＝一個 ZIP**（`來源檔名_拓印名.png`）；另有單張 PBR、全部 PBR ZIP、**圖集整組 PBR 五張**、UV JSON、引擎命名 | `/* ---------- ZIP`、`exportAllZip`、`/* ---------- export` |
| Copy／Paste、Rotate、Undo／Redo | 同 | `/* ---------- io`、`/* ---------- history` |
| Pixel-art 模式 | 拓印框「像素風」＝最近鄰取樣、不平滑；匯出 1:1 不重取樣（實測 0 像素差） | worker `sampleBilinear(...,nearest)`、`applyOrient` |
| — | 額外：PBR 材質組、材質預設組、專案 JSON、四步流程條、日／夜、**新手導覽＋範例圖（Game Boy／CRT）＋教學面板** | `/* ---------- pbr`、`BUILTIN_PRESETS`、`saveProject`、`/* ---------- 範例圖`、`/* ---------- 教學` |

## ⌨️ 快捷鍵

| 按鍵 | 功能 |
|---|---|
| 滾輪 / `+` `−` / `0` | 照片縮放 / 適合視窗 |
| Shift＋拖曳、空白鍵＋拖曳、中鍵 | 平移照片 |
| `Ctrl+F` | 全螢幕 |
| `Ctrl+V` | 貼上剪貼簿圖片 |
| `Tab` / `Shift+Tab` | 切換來源圖 |
| `N` / `Del` / `Ctrl+D` / `R` | 新拓印框 / 刪除 / 複製 / 旋轉 90° |
| `Q` `P` `M` `O` `C` | 模式：四點／多點／矩形／橢圓／曲線 |
| 點邊中間小圓、`Alt＋點邊` / `Alt`＋點控制點 | 四點框：加控制點（拖到標籤真正的弧形邊；彎過的點拖回直線附近自動吸附、變白） / 刪控制點 |
| `Enter`、點回起點 / `Alt`＋點邊 / `Alt`＋點頂點 | 多點：收合 / 插入點 / 刪除點 |
| 圖集：拖曳 / 拉角 / `Alt`＋拉角 | 搬移 / 等比縮放 / 自由比例 |
| 圖集：滾輪 / `Shift`＋拖曳、空白鍵＋拖曳、中鍵 / `Home` | 縮放檢視 / 平移 / 回全覽 |
| `S` | 重算目前拓印框（沿用 v1） |
| `1`–`5` | 無縫方法：不處理 / 位移低頻 / 頻率分離 / 散佈貼片 / 鏡像 |
| `L` / `G` / `B` | 接縫線 / 灰階 / 處理前 |
| `Ctrl+1`–`4` | 平鋪格數 |
| `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` | 復原 / 重做 |
| `Ctrl+S` / `Ctrl+O` | 存 / 開專案 JSON |
| `Ctrl+E` / `Ctrl+C` | 匯出目前貼圖 / 複製結果到剪貼簿 |
| `?` / `Esc` | 教學面板（含快捷鍵分頁） / 關閉面板、結束導覽 |

## 🔧 維護指南

單一 `index.html` 五段，改完 file:// 重新整理即可：
1. `<style>`：`--ig-*` token、夜間覆寫、元件 class、`/* ===== 圖集工作區`、`/* ===== 右欄拓印清單`、`/* ===== 教學面板`、`/* ===== 新手導覽 spotlight`。
2. `<body>`：header（Logo＋流程條＋教學按鈕）、左欄（來源／拓印框清單／拓印框設定）、中央 `#work`（`#atlasPane` 圖集 ＋ `#splitter` ＋ `#stageWrap` 照片；`#dropHint` 空狀態）、底欄 `#dock`（平鋪預覽，預設收合）、右欄（`#ripGal` 拓印清單 ＋ tabs 無縫／補光／材質／輸出）、`#ov_help` 教學面板、`#ov_onb` 導覽。
3. `<script type="text/worker" id="wk">`：純像素函式。**改演算法只改這裡**；`self.onmessage` 分 `base / proc / pbr`。主執行緒用 `GEO = new Function('self', wk原始碼 + 'return {...}')` 共用同一份幾何函式（`computeHomography / applyH / invertH / bendFn / coonsPoint / extract`），不要另寫一份。
4. `<script>` 核心：state → history → worker client → pipeline → io → stage（含可彎邊）→ region 操作。
5. `<script>` UI：preview → pbr 縮圖 → atlas（含縮放檢視）→ export（含 ZIP）→ 專案 → 範例圖 → 預設組 → ui 綁定（含拓印清單、教學／導覽）→ shortcuts → init。

規則：
- 加參數：body 放 `<input data-p="群組.鍵" id="p_鍵">`＋`<span id="v_鍵">`，`DEFAULTS` 加預設值，綁定與復原自動生效；`class="seamOnly"` 只在啟用無縫時顯示。
- 模式定義在 `MODE_INFO`（label／最少點數／提示）；遮罩模式（poly／rect／ellipse）在 worker `extract` 以外框裁切＋2×2 超取樣 alpha；alpha 經 `alphaOf / merge(...,alpha)` 全管線保留，PBR 四張也帶 alpha。圖集整組輸出 `renderAtlasFull(kind)`，非 albedo 的底色見 `ATLAS_BG`（normal 平面藍、rough／height 中灰、AO 白）。
- **可彎邊**：`region.bend=[上,右,下,左]`，每邊 0～2 個 `{s,d}`，存在**校正空間**（s＝沿邊參數 0–1、d＝垂直邊的偏移，單位是校正後的方框），所以拖角點時弧度跟著走。邊界曲線＝過端點與控制點的多項式（1 點二次、2 點三次）；Coons：`x=u+(1-u)fL(v)+u·fR(v)`、`y=v+(1-v)fT(u)+v·fB(u)`，再用 H 取樣。**全部 d=0 時 worker 走 v2.2 原迴圈**（測試鎖住：與 v2.2 base 像素 max diff 0）。吸附規則（`handleAt`）：只有「把已彎的點拖回來」才吸附——這次拖曳曾離直線 ≥ 2 倍距離＋2px、現在回到 5px（`BEND_SNAP_PX`）內才設 d=0；剛拉出來的點拖到哪彎到哪（小物件全覽時弧度只有幾 px 也不會被吸回）；離直線 < 1px 一律視為直線。控制點白＝d=0、金＝有彎。導覽示範中（`tourDemoState`）換步會補完、略過會刪掉半成品；固定點數的框（四點／曲線）任何路徑都不會超過點數。
- 資料流：`extract(base) → delight → seamless → 細節回復／局部對比 → colorAdjust = result → rot/flip = resultCanvas → 自動進圖集 →（按需）PBR / score / 預覽`。`rt.baseKey / procKey / pbrKey` 是快取鍵；`rt.res`＝`low|full`；`rt.scheduled`＋`isSettled(id)` 判斷「沒有排程、沒在算、全解析度」（測試等待用這個）。
- 圖集 `placements[]` 只存位置尺寸，尺寸取 `outSize(r)`（全解析度，低解析度預覽時不會縮）；拉角縮放放開時把 `outW/outH` 設成新尺寸重新拓印，不做二次縮放。檢視狀態 `AZ={z,cx,cy}` 不進歷史。
- 範例圖：`<script type="text/plain" id="sample_gameboy">`／`id="sample_crt"` 內是 JPEG data URL（南瓜提供的兩張 AI 生成示意圖，無真實品牌；長邊 ≤1200、品質 85；原檔在 PC-02 開發副本 `docs/samples/gameboy_v2.png`、`crt_v2.png`）。`SAMPLES.gameboy.screen`（螢幕四角）、`SAMPLES.crt.screen`／`edges`（四邊弧形中點）／`edges2`（1/3、2/3 點）是**內嵌圖的像素座標**，導覽與測試共用；換圖要重量座標。`loadSample(kind)` 回傳 Promise。不要換成 GG 等內部素材、真人作品或真實海報（公開 repo）。
- 導覽 `TOUR[]`（sel／title／text／act／enter／place）；`closeOnboarding()` 保留給舊測試＝不再顯示。
- 新快捷鍵要同步改教學面板「快捷鍵」分頁（`#ov_help` 的 `.keyrows`，每頁 ≤ 8 行）與本檔。

## 🧪 驗收（2026-10-07，Playwright＋本機 Chrome，file://）

`test4.js`（v2.3）：A1 Alt＋點邊加控制點、拖彎、拖直回去 → 與無控制點、與 v2.2 原檔 base 像素 max diff 0；A2／A2_fit 範例 CRT 微弧螢幕：**2026-10-07 因範例圖螢幕邊緣發光而放寬量法，功能未變**——每條邊沿法線找遮罩邊界（亮或飽和＝螢幕）並做穩健二次擬合（剔除閃光、光暈離群點），量彎邊 25%–75% 五個取樣點離擬合曲線的偏差；門檻：20 點的第 80 百分位 < 2px、最大 < 8px，且 P80 比直四點改善 ≥ 70%（實測：放大 P80 1.36／最大 1.57px，全覽 P80 1.18／最大 2.11px；直四點 P80 約 13px）。QA `qa.cjs` 的 A2／X_A2_fitViewSnap 用同一套；A3 右欄 3 張縮圖、點選切換、刪除同步；A4 圖集滾輪、400%、Shift 平移、縮放下拖曳／拉角座標正確、Home；A5 ZIP 用 Node 解開 3 張 PNG、CRC 正確、檔名含來源檔名；A6 拖曳中 `rt.res=low`＋狀態列、放開 full；B1 細節回復／對比（局部）有效且 Ctrl+Z 完全復原；像素風 2× 放大與圖集匯出 0 像素差；C1 導覽略過／不再顯示／頂欄重開；C2 範例（Game Boy）＋導覽第 2 步自動拓印、空狀態按鈕；C3 教學面板 6 分頁、每頁 ≤ 8 行、390px 不爆版；C4／C5 文件。`test2.js`／`test3.js` 回歸通過（test3 的 2 條 `willReadFrequently` warning 來自測試腳本自己讀像素，v2.2 基線就有）。Console 零錯誤。

## 🗺️ 未做／下一版

- 多點多邊形目前是「外框裁切＋遮罩」，不做透視校正；要校正請先用四點（可彎邊）再疊多點。
- 彎邊只支援四點模式；控制點只做「垂直邊」的偏移（不處理沿邊方向的疏密，圓柱兩側的橫向壓縮仍在，格線是直的但間距不等）。
- Blender／Unity 即時同步（純前端做不到，用 PNG＋UV JSON 交接）。
- 墨金磁吸點格 JS 未內嵌。
- 整個工具版面仍是桌機三欄；只有教學面板與導覽卡做了手機寬。

## 🔄 同步狀態

三處同步制：①本機 `~/.claude/skills/pumpkin-texture-ripper/` ②vault `_系統/skills/pumpkin-texture-ripper/` ③GitHub `pumpkin-skills`（由 Mac 統一 push，**push 前先問南瓜**）。另有公開 repo `pumpkin-imprint`（見 HANDOFF §9）。去敏：工具內文字僅「創作者：南瓜」與公司 Logo；範例為南瓜提供的兩張 AI 生成示意圖（無真實品牌）。v2.3 起公開 repo `terry12260201/pumpkin-imprint` 是正本（見 HANDOFF §9）；同步順序：PC-02 開發副本 → pumpkin-imprint → 本機 skill 與 vault。
