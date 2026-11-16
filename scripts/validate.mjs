import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function load(name) {
  try {
    return JSON.parse(readFileSync(join(root, "data", name), "utf8"));
  } catch (e) {
    errors.push(`data/${name} 無法解析：${e.message}`);
    return null;
  }
}

const options = load("options.json");
const shops = load("shops.json");
const drinks = load("drinks.json");

if (!options || !shops || !drinks) report();

const HEX = /^#[0-9a-fA-F]{6}$/;
const SHOP_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DRINK_KEYS = ["id", "shopId", "name", "category", "price", "sugar", "ice", "toppings", "liquidColor", "scores", "rebuy", "comment", "date"];
const SHOP_KEYS = ["id", "name", "emoji", "color", "intro"];
const SHOP_OPTIONAL = ["logo"];
const FORBIDDEN = ["total", "avg", "average", "dexNo", "count", "rebuyRate"];
const dimKeys = options.dimensions.map((d) => d.key);
const len = (s) => [...s].length;

function checkKeys(obj, allowed, where, optional = []) {
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN.includes(k)) errors.push(`${where}：不可儲存計算值欄位「${k}」（AGENTS.md §4）`);
    else if (!allowed.includes(k) && !optional.includes(k)) errors.push(`${where}：未知欄位「${k}」`);
  }
  for (const k of allowed) if (!(k in obj)) errors.push(`${where}：缺少欄位「${k}」`);
}

const shopIds = new Set();
shops.forEach((s, i) => {
  const where = `shops[${i}]（${s.id ?? "無 id"}）`;
  checkKeys(s, SHOP_KEYS, where, SHOP_OPTIONAL);
  if ("logo" in s) {
    const pattern = new RegExp(`^assets/logos/${s.id}\\.(png|jpg|jpeg|webp|svg)$`);
    if (!pattern.test(s.logo ?? "")) errors.push(`${where}：logo 路徑必須是 assets/logos/${s.id}.png（或 .jpg／.webp／.svg）`);
    else if (!existsSync(join(root, s.logo))) warnings.push(`${where}：找不到 ${s.logo}，網站會暫時改用 emoji 顯示`);
  }
  if (!SHOP_ID.test(s.id ?? "")) errors.push(`${where}：id 必須是小寫英數與 -`);
  if (shopIds.has(s.id)) errors.push(`${where}：id 重複`);
  shopIds.add(s.id);
  if (!HEX.test(s.color ?? "")) errors.push(`${where}：color 必須是 #RRGGBB`);
  if (typeof s.intro !== "string" || len(s.intro) > 60) errors.push(`${where}：intro 必須是 60 字以內的字串`);
});

const drinkIds = new Set();
let lastDate = "";
drinks.forEach((d, i) => {
  const where = `drinks[${i}]（${d.id ?? "無 id"}）`;
  checkKeys(d, DRINK_KEYS, where);
  if (!SHOP_ID.test(d.id ?? "")) errors.push(`${where}：id 必須是小寫英數與 -`);
  if (drinkIds.has(d.id)) errors.push(`${where}：id 重複`);
  drinkIds.add(d.id);
  if (!shopIds.has(d.shopId)) errors.push(`${where}：shopId「${d.shopId}」不存在於 shops.json`);
  else if (!d.id?.startsWith(`${d.shopId}-`)) errors.push(`${where}：id 必須以「${d.shopId}-」開頭`);
  if (!options.categories.includes(d.category)) errors.push(`${where}：category「${d.category}」不在 options.categories`);
  if (!options.sugar.includes(d.sugar)) errors.push(`${where}：sugar「${d.sugar}」不在 options.sugar`);
  if (!options.ice.includes(d.ice)) errors.push(`${where}：ice「${d.ice}」不在 options.ice`);
  if (!Number.isInteger(d.price) || d.price <= 0) errors.push(`${where}：price 必須是正整數`);
  if (!Array.isArray(d.toppings)) errors.push(`${where}：toppings 必須是陣列`);
  else {
    d.toppings.forEach((t) => { if (!options.toppings.includes(t)) errors.push(`${where}：配料「${t}」不在 options.toppings`); });
    if (new Set(d.toppings).size !== d.toppings.length) errors.push(`${where}：toppings 有重複`);
  }
  if (!HEX.test(d.liquidColor ?? "")) errors.push(`${where}：liquidColor 必須是 #RRGGBB`);
  if (typeof d.scores !== "object" || d.scores === null) errors.push(`${where}：scores 必須是物件`);
  else {
    const keys = Object.keys(d.scores);
    if (keys.length !== dimKeys.length || !dimKeys.every((k) => keys.includes(k))) errors.push(`${where}：scores 必須剛好有 ${dimKeys.join("、")}`);
    for (const k of dimKeys) {
      const v = d.scores[k];
      if (!Number.isInteger(v) || v < 1 || v > 5) errors.push(`${where}：scores.${k} 必須是 1–5 的整數`);
    }
  }
  if (typeof d.rebuy !== "boolean") errors.push(`${where}：rebuy 必須是 true 或 false`);
  if (typeof d.comment !== "string" || len(d.comment) < 1 || len(d.comment) > 30) errors.push(`${where}：comment 必須是 1–30 字`);
  if (!DATE.test(d.date ?? "") || Number.isNaN(Date.parse(d.date))) errors.push(`${where}：date 必須是有效的 YYYY-MM-DD`);
  else {
    if (d.date < lastDate) warnings.push(`${where}：陣列沒有依 date 由舊到新排列`);
    lastDate = d.date;
  }
});

for (const id of shopIds) {
  if (!drinks.some((d) => d.shopId === id)) warnings.push(`店家「${id}」還沒有任何飲料（AGENTS.md §7-B）`);
}

report();

function report() {
  warnings.forEach((w) => console.log(`⚠️  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`❌ ${e}`));
    console.log(`\n共 ${errors.length} 個錯誤，請修正後再執行。`);
    process.exit(1);
  }
  console.log(`✅ 全部通過：${shops.length} 間店家、${drinks.length} 杯飲料${warnings.length ? `（${warnings.length} 個警告）` : ""}`);
  process.exit(0);
}
