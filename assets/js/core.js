const ShakeDex = (() => {
  const TOPPING_STYLES = {
    珍珠: { shape: "circle", size: 5, cls: "t-pearl" },
    波霸: { shape: "circle", size: 7, cls: "t-pearl" },
    白玉: { shape: "circle", size: 6, cls: "t-baiyu" },
    椰果: { shape: "square", size: 8, cls: "t-coconut" },
    仙草: { shape: "square", size: 10, cls: "t-grass" },
    布丁: { shape: "slab", size: 14, cls: "t-pudding" },
    蘆薈: { shape: "square", size: 9, cls: "t-aloe" },
    粉粿: { shape: "square", size: 10, cls: "t-fengguo" },
    寒天: { shape: "square", size: 7, cls: "t-agar" },
    奶蓋: { shape: "foam", size: 14, cls: "t-foam" }
  };
  const DEFAULT_TOPPING = { shape: "circle", size: 5, cls: "t-default" };
  const ICE_COUNT = { 去冰: 0, 微冰: 1, 少冰: 2, 正常冰: 3, 溫: 0, 熱: 0 };
  let cache = null;

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`無法讀取 ${path}（${res.status}）`);
    return res.json();
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  async function loadAll() {
    if (cache) return cache;
    const [drinksRaw, shopsRaw, options] = await Promise.all([
      fetchJSON("data/drinks.json"),
      fetchJSON("data/shops.json"),
      fetchJSON("data/options.json")
    ]);
    const shopMap = new Map(shopsRaw.map((s) => [s.id, { ...s }]));
    const drinks = [...drinksRaw]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((d, i) => ({
        ...d,
        dexNo: i + 1,
        total: average(options.dimensions.map((dim) => d.scores[dim.key])),
        shop: shopMap.get(d.shopId)
      }));
    const shops = shopsRaw.map((s) => {
      const own = drinks.filter((d) => d.shopId === s.id);
      return {
        ...s,
        drinks: own,
        count: own.length,
        avg: average(own.map((d) => d.total)),
        rebuyRate: own.length ? own.filter((d) => d.rebuy).length / own.length : 0
      };
    });
    cache = { drinks, shops, options, shopById: (id) => shops.find((s) => s.id === id) };
    return cache;
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function dexNo(n) {
    return `No.${String(n).padStart(3, "0")}`;
  }

  function score1(n) {
    return n.toFixed(1);
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function starsHTML(score) {
    const rounded = Math.round(score * 2) / 2;
    let html = "";
    for (let i = 1; i <= 5; i++) {
      const cls = rounded >= i ? "full" : rounded >= i - 0.5 ? "half" : "empty";
      html += `<span class="star star--${cls}">★</span>`;
    }
    return `<span class="stars" aria-label="${score1(score)} 顆星">${html}</span>`;
  }

  function seeded(seedText) {
    let h = 2166136261;
    for (const ch of seedText) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  function toppingLayer(name, bandTop, bandBottom, rand) {
    const style = TOPPING_STYLES[name] || DEFAULT_TOPPING;
    const s = style.size;
    let out = "";
    if (style.shape === "slab") {
      return `<rect class="${style.cls}" x="10" y="${bandTop}" width="100" height="${bandBottom - bandTop}"/>`;
    }
    for (let y = bandBottom - s; y >= bandTop; y -= s * 1.6) {
      for (let x = 22 + rand() * 6; x < 100; x += s * 2.1 + rand() * 4) {
        const jx = x + (rand() - 0.5) * 3;
        const jy = y + (rand() - 0.5) * 3;
        if (style.shape === "circle") {
          out += `<circle class="${style.cls}" cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="${s}"/>`;
        } else {
          const rot = ((rand() - 0.5) * 40).toFixed(0);
          out += `<rect class="${style.cls}" x="${(jx - s / 2).toFixed(1)}" y="${(jy - s / 2).toFixed(1)}" width="${s}" height="${s}" rx="2" transform="rotate(${rot} ${jx.toFixed(1)} ${jy.toFixed(1)})"/>`;
        }
      }
    }
    return out;
  }

  function cupSVG(drink) {
    const uid = `cup-${drink.id}-${Math.random().toString(36).slice(2, 7)}`;
    const rand = seeded(drink.id);
    const cupPath = "M18 38 L102 38 L92 150 Q91 156 85 156 L35 156 Q29 156 28 150 Z";
    const hasFoam = drink.toppings.includes("奶蓋");
    const layers = drink.toppings.filter((t) => t !== "奶蓋");
    const liquidTop = 46;
    let body = `<rect x="0" y="${liquidTop}" width="120" height="120" fill="${esc(drink.liquidColor)}"/>`;
    if (hasFoam) body += `<rect class="t-foam" x="0" y="${liquidTop}" width="120" height="14"/>`;
    const bandH = layers.length > 2 ? 15 : 20;
    layers.forEach((t, i) => {
      const bottom = 154 - i * bandH;
      body += toppingLayer(t, bottom - bandH, bottom, rand);
    });
    const ice = ICE_COUNT[drink.ice] ?? 0;
    const iceSpots = [[34, 64, -12], [62, 72, 10], [80, 58, -4]];
    for (let i = 0; i < ice; i++) {
      const [x, y, r] = iceSpots[i];
      body += `<rect class="cup-ice" x="${x}" y="${y}" width="18" height="18" rx="4" transform="rotate(${r} ${x + 9} ${y + 9})"/>`;
    }
    const steam = drink.ice === "溫" || drink.ice === "熱"
      ? `<g class="cup-steam"><path d="M42 26 q-6 -8 0 -14 q6 -6 0 -12"/><path d="M60 24 q-6 -8 0 -14 q6 -6 0 -12"/><path d="M78 26 q-6 -8 0 -14 q6 -6 0 -12"/></g>`
      : "";
    const straw = drink.shop ? esc(drink.shop.color) : "#c8814a";
    return `<svg class="cup" viewBox="0 0 120 160" role="img" aria-label="${esc(drink.name)} 插圖">
  <defs><clipPath id="${uid}"><path d="${cupPath}"/></clipPath></defs>
  ${steam}
  <rect x="66" y="2" width="9" height="70" rx="3" fill="${straw}" transform="rotate(12 70 40)"/>
  <g clip-path="url(#${uid})"><rect class="cup-glass" x="0" y="0" width="120" height="160"/>${body}</g>
  <path class="cup-shine" d="M26 50 L33 140"/>
  <path class="cup-outline" d="${cupPath}"/>
  <rect class="cup-lid" x="14" y="33" width="92" height="7" rx="3.5"/>
</svg>`;
  }

  function radarSVG(drink, dimensions) {
    const cx = 150, cy = 115, r = 72;
    const n = dimensions.length;
    const point = (i, v) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + Math.cos(a) * r * (v / 5), cy + Math.sin(a) * r * (v / 5)];
    };
    let grid = "";
    for (let lv = 1; lv <= 5; lv++) {
      const pts = dimensions.map((_, i) => point(i, lv).map((v) => v.toFixed(1)).join(",")).join(" ");
      grid += `<polygon class="radar-grid" points="${pts}"/>`;
    }
    const axes = dimensions.map((_, i) => {
      const [x, y] = point(i, 5);
      return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    }).join("");
    const shape = dimensions.map((d, i) => point(i, drink.scores[d.key]).map((v) => v.toFixed(1)).join(",")).join(" ");
    const dots = dimensions.map((d, i) => {
      const [x, y] = point(i, drink.scores[d.key]);
      return `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`;
    }).join("");
    const labels = dimensions.map((d, i) => {
      const [x, y] = point(i, 6.1);
      const anchor = Math.abs(x - cx) < 1 ? "middle" : x > cx ? "start" : "end";
      return `<text class="radar-label" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}">${esc(d.label)} ${drink.scores[d.key]}</text>`;
    }).join("");
    return `<svg class="radar" viewBox="0 0 300 230" role="img" aria-label="四項評分雷達圖">${grid}${axes}<polygon class="radar-shape" points="${shape}"/>${dots}${labels}</svg>`;
  }

  function shopIcon(shop, size = "md") {
    if (!shop) return "";
    const emoji = esc(shop.emoji);
    if (!shop.logo) return `<span class="shop-icon shop-icon--${size} is-emoji">${emoji}</span>`;
    return `<span class="shop-icon shop-icon--${size}" data-emoji="${emoji}"><img src="${esc(shop.logo)}" alt="${esc(shop.name)} logo" loading="lazy"></span>`;
  }

  function shopBadge(shop) {
    if (!shop) return "";
    return `<a class="shop-badge" href="shop.html?id=${encodeURIComponent(shop.id)}" data-shop-color="${esc(shop.color)}">${shopIcon(shop, "sm")}${esc(shop.name)}</a>`;
  }

  function drinkCardHTML(d) {
    return `<article class="drink-card">
  <a class="drink-card__link" href="drink.html?id=${encodeURIComponent(d.id)}" aria-label="${esc(d.name)}"></a>
  <div class="drink-card__art">${cupSVG(d)}</div>
  <div class="drink-card__body">
    <p class="drink-card__no">${dexNo(d.dexNo)}</p>
    <h3 class="drink-card__title">${esc(d.name)}</h3>
    ${shopBadge(d.shop)}
    <p class="drink-card__score"><strong>${score1(d.total)}</strong>${starsHTML(d.total)}</p>
    <p class="drink-card__tags"><span class="tag">${esc(d.sugar)}</span><span class="tag">${esc(d.ice)}</span><span class="tag tag--cat">${esc(d.category)}</span></p>
  </div>
  <span class="rebuy rebuy--${d.rebuy ? "yes" : "no"}">${d.rebuy ? "會回購" : "不回購"}</span>
</article>`;
  }

  function applyShopColors(root = document) {
    root.querySelectorAll("[data-shop-color]").forEach((el) => {
      el.style.setProperty("--shop", el.dataset.shopColor);
    });
  }

  function useEmojiFallback(img) {
    const box = img.parentElement;
    box.classList.add("is-emoji");
    box.textContent = box.dataset.emoji;
  }

  function bindLogoFallback(root = document) {
    root.querySelectorAll(".shop-icon img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) useEmojiFallback(img);
      else img.addEventListener("error", () => useEmojiFallback(img), { once: true });
    });
  }

  function enhance(root = document) {
    applyShopColors(root);
    bindLogoFallback(root);
  }

  function showError(container, message) {
    container.innerHTML = `<div class="empty"><p class="empty__emoji">🫗</p><p>${esc(message)}</p><a class="btn" href="index.html">回圖鑑首頁</a></div>`;
  }

  return { loadAll, esc, dexNo, score1, param, starsHTML, cupSVG, radarSVG, shopIcon, shopBadge, drinkCardHTML, enhance, showError, TOPPING_STYLES };
})();
