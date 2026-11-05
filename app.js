(function () {
  const homeEl = document.getElementById("home");
  const quizEl = document.getElementById("quiz");
  const listEl = document.getElementById("list");
  const setupEl = document.getElementById("setup");
  const categorySelect = document.getElementById("category");
  const homeErrorEl = document.getElementById("home-error");
  const startBtn = document.getElementById("start");
  const glossaryBtn = document.getElementById("glossary");
  const backLink = document.getElementById("back-link");
  const cardEl = document.getElementById("card");
  const acronymEl = document.getElementById("acronym");
  const answerEl = document.getElementById("answer");
  const formalEl = document.getElementById("formal");
  const definitionEl = document.getElementById("definition");
  const categoryChipEl = document.getElementById("category-chip");
  const progressEl = document.getElementById("progress");
  const noteEl = document.getElementById("note");
  const liveEl = document.getElementById("live");
  const listMetaEl = document.getElementById("list-meta");
  const listBodyEl = document.getElementById("list-body");

  const deck = Array.isArray(window.SC_ACRONYMS) ? window.SC_ACRONYMS : [];
  let active = [];
  let orderMode = "abc";
  let cursor = 0;
  let revealed = false;
  let ready = false;
  let view = "home";

  function compareAcronym(a, b) {
    return String(a["略語"]).localeCompare(String(b["略語"]), "en", { sensitivity: "base" });
  }

  function sortAbc(items) {
    return items.slice().sort(compareAcronym);
  }

  function shuffle(items, avoid) {
    const next = items.slice();
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = next[i];
      next[i] = next[j];
      next[j] = swap;
    }
    if (avoid != null && next.length > 1 && next[0] === avoid) {
      const j = 1 + Math.floor(Math.random() * (next.length - 1));
      const swap = next[0];
      next[0] = next[j];
      next[j] = swap;
    }
    return next;
  }

  function selectedCategory() {
    return categorySelect.value || "すべて";
  }

  function selectedOrder() {
    const picked = setupEl.querySelector('input[name="order"]:checked');
    return picked && picked.value === "random" ? "random" : "abc";
  }

  function importantOnly() {
    const box = document.getElementById("important-only");
    return !!(box && box.checked);
  }

  function filteredItems() {
    const category = selectedCategory();
    const onlyImportant = importantOnly();
    return deck.filter(function (item) {
      if (category !== "すべて" && item["分類"] !== category) return false;
      if (onlyImportant && item["重要"] !== true) return false;
      return true;
    });
  }

  function showError(message) {
    homeErrorEl.hidden = false;
    homeErrorEl.textContent = message;
  }

  function clearError() {
    homeErrorEl.hidden = true;
    homeErrorEl.textContent = "";
  }

  function showView(name) {
    view = name;
    homeEl.hidden = name !== "home";
    quizEl.hidden = name !== "quiz";
    listEl.hidden = name !== "list";
    backLink.hidden = name === "home";
    document.body.classList.toggle("is-live", name === "quiz" && ready);
    document.body.classList.toggle("is-list", name === "list");
    if (name === "home") {
      ready = false;
      progressEl.textContent = deck.length ? deck.length + "語" : "";
    }
  }

  function fillCategories() {
    const seen = [];
    deck.forEach(function (item) {
      const name = item && item["分類"];
      if (name && seen.indexOf(name) === -1) seen.push(name);
    });
    seen.sort(function (a, b) {
      return a.localeCompare(b, "ja");
    });

    categorySelect.replaceChildren();
    const all = document.createElement("option");
    all.value = "すべて";
    all.textContent = "すべて";
    all.selected = true;
    categorySelect.appendChild(all);
    seen.forEach(function (name) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      categorySelect.appendChild(option);
    });
  }

  function current() {
    return active[cursor];
  }

  function fail(message) {
    ready = false;
    document.body.classList.remove("is-live");
    cardEl.classList.add("is-error");
    cardEl.setAttribute("aria-expanded", "false");
    acronymEl.textContent = "表示できません";
    answerEl.hidden = true;
    categoryChipEl.hidden = true;
    categoryChipEl.textContent = "";
    progressEl.textContent = "データなし";
    noteEl.textContent = message;
    liveEl.textContent = message;
  }

  function render(wrapped) {
    const item = current();
    if (!item) {
      fail("用語がありません。data.js を確認してください。");
      return;
    }

    cardEl.classList.toggle("is-open", revealed);
    cardEl.classList.remove("is-error");
    cardEl.setAttribute("aria-expanded", revealed ? "true" : "false");
    acronymEl.textContent = item["略語"];
    formalEl.textContent = item["正式名称"];
    definitionEl.textContent = item["一言定義"];
    categoryChipEl.hidden = false;
    categoryChipEl.textContent = item["分類"];
    answerEl.hidden = !revealed;
    progressEl.textContent = "この周回 " + (cursor + 1) + " / " + active.length;
    if (wrapped && orderMode === "abc") {
      noteEl.textContent = "一巡しました。ABC順のまま続けます。";
    } else if (wrapped) {
      noteEl.textContent = "一巡しました。順番をシャッフルして続けます。";
    } else {
      noteEl.textContent = "同じ周回では、出た略語は繰り返しません。";
    }

    liveEl.textContent = revealed
      ? item["略語"] + "。分類は " + item["分類"] + "。正式名称は " + item["正式名称"] + "。" + item["一言定義"]
      : item["略語"] + "。分類は " + item["分類"] + "。答えはまだ非表示です。";
  }

  function reveal() {
    if (!ready || revealed || view !== "quiz") return;
    revealed = true;
    render(false);
  }

  function restartCycle(previous) {
    if (orderMode === "random") {
      active = shuffle(active, previous);
    }
    cursor = 0;
    revealed = false;
    render(true);
  }

  function advance() {
    if (!ready || !revealed || view !== "quiz") return;
    const previous = active[cursor];
    revealed = false;
    if (cursor + 1 >= active.length) {
      restartCycle(previous);
      return;
    }
    cursor += 1;
    render(false);
  }

  function beginQuiz() {
    const items = filteredItems();
    if (!items.length) {
      showView("home");
      showError("該当する用語がありません");
      return;
    }
    clearError();
    orderMode = selectedOrder();
    active = orderMode === "abc" ? sortAbc(items) : shuffle(items, null);
    cursor = 0;
    revealed = false;
    ready = true;
    showView("quiz");
    render(false);
  }

  function showGlossary() {
    const items = filteredItems();
    if (!items.length) {
      showView("home");
      showError("該当する用語がありません");
      return;
    }
    clearError();
    ready = false;

    const grouped = new Map();
    items.forEach(function (item) {
      const name = item["分類"];
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(item);
    });

    const category = selectedCategory();
    const names = category === "すべて"
      ? Array.from(grouped.keys()).sort(function (a, b) {
          return a.localeCompare(b, "ja");
        })
      : [category];

    listBodyEl.replaceChildren();
    names.forEach(function (name) {
      const group = sortAbc(grouped.get(name) || []);
      if (!group.length) return;
      const section = document.createElement("section");
      section.className = "gloss-section";
      const heading = document.createElement("h2");
      heading.className = "gloss-heading";
      heading.textContent = name;
      const list = document.createElement("ul");
      list.className = "gloss-list";
      group.forEach(function (item) {
        const entry = document.createElement("li");
        const abbr = document.createElement("p");
        abbr.className = "gloss-abbr";
        abbr.textContent = item["略語"];
        const formal = document.createElement("p");
        formal.className = "gloss-formal";
        formal.textContent = item["正式名称"];
        const definition = document.createElement("p");
        definition.className = "gloss-def";
        definition.textContent = item["一言定義"];
        entry.append(abbr, formal, definition);
        list.appendChild(entry);
      });
      section.append(heading, list);
      listBodyEl.appendChild(section);
    });

    listMetaEl.textContent = category + " · " + items.length + "語 · ABC順";
    progressEl.textContent = items.length + "語";
    showView("list");
    liveEl.textContent = category + "の用語一覧、" + items.length + "語です。";
  }

  function showHome() {
    clearError();
    showView("home");
    liveEl.textContent = "";
  }

  document.querySelectorAll("[data-back]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      showHome();
    });
  });

  setupEl.addEventListener("submit", function (event) {
    event.preventDefault();
    event.stopPropagation();
    beginQuiz();
  });

  glossaryBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    showGlossary();
  });

  categorySelect.addEventListener("change", clearError);
  document.getElementById("important-only").addEventListener("change", clearError);

  document.addEventListener("click", function (event) {
    if (view !== "quiz" || !ready) return;
    if (event.target.closest("a, button, input, select, label")) return;
    event.preventDefault();
    if (revealed) advance();
    else reveal();
  });

  document.addEventListener("keydown", function (event) {
    if (view !== "quiz" || !ready) return;
    const tag = event.target && event.target.tagName;
    if (tag === "A" || tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (event.key !== " " && event.key !== "Enter" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (revealed || event.key === "ArrowRight") {
      if (revealed) advance();
      else reveal();
    } else {
      reveal();
    }
  });

  fillCategories();
  showView("home");

  if (!deck.length) {
    showError("用語データを読み込めませんでした。");
    startBtn.disabled = true;
    glossaryBtn.disabled = true;
    return;
  }

  const invalid = deck.some(function (item) {
    return !item || !item["略語"] || !item["正式名称"] || !item["一言定義"] || !item["分類"] || typeof item["重要"] !== "boolean";
  });
  if (invalid) {
    showError("用語データの列が足りません。");
    startBtn.disabled = true;
    glossaryBtn.disabled = true;
  }
})();
