# AGENTS.md — 搖搖圖鑑 ShakeDex

> 這份文件是給 AI 協作者（Claude、Codex、Cursor 等）閱讀的專案規則。
> **任何新增或修改之前，請先完整讀完本文件。** 規則與使用者當下指令衝突時，以使用者指令為準，但必須先提醒使用者哪一條規則會被打破。

---

## 1. 專案目的

「搖搖圖鑑」是一個**個人手搖飲評鑑網站**，用寶可夢圖鑑的概念收集喝過的每一杯飲料。

- **使用者**：網站作者本人（記錄）＋ 想參考的朋友（查詢「哪杯好喝」）。
- **核心價值**：每杯飲料都用**同一套評分標準**記錄，所以不同店、不同杯之間可以公平比較。
- **成功標準**：作者只要對 AI 說一句「新增一杯 ○○」，AI 就能在不破壞任何既有內容的前提下，產出格式完全一致的新紀錄。

---

## 2. 技術約束（不可違反）

| 項目 | 規定 |
|---|---|
| 技術棧 | 純 HTML ＋ CSS ＋ 原生 JavaScript（ES2020），**不使用任何框架**（React、Vue、Tailwind 皆不可） |
| 建置 | **沒有 build 步驟**，檔案推上 GitHub 就是最終成品 |
| 部署 | GitHub Pages，從 `main` 分支根目錄發布 |
| 外部資源 | 只允許 Google Fonts 的 `Noto Sans TC`；不得引入其他 CDN 或 npm 套件 |
| 本機預覽 | 因為頁面用 `fetch()` 讀 JSON，必須透過本機伺服器開啟：`python3 -m http.server 8000`，再開 `http://localhost:8000` |
| 驗證 | `node scripts/validate.mjs`（只用 Node 內建模組，不需要 `npm install`） |

---

## 3. 資料夾結構

```
/
├── AGENTS.md              ← 本文件（專案規則，唯一真相）
├── CLAUDE.md              ← 只負責轉介到 AGENTS.md，不要在裡面寫規則
├── README.md              ← 給人類看的專案介紹
├── index.html             ← 首頁：圖鑑總覽（篩選、排序、搜尋）
├── shop.html              ← 店家頁模板，用 ?id=<shopId> 決定顯示哪一間
├── drink.html             ← 飲品頁模板，用 ?id=<drinkId> 決定顯示哪一杯
├── about.html             ← 評分標準頁（內容由 options.json 自動產生）
├── .nojekyll              ← 讓 GitHub Pages 不經過 Jekyll 處理
├── assets/
│   ├── css/style.css      ← 全站唯一的樣式表
│   └── js/
│       ├── core.js        ← 共用：讀資料、計算分數、畫杯子、畫雷達圖
│       └── pages.js       ← 依 <body data-page="..."> 執行對應頁面的渲染
├── data/
│   ├── drinks.json        ← 所有飲品紀錄（陣列）
│   ├── shops.json         ← 所有店家（陣列）
│   └── options.json       ← 所有允許的選項值（分類、甜度、冰塊、配料、評分維度）
├── templates/
│   ├── drink.template.json ← 新增飲品時複製的範本
│   └── shop.template.json  ← 新增店家時複製的範本
└── scripts/
    └── validate.mjs       ← 資料驗證腳本
```

---

## 4. 核心原則：資料驅動

把這個網站想成一台**自動販賣機**：`data/` 是貨架上的飲料，HTML 和 JS 是販賣機本身。
**補貨（新增內容）只動貨架，不拆機器。**

1. **內容只存在 `data/*.json`**。HTML 檔裡不得出現任何一杯飲料或一間店的寫死內容。
2. **一個頁面類型 = 一個 HTML 模板**。絕對不要為單一飲料或單一店家建立新的 HTML 檔（例如 ❌ `kebuke.html`、❌ `drinks/milk-tea.html`）。
3. **能算出來的值一律不存**。以下欄位都由 `core.js` 即時計算，**禁止**寫進 JSON：
   - 飲品總分（四個維度的平均）
   - 店家平均分、店家飲品數、回購率
   - 圖鑑編號 `No.001`（依 `date` 由舊到新、同日再依 `id` 排序自動編號）
4. **所有選項值以 `options.json` 為唯一來源**。前端篩選器、評分標準頁、驗證腳本都從這裡讀。

---

## 5. 資料格式

### 5.1 `data/drinks.json`（每杯飲料一筆）

| 欄位 | 型別 | 規則 |
|---|---|---|
| `id` | string | 格式 `{shopId}-{品名拼音}`，全小寫、單字間用 `-` 連接，例：`50lan-boba-naicha`。不得重複 |
| `shopId` | string | 必須對應 `shops.json` 裡已存在的 `id` |
| `name` | string | 店家菜單上的正式品名，繁體中文 |
| `category` | string | 必須是 `options.categories` 之一 |
| `price` | integer | 新台幣，正整數，不加「元」 |
| `sugar` | string | 必須是 `options.sugar` 之一 |
| `ice` | string | 必須是 `options.ice` 之一 |
| `toppings` | string[] | 每一項都必須在 `options.toppings` 裡；沒有配料就填 `[]`；不得重複 |
| `liquidColor` | string | 飲料本體顏色，`#RRGGBB`，用來畫杯子插圖（見 §8.3 色票參考） |
| `scores` | object | 剛好四個 key：`flavor`、`balance`、`texture`、`value`，值為 1–5 的整數 |
| `rebuy` | boolean | 會不會再買 |
| `comment` | string | 一句話短評，**1–30 個字**（見 §9） |
| `date` | string | 喝的日期，`YYYY-MM-DD` |

陣列排序：**依 `date` 由舊到新**，新的一筆加在最後面。

### 5.2 `data/shops.json`（每間店一筆）

| 欄位 | 型別 | 規則 |
|---|---|---|
| `id` | string | 店名的英文或拼音縮寫，全小寫，可含數字與 `-`，例：`50lan`、`kebuke` |
| `name` | string | 店家正式中文名稱 |
| `emoji` | string | 一個 emoji 當作店家代表圖示 |
| `color` | string | 店家代表色 `#RRGGBB`，用於店家頁頂部色帶與徽章 |
| `intro` | string | 店家簡介，**60 字以內**，客觀描述招牌特色，不寫評價 |

### 5.3 `data/options.json`

存放所有列舉值與評分維度定義。**修改這個檔案等於修改整個網站的規則**，只有在使用者明確要求時才能改。

---

## 6. 命名規則

| 對象 | 規則 | 範例 |
|---|---|---|
| 店家 id | 小寫英數 ＋ `-` | `kebuke`、`50lan`、`milksha` |
| 飲品 id | `{shopId}-{品名拼音}` | `milksha-dazheng-latte` |
| 拼音 | 漢語拼音、不加聲調；英文品名直接用英文單字 | 「熟成紅茶」→ `shucheng-hongcha`；「歐蕾」→ `aulait` |
| HTML 檔 | 小寫英文單字，一種頁面類型一個檔 | `ranking.html` |
| CSS class | kebab-case，以元件為前綴 | `.drink-card`、`.drink-card__title` |
| JS 函式 | camelCase，渲染函式以 `render` 開頭 | `renderShopPage()` |

---

## 7. 標準作業流程（SOP）

### A. 新增一杯飲料（最常見）

1. **確認資訊齊全**。必填資訊：店家、品名、價格、甜度、冰塊、配料、四項分數、會不會回購、短評、日期。
   - **分數、回購、短評是作者的主觀感受，缺少時必須先問使用者，絕對不可以自己編。**
   - 日期沒給 → 用今天的日期，並在回覆中說明。
   - 價格不確定 → 問使用者，不要用網路查到的價格自行填入。
2. 如果店家不存在 → 先執行流程 B。
3. 複製 `templates/drink.template.json` 的結構，填好後**加在 `data/drinks.json` 陣列最後面**。
4. 依 §8.3 選 `liquidColor`。
5. 執行 `node scripts/validate.mjs`，必須顯示 `✅ 全部通過`。
6. 回覆使用者時，列出這杯飲料的圖鑑編號與頁面網址 `drink.html?id=<id>`。

**使用者輸入 → JSON 對照範例**

> 使用者：「新增一杯五十嵐的 8 冰綠，半糖少冰，50 元，風味 4、平衡 4、口感 3、CP 4，會回購，短評：多多跟綠茶很搭，夏天必點。」

```json
{
  "id": "50lan-babing-lu",
  "shopId": "50lan",
  "name": "8冰綠",
  "category": "特調",
  "price": 50,
  "sugar": "半糖",
  "ice": "少冰",
  "toppings": [],
  "liquidColor": "#e3d98a",
  "scores": { "flavor": 4, "balance": 4, "texture": 3, "value": 4 },
  "rebuy": true,
  "comment": "多多跟綠茶很搭，夏天必點。",
  "date": "2026-11-17"
}
```

### B. 新增一間店家

1. 複製 `templates/shop.template.json`，填好後加在 `data/shops.json` 最後面。
2. `color` 選店家招牌的主色；`emoji` 選一個能代表店家特色的符號。
3. 一間新店家**必須至少搭配一杯飲料**，否則驗證腳本會出現警告。
4. 不需要建立任何 HTML，`shop.html?id=<新id>` 會自動生效。

### C. 新增選項值（例如新配料「芋圓」）

1. 只在使用者明確要求時才做。
2. 把新值加進 `data/options.json` 對應的陣列尾端。
3. 如果是新配料，要在 `core.js` 的 `TOPPING_STYLES` 補上它在杯子插圖中的畫法；沒補的話會用預設的圓點畫法。
4. 執行驗證腳本。

### D. 新增一種頁面（例如「排行榜」）

1. 新增 `ranking.html`，結構複製 `about.html`（共用 header、footer）。
2. `<body data-page="ranking">`，並在 `pages.js` 新增 `renderRankingPage()`，加進檔案底部的頁面對照表。
3. 資料一律透過 `core.js` 的 `loadAll()` 取得，不得另外寫 `fetch`。
4. 在所有頁面的 `<nav>` 加上新頁面連結（目前有 4 個 HTML 檔，每個都要改）。
5. 樣式加在 `style.css` 尾端，所有 class 以頁面名稱為前綴（例：`.ranking-table`），避免影響既有頁面。

---

## 8. 視覺風格規範

### 8.1 整體調性

**「奶茶色系的可愛圖鑑」**：溫暖、圓潤、像一本收集冊。大量留白、圓角卡片，不使用尖銳的直角和高飽和的霓虹色。

### 8.2 設計變數（定義在 `style.css` 的 `:root`，**不得在其他地方寫死色碼**）

| 變數 | 色碼 | 用途 |
|---|---|---|
| `--bg` | `#fbf5ec` | 頁面背景（奶霜色） |
| `--surface` | `#ffffff` | 卡片背景 |
| `--ink` | `#3b2a20` | 主要文字（深茶色） |
| `--ink-soft` | `#7a6252` | 次要文字 |
| `--accent` | `#c8814a` | 強調色（焦糖色），用在按鈕和分數 |
| `--accent-soft` | `#f3e1cc` | 標籤背景 |
| `--pearl` | `#2b1d16` | 珍珠色，用在徽章和深色元素 |
| `--good` / `--bad` | `#4f8a3c` / `#c0563b` | 回購／不回購 |
| `--radius` | `20px` | 卡片圓角 |

字體：`"Noto Sans TC", system-ui, sans-serif`；標題用 700，內文用 400。

### 8.3 杯子插圖規則

每杯飲料的插圖由 `core.js` 的 `cupSVG(drink)` 自動繪製，**不得使用照片或店家 logo**（避免版權問題）。

- 飲料顏色來自 `liquidColor`，參考色票：

| 飲料類型 | 建議色碼 |
|---|---|
| 紅茶 | `#8a3f17` |
| 綠茶／青茶 | `#c9b04a` |
| 烏龍 | `#b9a246` |
| 奶茶 | `#b88a64` |
| 鮮奶茶／拿鐵 | `#d2a77f` |
| 多多、優格類 | `#e5dc9a` |
| 柳橙、百香果 | `#f0a63a` |
| 葡萄、莓果 | `#8e3b6b` |

- 冰塊：`ice` 為「去冰／溫／熱」時不畫冰塊；「微冰」畫 1 顆、「少冰」畫 2 顆、「正常冰」畫 3 顆。
- 「溫／熱」會在杯子上方畫蒸氣。
- 配料依 `toppings` 自動畫在杯底，奶蓋畫在液面頂端。

### 8.4 元件

- **飲品卡片 `.drink-card`**：杯子插圖 → 編號 → 品名 → 店家徽章 → 總分 → 甜度、冰塊標籤 → 回購徽章。
- **分數顯示**：總分取到小數第一位，旁邊用 5 顆 ★ 表示（四捨五入到半顆）。
- **雷達圖**：只出現在飲品頁，四個軸依 `options.dimensions` 的順序排列。

---

## 9. 文案規範

- 一律使用**繁體中文、台灣用語**（「珍珠」不是「珍珠粉圓」，「去冰」不是「無冰」）。
- 短評 1–30 字，口語、具體，要說出**為什麼**好喝或不好喝。
  - ✅「鮮奶香很乾淨，微糖就很順口。」
  - ❌「好喝」（太空泛）
  - ❌「店員態度很差」（只評飲料，不評服務和人）
- 店家簡介只寫客觀特色，不寫個人評價。
- 中英文、數字之間加半形空格（例：「CP 值」、「30 元」）。

---

## 10. 禁止事項

1. ❌ 自行編造分數、短評、回購意願，或任何作者主觀的內容。
2. ❌ 為單一飲料或店家新增 HTML 檔。
3. ❌ 把總分、平均分、編號等計算值寫進 JSON。
4. ❌ 使用 `options.json` 以外的分類、甜度、冰塊、配料值。
5. ❌ 引入框架、npm 套件、新的 CDN。
6. ❌ 使用店家官方 logo、商品照片或任何非自製圖片。
7. ❌ 在 `style.css` 以外寫樣式（不得使用 inline style，唯一例外是 JS 動態設定的店家代表色 CSS 變數）。
8. ❌ 修改或刪除既有的飲品紀錄，除非使用者明確指名要改哪一筆。
9. ❌ 執行 `git` 指令。版本控制由作者自己操作，AI 只需要在完成後提供建議的 commit 訊息。

---

## 11. 完成前檢查清單

每次修改後，回覆使用者之前必須逐項確認：

- [ ] `node scripts/validate.mjs` 顯示 `✅ 全部通過`
- [ ] 新增的內容只動到 `data/`（除非任務本身是改版面）
- [ ] 首頁的總數、篩選結果有反映新資料
- [ ] 新飲品的 `drink.html?id=...` 和所屬店家的 `shop.html?id=...` 都能正常顯示
- [ ] 沒有違反 §10 任何一條
- [ ] 回覆中附上建議的 commit 訊息，格式：`feat(drink): 新增 {店家} {品名}` 或 `feat(shop): 新增 {店家}`

---

## 12. 未來擴充方向（Roadmap）

以下是已規劃但尚未實作的功能，實作時要遵守同一套規則：

- **排行榜頁 `ranking.html`**：依總分、CP 值、各維度排名（依 SOP D 實作）。
- **個人化甜度統計**：分析作者最常點的甜度和冰塊。
- **擴充成「學校周邊美食地圖」**：新增 `data/restaurants.json` 與 `restaurant.html` 模板，沿用同一套評分維度的設計方式（維度改成「美味、份量、環境、CP 值」），並在 `options.json` 新增對應的列舉值。
