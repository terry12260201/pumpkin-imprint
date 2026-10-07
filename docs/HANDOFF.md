# 接手文件 · 南瓜拓印 Pumpkin Imprint（pumpkin-texture-ripper）

> 給下一個接手的 AI／工程師。讀完這份＋`SKILL.md` 就能繼續開發，不用再問南瓜背景。最後更新：2026-10-07（PC-02，v2.3 開發手）。

## 1. 這是什麼、給誰用

南瓜虛擬科技 3D／XR 美術團隊的內部工具。把照片裡的表面拓成正面貼圖 → 排進圖集當 UV → 一鍵出 PBR 五張。對標 [Puck's Seamlessifier + Ripper](https://puszke.itch.io/pucks-texture-ripper)、[EkstrakTex](https://bagusindrayana.itch.io/ekstraktex)。

**南瓜的核心需求（原話重點）**：「快速截圖，把不規則的圖像秒轉成正面的圖，當 3D 模型 Texture 用；可以改尺寸位置、自己排 UV。」無縫化是次要功能，不是主角。

## 2. 硬性限制（不能破）

- 單一 `index.html`，零外部套件、零 CDN，`file://` 雙擊可開、可離線。
- Web Worker 寫在同檔（`<script type="text/worker" id="wk">` → Blob URL），Worker 開不了時同碼在主執行緒跑。
- 2048² 運算不能卡 UI。
- 去敏：工具內只出現「創作者：南瓜」與公司 Logo，不能有真人全名、帳號、憑證。
- 美術：南瓜墨金美學（`pumpkin-ink-gold` skill）。紙 #F5F5F5／墨 #161415／金 #FDC302 一畫面一顆；夜間 #1A1819。token 已內嵌在 `<style>` 的 `--ig-*`。
- 舊快捷鍵不能壞：滾輪縮放、Shift 拖曳平移、Ctrl+F 全螢幕、S 重算。新快捷鍵要寫進 `?` 面板與 `SKILL.md`。

## 3. 檔案在哪

| 東西 | 位置 |
|---|---|
| 工具本體（唯一要改的檔） | `index.html`（約 1840 行、約 175KB） |
| 同事用教學（白話＋12 張截圖） | `docs/教學.md`、`docs/img/tut_*.png`（`_test_shots/docs_shots.js` 可重產） |
| 規格與開發日誌 | `_crew/SPEC_v2.3.md`、`_crew/日誌.md` |
| 維護指南（功能表、程式碼分區、快捷鍵、驗收） | `SKILL.md` |
| 白話說明 | `README.md` |
| 開發副本（PC-02） | `E:\Claude\Terry_Agent\pumpkin-texture-ripper\`，含 `index_v1_backup.html`（v1 舊版）、`_test_shots\`（Playwright 腳本＋截圖）、`_test_shots\v2.2\index_v2.2.html`（v2.2 原檔，A1 像素比對基準） |
| 三處同步 | 本機 `~/.claude/skills/pumpkin-texture-ripper/`｜Obsidian vault `_系統/skills/pumpkin-texture-ripper/`｜GitHub 私有 `terry12260201/pumpkin-skills` 的 `skills/pumpkin-texture-ripper/` |
| Tauri 完整版藍圖（未做、參考用） | `E:\Claude\Terry_Agent\TextureForge_GOAL.md` |
| 進度紀錄 | vault `_系統/第二大腦_現況.md`（搜「拓印」「撕裂機」） |

改完要三處都放同一份；**GitHub push 前先問南瓜**（除非他已明說要推）。

## 4. 程式架構（30 秒版）

`index.html` 五段：`<style>` → `<body>` → worker script → 核心 script（state／history／worker client／pipeline／io／stage／region 操作）→ UI script（preview／pbr／atlas／export／專案／預設組／ui 綁定／shortcuts／init）。每段有 `/* ---------- 名稱 ---------- */` 註解，搜這個找位置。

- **資料模型**：`state.sources[]`（來源圖）、`state.regions[]`（拓印框：id／name／sourceId／mode／pts／**bend**／closed／outW／outH／autoSize／pixel／rot／flipX／flipY／delight／seamless／pbr）、`state.atlas.placements[]`（圖集位置尺寸）。像素結果在 `RT` Map（不進歷史、不存檔；`rt.res`＝`low|full`、`rt.scheduled`）。
- **模式** `MODE_INFO`：`quad`（4 點透視 homography；`bend[上,右,下,左]` 每邊 0～2 個校正空間控制點 `{s,d}` → Coons patch，全 0 時走原純單應性迴圈）、`poly`（N 點，`closed` 才完成，外框裁切＋alpha 遮罩）、`rect`／`ellipse`（2 點拖框，遮罩）、`curve`（6 點二次貝茲展平）。
- **管線**：`extract(base) → delight → seamless → detailRecover／localContrast（僅無縫啟用時）→ colorAdjust = result → rot/flip = resultCanvas → 自動放進圖集 →（按需）PBR／score／平鋪預覽`。快取鍵 `rt.baseKey / procKey / pbrKey`，參數沒變不重算。拖點期間 base 用 ¼ 寬高（慢速模式），放開才全解析度。
- **幾何共用**：主執行緒 `GEO = new Function('self', worker原始碼 + 'return {...}')`，畫彎邊曲線、換算控制點與 worker 用同一份函式。
- **教學**：`TOUR[]` 4 步 spotlight（`startTour / endTour / tourDemo`）、`#ov_help` 六分頁（`setTut`）、`loadSample()`＋`SAMPLE` 程序化範例圖。
- **Worker 協定**：主→worker `setSource`／`job{stage:'base'|'proc'|'pbr'}`；worker→主 `progress`／`done`（transferable buffer）；`latestJob` 丟棄過期結果，每個 region 同時只跑一件。
- **復原**：JSON 快照（不含像素），60 步；滑桿一段拖曳合併成一筆。
- **圖集**：guillotine best-short-side-fit 自動排；手動拖曳貼齊格線；拉角縮放放開後把 `outW/outH` 改成新尺寸**重新拓印**（不是二次縮放）。檢視可縮放平移（`AZ`、`atlasZoomTo`、`atlasHome`）。`renderAtlasFull(kind)` 出全解析度圖集，非 albedo 的透明區填底色（`ATLAS_BG`）。
- **ZIP**：`makeZip(files)` 自寫 store-only（CRC32、UTF-8 檔名旗標 0x0800），`exportAllZip('albedo'|'pbr')`。
- **alpha**：遮罩模式的 alpha 經 `alphaOf / merge(...,alpha)` 全管線保留，PBR 四張也帶。

## 5. 目前狀態（v2.3，2026-10-07）

**v2.3 新增**（SPEC：`_crew/SPEC_v2.3.md`，南瓜原話「參考版本優秀的內容加進來」「每款工具都需要使用教學和方法，以人為本」）：
- 可彎邊四點框（瓶身／桶身標籤拉平）、右欄拓印清單、圖集縮放平移、匯出全部拓印 ZIP、拖點 ¼ 解析度預覽（M1）。
- 無縫面板「細節回復」「對比（局部）」；原「對比」改名「整體對比」；像素風遮罩模式取樣修半格偏移（M2）。
- 首次開啟 4 步導覽（略過／不再顯示／頂欄「教學」重開）、內建範例圖、`?` 教學面板六分頁、空畫布提示、`docs/教學.md`（M3）。
- 驗收：`_test_shots/test4.js` A1–A7、B1、C1–C5 全過；`test2.js`／`test3.js` 回歸通過；Console 零錯誤。逐條紀錄見 `_crew/日誌.md`。

v2.2 以前已完成且仍通過：多來源＋Ctrl+V、五種拓印模式、拓印框可事後改（拖點、插入／刪除點、整體移動、旋轉、翻轉、複製）、自動尺寸、像素風取樣、圖集工作區（自動放入、拖曳、縮放重拓、格線、重疊標紅、外擴輸出）、整組 PBR 匯出＋UV JSON＋引擎命名、無縫四法＋去光影＋平鋪預覽＋接縫分數（選配）、材質預設組、專案 JSON 存讀、復原重做、四步流程條、墨金日／夜版。

**南瓜給過的回饋與處理**（依時間）：
1. 「很難用、只會出無縫圖、不能轉不能排」→ 改成拓印優先：無縫改選配預設關；圖集移到主畫面左半可拖可縮可轉。
2. 「不要只限四點，要多點、矩形、圓形框選」→ 加 poly／rect／ellipse。
3. 「整合匯出要含 Normal／AO／Roughness」→ 圖集「匯出材質組」。
4. 「紋理撕裂機太誇張恐怖」→ 改名「南瓜拓印 Pumpkin Imprint」（備選：南瓜採貼 Pumpkin Harvest、南瓜取材）。**名字南瓜尚未正式拍板**，要換只改 `<title>`、header `title`、`README.md`／`SKILL.md`（v2.3 起上手視窗改成導覽卡，沒有大標題）。
5. 「我完全不會用，你沒有給操作手法；以人為本」→ v2.3 教學系統（導覽、範例圖、教學面板、docs/教學.md）。

## 6. 沒做／已知限制（下一步候選，v2.3 更新）

- 多點／矩形／橢圓是「裁切＋遮罩」，**不做透視校正**。v2.3 的彎邊只在四點模式；若要「多點又要拉正」，可行方案：多點框內另指定 4 個角當透視基準，或對多邊形做最小面積外接四邊形再校正。
- 彎邊只做「垂直邊」的偏移，沿邊方向的疏密不校正：圓柱標籤拉平後格線是直的，但兩側間距會比中間窄（真正的圓柱展開請用曲線 C 模式，或下一版加「沿邊均勻化」）。
- ~~圖集內沒有縮放／平移檢視~~（v2.3 已做）。
- 外擴（dilation）對透明邊的遮罩圖沒意義，目前照做不影響。
- 曲線模式無法和遮罩並用。
- 沒有 Blender／Unity 即時同步（純前端做不到），用 PNG＋UV JSON 交接。
- 墨金磁吸點格 JS 未內嵌（工具頁用靜態點格）。
- 沒有多語系；主版面沒有觸控／手機版（只有教學面板與導覽卡做了窄螢幕）。
- 接縫分數在「未無縫」時也會算，數字低不代表有問題（v2.2 舊行為，未改）。
- v2.3 只在 PC-02 開發副本，**尚未同步**到本機 skill／vault／pumpkin-skills／pumpkin-imprint（要南瓜點頭）。

## 7. 怎麼測

`_test_shots\` 裡有 Playwright 腳本（用本機 Chrome，不下載瀏覽器）：

```
cd 任一暫存資料夾
npm init -y && npm i playwright-core
node test2.js "E:/Claude/Terry_Agent/pumpkin-texture-ripper/index.html"   # 四點→圖集拖曳縮放旋轉→無縫→復原→匯出→存讀
node test3.js "E:/Claude/Terry_Agent/pumpkin-texture-ripper/index.html"   # 多點／矩形／橢圓＋整組匯出
node algo.js  "E:/Claude/Terry_Agent/pumpkin-texture-ripper/index.html"   # 五種無縫法輸出圖
node test4.js [index.html] [--only m1|m2|m3]                               # v2.3 驗收 A1–A6、B1、像素風、C1–C5（結果 shots4/result.json）
node docs_shots.js                                                        # 重產 docs/img/tut_*.png
```

PC-02 不用 npm i：Playwright 已全域安裝，設 `NODE_PATH=%APPDATA%\npm\node_modules\playwright\node_modules` 即可 `require('playwright-core')`。

腳本內 Chrome 路徑寫死 `C:/Program Files/Google/Chrome/Application/chrome.exe`，別台請改。驗收標準：三支都印 `CONSOLE ISSUES: none`；截圖存在腳本旁的 `shots*/`。人工驗收就雙擊 `index.html`，Ctrl+V 一張 GBA 或手機的照片，走一遍拓印→排版→匯出。

## 8. 開發習慣

- 改動一律先改 `E:\Claude\Terry_Agent\...\index.html`，跑測試，再複製到 skill 與 vault，最後才 GitHub。
- 改演算法只動 worker 段；改參數面板只加 `data-p` 輸入框＋`DEFAULTS`，綁定／復原／存檔自動生效。
- 回報南瓜：講人話、附路徑或連結、待辦列步驟；別在回報裡堆術語。

## 9. 公開版 repo＝skill 正本（2026-10-07 起）

`terry12260201/pumpkin-imprint` 從 v2.3 起是這支 skill 的**正本**（GitHub Pages：https://terry12260201.github.io/pumpkin-imprint/ ，根目錄 `index.html` 就是線上工具，push 後 Pages 立即生效）。總倉庫 `pumpkin-skills` 之後改用子模組引用本 repo。結構：

| 路徑 | 內容 |
|---|---|
| `index.html` | 工具本體（線上版＝離線版，同一個檔） |
| `SKILL.md` | skill 正本（Claude Code 載入要它在根目錄；frontmatter 不要動） |
| `README.md` | 公開圖文頁（由 pumpkin-gh-writer 規範產生） |
| `docs/HANDOFF.md` | 本文 |
| `docs/DEVELOPMENT.md` | 只剩一行指向根目錄 `SKILL.md`（v2.2 時是 SKILL 去 frontmatter 的副本，為避免兩份不同步改成指標） |
| `docs/教學.md`、`docs/img/tut_*.png` | 同事上手教學與 12 張截圖 |
| `docs/readme/` | README 的 Banner 與截圖（`images/*-framed.png`） |
| `_crew/` | v2.3 規格與開發日誌 |
| `tests/` | Playwright 腳本（`test2.js`、`test3.js`、`algo.js`；不帶參數時預設測 repo 根目錄的 `index.html`）。`test4.js`、`docs_shots.js` 目前只在 PC-02 開發副本 `_test_shots\` |

**改工具後的同步順序**：開發副本 `E:\Claude\Terry_Agent\pumpkin-texture-ripper\` → 本 repo（正本）→ 本機 `~/.claude/skills/pumpkin-texture-ripper/` 與 vault `_系統/skills/pumpkin-texture-ripper/`。push 前先問南瓜。公開 repo 不放憑證、真人全名、客戶資料；範例圖一律程序化產生。
