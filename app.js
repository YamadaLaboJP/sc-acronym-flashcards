(function () {
  const cardEl = document.getElementById("card");
  const acronymEl = document.getElementById("acronym");
  const answerEl = document.getElementById("answer");
  const formalEl = document.getElementById("formal");
  const definitionEl = document.getElementById("definition");
  const categoryEl = document.getElementById("category");
  const progressEl = document.getElementById("progress");
  const noteEl = document.getElementById("note");
  const liveEl = document.getElementById("live");

  const deck = Array.isArray(window.SC_ACRONYMS) ? window.SC_ACRONYMS : [];
  let queue = [];
  let cursor = 0;
  let revealed = false;
  let ready = false;

  function shuffle(indices, avoid) {
    const next = indices.slice();
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

  function startCycle(avoid) {
    queue = shuffle(deck.map(function (_, index) { return index; }), avoid);
    cursor = 0;
  }

  function current() {
    return deck[queue[cursor]];
  }

  function fail(message) {
    ready = false;
    cardEl.classList.add("is-error");
    cardEl.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-live");
    acronymEl.textContent = "表示できません";
    answerEl.hidden = true;
    categoryEl.hidden = true;
    categoryEl.textContent = "";
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
    categoryEl.hidden = false;
    categoryEl.textContent = item["分類"];
    answerEl.hidden = !revealed;
    progressEl.textContent = "この周回 " + (cursor + 1) + " / " + deck.length;
    noteEl.textContent = wrapped
      ? "一巡しました。順番をシャッフルして続けます。"
      : "同じ周回では、出た略語は繰り返しません。";

    liveEl.textContent = revealed
      ? item["略語"] + "。分類は " + item["分類"] + "。正式名称は " + item["正式名称"] + "。" + item["一言定義"]
      : item["略語"] + "。分類は " + item["分類"] + "。答えはまだ非表示です。";
  }

  function reveal() {
    if (!ready || revealed) return;
    revealed = true;
    render(false);
  }

  function advance() {
    if (!ready || !revealed) return;
    const previous = queue[cursor];
    revealed = false;
    if (cursor + 1 >= queue.length) {
      startCycle(previous);
      render(true);
      return;
    }
    cursor += 1;
    render(false);
  }

  function onActivate(event) {
    if (!ready) return;
    event.preventDefault();
    if (revealed) advance();
    else reveal();
  }

  document.addEventListener("click", onActivate);

  document.addEventListener("keydown", function (event) {
    if (!ready) return;
    if (event.key !== " " && event.key !== "Enter" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (revealed || event.key === "ArrowRight") {
      if (revealed) advance();
      else reveal();
    } else {
      reveal();
    }
  });

  if (!deck.length) {
    fail("用語データを読み込めませんでした。");
    return;
  }

  const invalid = deck.some(function (item) {
    return !item || !item["略語"] || !item["正式名称"] || !item["一言定義"] || !item["分類"];
  });
  if (invalid) {
    fail("用語データの列が足りません。");
    return;
  }

  ready = true;
  document.body.classList.add("is-live");
  startCycle(null);
  render(false);
})();
