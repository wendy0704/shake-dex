(() => {
  const { loadAll, esc, dexNo, score1, param, starsHTML, cupSVG, radarSVG, shopIcon, shopBadge, drinkCardHTML, enhance, showError } = ShakeDex;

  const SORTS = {
    newest: { label: "最新喝的", fn: (a, b) => b.dexNo - a.dexNo },
    score: { label: "總分最高", fn: (a, b) => b.total - a.total || b.dexNo - a.dexNo },
    value: { label: "CP 值最高", fn: (a, b) => b.scores.value - a.scores.value || b.total - a.total },
    cheap: { label: "價格最低", fn: (a, b) => a.price - b.price || b.total - a.total },
    dex: { label: "圖鑑編號", fn: (a, b) => a.dexNo - b.dexNo }
  };

  async function renderIndexPage(main) {
    const { drinks, shops, options } = await loadAll();
    const avgAll = drinks.length ? drinks.reduce((s, d) => s + d.total, 0) / drinks.length : 0;
    const rebuy = drinks.length ? Math.round((drinks.filter((d) => d.rebuy).length / drinks.length) * 100) : 0;
    const state = { q: "", category: "全部", shop: "all", sort: "newest" };

    main.innerHTML = `
<section class="hero">
  <div class="hero__text">
    <p class="hero__kicker">手搖飲收集冊</p>
    <h1 class="hero__title">搖搖圖鑑</h1>
    <p class="hero__lead">每一杯都用同一套標準評分：風味、甜度平衡、口感、CP 值。<br>喝過的都收進來，下次點飲料不用再賭運氣。</p>
  </div>
  <dl class="stats">
    <div><dt>收集杯數</dt><dd>${drinks.length}</dd></div>
    <div><dt>店家</dt><dd>${shops.length}</dd></div>
    <div><dt>平均分</dt><dd>${score1(avgAll)}</dd></div>
    <div><dt>回購率</dt><dd>${rebuy}%</dd></div>
  </dl>
</section>
<section class="controls" aria-label="篩選與排序">
  <input class="controls__search" type="search" placeholder="搜尋品名、店家或短評…" aria-label="搜尋">
  <div class="chips" role="group" aria-label="分類">
    ${["全部", ...options.categories].map((c) => `<button class="chip${c === "全部" ? " is-active" : ""}" data-category="${esc(c)}">${esc(c)}</button>`).join("")}
  </div>
  <div class="controls__row">
    <label>店家
      <select class="controls__shop">
        <option value="all">全部店家</option>
        ${shops.map((s) => `<option value="${esc(s.id)}">${esc(s.emoji)} ${esc(s.name)}</option>`).join("")}
      </select>
    </label>
    <label>排序
      <select class="controls__sort">
        ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
      </select>
    </label>
    <p class="controls__count"></p>
  </div>
</section>
<section class="grid" aria-live="polite"></section>
<section class="shops" id="shops">
  <h2 class="section-title">店家一覽</h2>
  <div class="shop-list">
    ${shops.map((s) => `
    <a class="shop-tile" href="shop.html?id=${encodeURIComponent(s.id)}" data-shop-color="${esc(s.color)}">
      ${shopIcon(s, "md")}
      <span class="shop-tile__name">${esc(s.name)}</span>
      <span class="shop-tile__meta">${s.count} 杯 · 平均 ${score1(s.avg)}</span>
    </a>`).join("")}
  </div>
</section>`;

    const grid = main.querySelector(".grid");
    const count = main.querySelector(".controls__count");

    function update() {
      const q = state.q.trim().toLowerCase();
      const list = drinks
        .filter((d) => state.category === "全部" || d.category === state.category)
        .filter((d) => state.shop === "all" || d.shopId === state.shop)
        .filter((d) => !q || [d.name, d.shop?.name, d.comment, ...d.toppings].join(" ").toLowerCase().includes(q))
        .sort(SORTS[state.sort].fn);
      count.textContent = `共 ${list.length} 杯`;
      grid.innerHTML = list.length
        ? list.map(drinkCardHTML).join("")
        : `<div class="empty"><p class="empty__emoji">🧊</p><p>沒有符合條件的飲料</p></div>`;
      enhance(grid);
    }

    main.querySelector(".controls__search").addEventListener("input", (e) => { state.q = e.target.value; update(); });
    main.querySelector(".controls__shop").addEventListener("change", (e) => { state.shop = e.target.value; update(); });
    main.querySelector(".controls__sort").addEventListener("change", (e) => { state.sort = e.target.value; update(); });
    main.querySelectorAll(".chip").forEach((btn) => btn.addEventListener("click", () => {
      main.querySelectorAll(".chip").forEach((b) => b.classList.toggle("is-active", b === btn));
      state.category = btn.dataset.category;
      update();
    }));
    enhance(main);
    update();
  }

  async function renderShopPage(main) {
    const { shopById, shops } = await loadAll();
    const shop = shopById(param("id"));
    if (!shop) return showError(main, "找不到這間店家，可能是網址打錯了。");
    document.title = `${shop.name}｜搖搖圖鑑`;
    const ranked = [...shop.drinks].sort((a, b) => b.total - a.total);
    main.innerHTML = `
<section class="shop-hero" data-shop-color="${esc(shop.color)}">
  ${shopIcon(shop, "lg")}
  <div>
    <h1 class="shop-hero__name">${esc(shop.name)}</h1>
    <p class="shop-hero__intro">${esc(shop.intro)}</p>
  </div>
  <dl class="stats stats--compact">
    <div><dt>收集</dt><dd>${shop.count} 杯</dd></div>
    <div><dt>平均分</dt><dd>${score1(shop.avg)}</dd></div>
    <div><dt>回購率</dt><dd>${Math.round(shop.rebuyRate * 100)}%</dd></div>
  </dl>
</section>
<h2 class="section-title">這間店喝過的（依總分排序）</h2>
<section class="grid">${ranked.length ? ranked.map(drinkCardHTML).join("") : `<div class="empty"><p class="empty__emoji">🫙</p><p>還沒收集這間店的飲料</p></div>`}</section>
<h2 class="section-title">其他店家</h2>
<div class="shop-list">
  ${shops.filter((s) => s.id !== shop.id).map((s) => `
  <a class="shop-tile" href="shop.html?id=${encodeURIComponent(s.id)}" data-shop-color="${esc(s.color)}">
    ${shopIcon(s, "md")}
    <span class="shop-tile__name">${esc(s.name)}</span>
    <span class="shop-tile__meta">${s.count} 杯 · 平均 ${score1(s.avg)}</span>
  </a>`).join("")}
</div>`;
    enhance(main);
  }

  async function renderDrinkPage(main) {
    const { drinks, options } = await loadAll();
    const idx = drinks.findIndex((d) => d.id === param("id"));
    if (idx < 0) return showError(main, "找不到這杯飲料，可能是網址打錯了。");
    const d = drinks[idx];
    const prev = drinks[idx - 1];
    const next = drinks[idx + 1];
    document.title = `${d.name}｜${d.shop?.name ?? ""}｜搖搖圖鑑`;
    main.innerHTML = `
<article class="drink-detail">
  <div class="drink-detail__art" data-shop-color="${esc(d.shop?.color ?? "")}">${cupSVG(d)}</div>
  <div class="drink-detail__info">
    <p class="drink-card__no">${dexNo(d.dexNo)}</p>
    <h1 class="drink-detail__title">${esc(d.name)}</h1>
    ${shopBadge(d.shop)}
    <p class="drink-detail__score"><strong>${score1(d.total)}</strong>${starsHTML(d.total)}<span class="rebuy rebuy--inline rebuy--${d.rebuy ? "yes" : "no"}">${d.rebuy ? "會回購" : "不回購"}</span></p>
    <blockquote class="drink-detail__comment">${esc(d.comment)}</blockquote>
    <dl class="spec">
      <div><dt>分類</dt><dd>${esc(d.category)}</dd></div>
      <div><dt>價格</dt><dd>${d.price} 元</dd></div>
      <div><dt>甜度</dt><dd>${esc(d.sugar)}</dd></div>
      <div><dt>冰塊</dt><dd>${esc(d.ice)}</dd></div>
      <div><dt>配料</dt><dd>${d.toppings.length ? d.toppings.map(esc).join("、") : "無"}</dd></div>
      <div><dt>喝的日期</dt><dd>${esc(d.date)}</dd></div>
    </dl>
  </div>
  <section class="drink-detail__radar">
    <h2 class="section-title">四項評分</h2>
    ${radarSVG(d, options.dimensions)}
    <ul class="dim-list">
      ${options.dimensions.map((dim) => `<li><span>${esc(dim.label)}</span><span class="dim-list__bar"><span class="dim-list__fill dim-list__fill--${d.scores[dim.key]}"></span></span><b>${d.scores[dim.key]}</b></li>`).join("")}
    </ul>
  </section>
</article>
<nav class="pager" aria-label="上一杯與下一杯">
  ${prev ? `<a class="pager__link" href="drink.html?id=${encodeURIComponent(prev.id)}">← ${dexNo(prev.dexNo)} ${esc(prev.name)}</a>` : "<span></span>"}
  ${next ? `<a class="pager__link pager__link--next" href="drink.html?id=${encodeURIComponent(next.id)}">${dexNo(next.dexNo)} ${esc(next.name)} →</a>` : "<span></span>"}
</nav>`;
    enhance(main);
  }

  async function renderAboutPage(main) {
    const { options, drinks } = await loadAll();
    const sample = drinks[drinks.length - 1];
    main.innerHTML = `
<section class="prose">
  <h1 class="page-title">評分標準</h1>
  <p>搖搖圖鑑的每一杯飲料都用同一套規則評分，所以不同店家之間可以直接比較。總分是下面四個維度的平均，由網站自動計算。</p>

  <h2 class="section-title">四個評分維度</h2>
  <div class="dim-cards">
    ${options.dimensions.map((d) => `<div class="dim-card"><h3>${esc(d.label)}</h3><p>${esc(d.desc)}</p></div>`).join("")}
  </div>

  <h2 class="section-title">分數代表什麼</h2>
  <table class="scale">
    <thead><tr><th>分數</th><th>稱號</th><th>意思</th></tr></thead>
    <tbody>${options.scale.map((s) => `<tr><td>${starsHTML(s.score)}</td><td><b>${esc(s.label)}</b></td><td>${esc(s.desc)}</td></tr>`).join("")}</tbody>
  </table>

  <h2 class="section-title">收錄選項</h2>
  <dl class="option-groups">
    <div><dt>分類</dt><dd>${options.categories.map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</dd></div>
    <div><dt>甜度</dt><dd>${options.sugar.map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</dd></div>
    <div><dt>冰塊</dt><dd>${options.ice.map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</dd></div>
    <div><dt>配料</dt><dd>${options.toppings.map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</dd></div>
  </dl>

  ${sample ? `<h2 class="section-title">杯子插圖怎麼畫的</h2>
  <div class="art-explain">
    <div class="art-explain__cup" data-shop-color="${esc(sample.shop?.color ?? "")}">${cupSVG(sample)}</div>
    <ul>
      <li>飲料顏色來自每筆資料的 <code>liquidColor</code></li>
      <li>冰塊數量依冰度：微冰 1 顆、少冰 2 顆、正常冰 3 顆</li>
      <li>配料依種類畫在杯底，奶蓋浮在最上層</li>
      <li>吸管顏色是店家代表色；溫、熱飲會冒蒸氣</li>
    </ul>
  </div>` : ""}
</section>`;
    enhance(main);
  }

  const PAGES = {
    index: renderIndexPage,
    shop: renderShopPage,
    drink: renderDrinkPage,
    about: renderAboutPage
  };

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main");
    const render = PAGES[document.body.dataset.page];
    if (!render) return;
    render(main).catch((err) => {
      console.error(err);
      showError(main, location.protocol === "file:"
        ? "請用本機伺服器開啟網站（python3 -m http.server），直接點兩下 HTML 檔無法讀取資料。"
        : `資料讀取失敗：${err.message}`);
    });
  });
})();
