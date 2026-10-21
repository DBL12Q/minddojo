/* ============================================================
   思维塾 MindDojo · 应用逻辑
   纯前端：hash 路由 + localStorage 本地存储
   ============================================================ */

(() => {
  "use strict";

  /* ---------- 状态存储 ---------- */
  const LS = {
    done: "mw_done",      // 练习打卡集合：toolId|idx -> 1
    todo: "mw_todo",      // 工具待做：toolId -> 1
    fav: "mw_fav",        // 收藏：toolId -> 1
    doneTool: "mw_doneTool", // 工具已做到：toolId -> 1
    quizBest: "mw_quizBest", // 检测最佳成绩
    quizTotal: "mw_quizTotal" // 检测完成次数
  };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const st = {
    done: store.get(LS.done),
    todo: store.get(LS.todo),
    fav: store.get(LS.fav),
    doneTool: store.get(LS.doneTool)
  };
  const save = () => {
    store.set(LS.done, st.done);
    store.set(LS.todo, st.todo);
    store.set(LS.fav, st.fav);
    store.set(LS.doneTool, st.doneTool);
  };

  /* ---------- 工具函数 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const boardOf = (id) => BOARDS.find((b) => b.id === id);
  const toolOf = (id) => TOOLS.find((t) => t.id === id);

  /* 日期种子（每日一练固定） */
  function daySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function seededRand(seed) {
    let x = seed % 2147483647;
    if (x <= 0) x += 2147483646;
    return () => {
      x = (x * 16807) % 2147483647;
      return (x - 1) / 2147483646;
    };
  }

  /* ---------- 进度计算 ---------- */
  function practiceCount(tool) {
    return tool.practices.filter((_, i) => st.done[tool.id + "|" + i]).length;
  }
  function toolProgress(tool) {
    const total = tool.practices.length || 1;
    return practiceCount(tool) / total;
  }
  function boardProgress(bid) {
    const tools = TOOLS.filter((t) => t.board === bid);
    if (!tools.length) return 0;
    return tools.reduce((s, t) => s + toolProgress(t), 0) / tools.length;
  }
  function totalProgress() {
    if (!TOOLS.length) return 0;
    return TOOLS.reduce((s, t) => s + toolProgress(t), 0) / TOOLS.length;
  }
  const pct = (x) => Math.round(x * 100);

  /* ---------- 路由 ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    return { page: parts[0] || "home", id: parts[1] || "" };
  }

  function navTo(page, id) {
    location.hash = "#/" + (id ? page + "/" + id : page);
  }

  /* ---------- 页面渲染 ---------- */
  const page = $("#page");

  function render() {
    const { page: p, id } = parseHash();
    let html = "";
    switch (p) {
      case "tools": html = renderTools(); break;
      case "tool": html = renderTool(id); break;
      case "daily": html = renderDaily(); break;
      case "quiz": html = renderQuiz(); break;
      case "mine": html = renderMine(); break;
      case "about": html = renderAbout(); break;
      default: html = renderHome();
    }
    page.innerHTML = html;
    highlightNav(p);
    bindPage(p);
    window.scrollTo(0, 0);
  }

  function highlightNav(p) {
    const map = { home: "home", tools: "tools", tool: "tools", daily: "daily", quiz: "quiz", mine: "mine", about: "mine" };
    const active = map[p] || "home";
    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.nav === active);
    });
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    const total = pct(totalProgress());
    const boardRows = BOARDS.map((b) => {
      const v = pct(boardProgress(b.id));
      return `<div class="board-progress">
        <div class="row"><span>${esc(b.n)} ${esc(b.name)}</span><span class="muted">${v}%</span></div>
        <div class="bar"><i style="width:${v}%"></i></div>
      </div>`;
    }).join("");

    /* 每日一练卡片 */
    const rnd = seededRand(daySeed());
    const t = TOOLS[Math.floor(rnd() * TOOLS.length)];
    const pIdx = Math.floor(rnd() * t.practices.length);
    const p = t.practices[pIdx];
    const doneToday = !!st.done[t.id + "|" + pIdx];

    return `
      <div class="hero">
        <div class="slogan">${esc(SITE.slogan)}</div>
        <div class="sub">把《逻辑思维》里的思维工具，练成你自己的本能。每天一个练习，越用越聪明。</div>
      </div>

      <div class="entry-grid">
        <div class="entry" data-go="tools"><span class="ico">🧰</span><span class="t">工具地图</span></div>
        <div class="entry" data-go="daily"><span class="ico">🎯</span><span class="t">每日一练</span></div>
        <div class="entry" data-go="quiz"><span class="ico">🛡️</span><span class="t">陷阱检测</span></div>
      </div>

      <div class="card">
        <div class="h3">今日练习</div>
        <div class="muted" style="margin:4px 0 10px">随机抽取 · ${esc(SITE.updated)}</div>
        <div class="daily-box">
          <div class="tool-name">${esc(t.name)}</div>
          <div class="p-text">${esc(p.text)}</div>
          ${doneToday ? '<div class="done-note">✅ 今天已练过这个练习，明天再来。</div>'
            : `<button class="btn block" data-do="${t.id}|${pIdx}" data-daily="1">标记完成</button>`}
        </div>
      </div>

      <div class="card">
        <div class="h2" style="margin-top:0">我的进度</div>
        <div class="board-progress">
          <div class="row"><span><strong>总进度</strong></span><span class="muted">${total}%</span></div>
          <div class="bar"><i style="width:${total}%"></i></div>
        </div>
        <div class="divider"></div>
        ${boardRows}
        <div class="mt12"><button class="btn ghost block" data-go="mine">查看我的清单</button></div>
      </div>
    `;
  }

  /* ---------- 工具地图 ---------- */
  function renderTools() {
    const blocks = BOARDS.map((b) => {
      const tools = TOOLS.filter((t) => t.board === b.id);
      const cards = tools.map((t) => {
        const marks = [];
        if (st.doneTool[t.id]) marks.push('<span class="tag done">已做到</span>');
        if (st.todo[t.id]) marks.push('<span class="tag todo">待做</span>');
        const pc = practiceCount(t);
        const pt = t.practices.length;
        const markHtml = marks.length ? `<div class="marks">${marks.join("")}${pc>0?`<span class="tag">练习 ${pc}/${pt}</span>`:""}</div>` : "";
        return `<div class="tool-card" data-tool="${t.id}">
          <div class="num">${t.id.slice(1)}</div>
          <div class="body">
            <div class="name">${esc(t.name)}</div>
            <div class="def">${esc(t.def)}</div>
            ${markHtml}
          </div>
        </div>`;
      }).join("");
      const v = pct(boardProgress(b.id));
      return `<div class="board-head"><span class="n">${b.n}</span>${esc(b.name)}<span class="muted small" style="margin-left:auto">${esc(b.books)} · ${v}%</span></div>${cards}`;
    }).join("");

    return `
      <div class="h1">工具地图</div>
      <div class="sub">30 个思维工具，六个板块。点击任意工具开始练习。</div>
      ${blocks}
    `;
  }

  /* ---------- 工具详情 ---------- */
  function renderTool(id) {
    const t = toolOf(id);
    if (!t) return '<div class="card center">没有这个工具。<br><button class="btn mt12" data-go="tools">返回工具地图</button></div>';
    const b = boardOf(t.board);
    const doneTool = !!st.doneTool[t.id];
    const todo = !!st.todo[t.id];
    const fav = !!st.fav[t.id];

    const practices = t.practices.map((p, i) => {
      const d = !!st.done[t.id + "|" + i];
      return `<div class="practice ${d ? "done" : ""}">
        <span class="lv">${esc(p.level)}练习</span>
        <div class="p-text">${esc(p.text)}</div>
        ${d ? '<button data-undo="' + t.id + "|" + i + '">已练过 ✓ 取消</button>'
            : '<button data-do="' + t.id + "|" + i + '">标记完成</button>'}
      </div>`;
    }).join("");

    return `
      <div class="card detail">
        <div class="muted" style="margin-bottom:4px">${esc(b.n)} ${esc(b.name)} · ${esc(b.books)}</div>
        <div class="h1" style="margin-bottom:8px">${esc(t.name)}</div>
        <div class="def-big">${esc(t.def)}</div>
      </div>

      <div class="card detail">
        <div class="field"><div class="label">生活中的例子</div><p class="body">${esc(t.example)}</p></div>
        <div class="field"><div class="label">什么时候用</div><p class="body small">${esc(t.whenUse)}</p></div>
        <div class="field"><div class="label">什么时候别用</div><p class="body small">${esc(t.whenNot)}</p></div>
      </div>

      <div class="card detail">
        <div class="h2" style="margin-top:0">练习区</div>
        ${practices}
      </div>

      <div class="card">
        <div class="h3">我的标记</div>
        <div class="mark-row">
          <button class="mark-btn ${doneTool ? "on" : ""}" data-mark="doneTool" data-t="${t.id}">✅ 已做到</button>
          <button class="mark-btn ${todo ? "on" : ""}" data-mark="todo" data-t="${t.id}">📌 加入待做</button>
          <button class="mark-btn fav ${fav ? "on" : ""}" data-mark="fav" data-t="${t.id}">⭐ 收藏</button>
        </div>
        <div class="muted mt8">已做到记 1 分，待做记 0.4 分，未标记记 0 分；练习完成单独计数。</div>
      </div>
    `;
  }

  /* ---------- 每日一练 ---------- */
  function renderDaily() {
    const rnd = seededRand(daySeed());
    const t = TOOLS[Math.floor(rnd() * TOOLS.length)];
    const pIdx = Math.floor(rnd() * t.practices.length);
    const p = t.practices[pIdx];
    const doneToday = !!st.done[t.id + "|" + pIdx];

    const history = [];
    for (const k of Object.keys(st.done)) {
      if (!st.done[k]) continue;
      const [tid, idx] = k.split("|");
      const tool = toolOf(tid);
      if (tool && tool.practices[+idx]) {
        history.push({ tool, p: tool.practices[+idx] });
      }
    }

    return `
      <div class="h1">每日一练</div>
      <div class="sub">每天一个思维练习，练完打个勾。今天没抽到想练的？刷新换不了——明天再来。</div>

      <div class="card">
        <div class="daily-box">
          <div class="muted" style="margin-bottom:8px">今日抽取 · ${esc(SITE.updated)}</div>
          <div class="tool-name">${esc(t.name)}</div>
          <div class="p-text">${esc(p.text)}</div>
          <div class="meta">${esc(t.def)}</div>
          ${doneToday ? '<div class="done-note">✅ 今天已完成，明天见。</div>'
            : `<button class="btn block" data-do="${t.id}|${pIdx}" data-daily="1">标记完成</button>`}
          <div class="mt12"><button class="btn ghost block" data-tool="${t.id}">查看这个工具的完整卡片</button></div>
        </div>
      </div>

      <div class="card">
        <div class="h2" style="margin-top:0">我的练习历史（${history.length}）</div>
        ${history.length ? history.slice().reverse().map((h) =>
          `<div class="practice done"><span class="lv">${esc(h.tool.name)}</span>
           <div class="p-text small">${esc(h.p.text)}</div></div>`).join("")
          : '<div class="muted">还没有完成过练习。从今天这个开始吧。</div>'}
      </div>
    `;
  }

  /* ---------- 陷阱检测 ---------- */
  function renderQuiz() {
    const best = store.get(LS.quizBest);
    const total = store.get(LS.quizTotal);
    return `
      <div class="h1">陷阱检测</div>
      <div class="sub">20 道场景题，测一测你能识破多少个思维陷阱。做完出成绩单。</div>
      <div class="card center">
        <div class="score-big" style="color:var(--ink)">${QUIZ.length}</div>
        <div class="score-label">题库共 ${QUIZ.length} 道 · 每次随机抽 20 道</div>
        ${best && best.score != null ? `<div class="muted" style="margin:6px 0">最佳成绩：${best.score} / ${best.total}（${best.pct}%）· 已完成 ${total || 0} 次</div>` : ""}
        <button class="btn block mt12" data-startquiz="1">开始检测</button>
      </div>
    `;
  }

  function renderQuizRun() {
    const count = Math.min(20, QUIZ.length);
    const idxs = [];
    const rnd = seededRand(Date.now() % 100000);
    while (idxs.length < count) {
      const i = Math.floor(rnd() * QUIZ.length);
      if (!idxs.includes(i)) idxs.push(i);
    }
    sessionStorage.setItem("mw_quiz_idx", JSON.stringify(idxs));
    sessionStorage.setItem("mw_quiz_pos", "0");
    sessionStorage.setItem("mw_quiz_correct", "0");
    renderQuizQ();
  }

  function renderQuizQ() {
    const idxs = JSON.parse(sessionStorage.getItem("mw_quiz_idx") || "[]");
    const pos = +sessionStorage.getItem("mw_quiz_pos") || 0;
    const correct = +sessionStorage.getItem("mw_quiz_correct") || 0;
    if (pos >= idxs.length) return renderQuizResult();

    const item = QUIZ[idxs[pos]];
    const opts = item.opts.map((o, i) =>
      `<button class="quiz-opt" data-opt="${i}">${esc(o)}</button>`).join("");

    page.innerHTML = `
      <div class="card">
        <div class="muted" style="margin-bottom:6px">第 ${pos + 1} / ${idxs.length} 题 · 已对 ${correct} 题</div>
        <div class="quiz-q">${esc(item.q)}</div>
        ${opts}
        <div class="quiz-expl hidden" data-expl></div>
        <button class="btn ghost block hidden" data-nextq="1">下一题</button>
      </div>`;
  }

  function answerQuiz(optIdx) {
    const idxs = JSON.parse(sessionStorage.getItem("mw_quiz_idx") || "[]");
    const pos = +sessionStorage.getItem("mw_quiz_pos") || 0;
    const item = QUIZ[idxs[pos]];
    const correct = item.a === optIdx;
    if (correct) sessionStorage.setItem("mw_quiz_correct", String(+sessionStorage.getItem("mw_quiz_correct") + 1));

    page.querySelectorAll(".quiz-opt").forEach((b, i) => {
      const idx = +b.dataset.opt;
      b.disabled = true;
      if (i === item.a) b.classList.add("correct");
      else if (idx === optIdx) b.classList.add("wrong");
    });
    const expl = page.querySelector("[data-expl]");
    expl.textContent = (correct ? "✅ 答对了。" : "❌ 答错了。") + item.expl;
    expl.classList.remove("hidden");
    const next = page.querySelector("[data-nextq]");
    next.classList.remove("hidden");
    sessionStorage.setItem("mw_quiz_pos", String(pos + 1));
  }

  function renderQuizResult() {
    const correct = +sessionStorage.getItem("mw_quiz_correct") || 0;
    const idxs = JSON.parse(sessionStorage.getItem("mw_quiz_idx") || "[]");
    const total = idxs.length;
    const p = Math.round((correct / total) * 100);
    const best = store.get(LS.quizBest);
    if (!best || p > best.pct) {
      store.set(LS.quizBest, { score: correct, total, pct: p });
    }
    store.set(LS.quizTotal, (store.get(LS.quizTotal) || 0) + 1);

    const tip = p >= 90 ? "思维敏锐！陷阱很难骗过你。" :
                p >= 70 ? "不错，已识破大部分陷阱。" :
                p >= 50 ? "及格线附近，多练练工具卡。" :
                "陷阱很多，从工具地图从头练起吧。";
    const share = `我在思维塾 MindDojo 的陷阱检测中答对 ${correct}/${total} 题（${p}%）。你也来测测？${location.origin}${location.pathname}#/quiz`;

    page.innerHTML = `
      <div class="card center">
        <div class="score-big">${correct}<span style="font-size:20px;color:var(--ink-3)">/${total}</span></div>
        <div class="score-label">${p}% · ${tip}</div>
        <button class="btn block share-btn" data-copy="${esc(share)}">复制成绩单分享</button>
        <div class="mt12"><button class="btn ghost block" data-requiz="1">再测一次</button></div>
      </div>
      <div class="card">
        <div class="h2" style="margin-top:0">想提高？从这几个工具开始</div>
        <div class="tool-card" data-tool="t13"><div class="num">13</div><div class="body"><div class="name">相关≠因果</div><div class="def">两件事一起涨落，不一定是谁导致了谁。</div></div></div>
        <div class="tool-card" data-tool="t05"><div class="num">05</div><div class="body"><div class="name">沉没成本</div><div class="def">已经付出且收不回来的成本，不该影响现在的决定。</div></div></div>
        <div class="tool-card" data-tool="t27"><div class="num">27</div><div class="body"><div class="name">可证伪性</div><div class="def">好理论说得出什么证据能证明它错了。</div></div></div>
      </div>`;
  }

  /* ---------- 我的 ---------- */
  function renderMine() {
    const total = pct(totalProgress());
    const doneTools = Object.keys(st.doneTool).length;
    const todoTools = Object.keys(st.todo).length;
    const favTools = Object.keys(st.fav).length;
    const donePractices = Object.keys(st.done).length;
    const best = store.get(LS.quizBest);
    const quizTotal = store.get(LS.quizTotal) || 0;

    const boardRows = BOARDS.map((b) => {
      const v = pct(boardProgress(b.id));
      const n = TOOLS.filter((t) => t.board === b.id).length;
      return `<div class="board-progress"><div class="row"><span>${esc(b.n)} ${esc(b.name)}（${n} 个工具）</span><span class="muted">${v}%</span></div>
        <div class="bar"><i style="width:${v}%"></i></div></div>`;
    }).join("");

    const favToolsHtml = Object.keys(st.fav).map((id) => {
      const t = toolOf(id);
      return t ? `<div class="tool-card" data-tool="${t.id}"><div class="num">${t.id.slice(1)}</div><div class="body"><div class="name">${esc(t.name)}</div><div class="def">${esc(t.def)}</div></div></div>` : "";
    }).join("");

    return `
      <div class="h1">我的清单</div>
      <div class="sub">分数反映练习进度，不评价你的思维水平。慢慢练，分就会涨。</div>

      <div class="stat-grid">
        <div class="stat"><div class="n">${total}%</div><div class="l">总进度</div></div>
        <div class="stat"><div class="n">${donePractices}</div><div class="l">已完成练习</div></div>
        <div class="stat"><div class="n">${doneTools}</div><div class="l">已做到工具</div></div>
        <div class="stat"><div class="n">${todoTools}</div><div class="l">待做工具</div></div>
        <div class="stat"><div class="n">${favTools}</div><div class="l">收藏工具</div></div>
        <div class="stat"><div class="n">${quizTotal}</div><div class="l">检测次数</div></div>
      </div>

      <div class="card mt16">
        <div class="h2" style="margin-top:0">各板块进度</div>
        ${boardRows}
      </div>

      <div class="card">
        <div class="h2" style="margin-top:0">检测成绩</div>
        ${best && best.score != null
          ? `<div class="muted">最佳：${best.score}/${best.total}（${best.pct}%）· 共测 ${quizTotal} 次</div>`
          : '<div class="muted">还没测过，去“检测”页面来一次。</div>'}
      </div>

      ${favToolsHtml ? `<div class="card"><div class="h2" style="margin-top:0">我的收藏</div>${favToolsHtml}</div>` : ""}

      <div class="card center">
        <div class="h3" style="margin-top:0">关于本书与本站</div>
        <div class="muted">本网站为学习型衍生项目。</div>
        <button class="btn ghost block mt12" data-go="about">查看出处与版权说明</button>
      </div>
    `;
  }

  /* ---------- 关于 ---------- */
  function renderAbout() {
    return `
      <div class="h1">关于</div>
      <div class="card about">
        <p><strong>本站是什么</strong></p>
        <p>${esc(SITE.name)}（MindDojo）是一份学习型衍生项目：把《逻辑思维》里的思维工具整理成可以每天练习的卡片与清单。读不是目的，练才是。</p>
        <p><strong>原书出处</strong></p>
        <p>内容灵感基于：${esc(SITE.book)}（${esc(SITE.author)}，${esc(SITE.translator)}，${esc(SITE.publisher)}）。本站所有工具说明、例子与练习均为原创二次创作，未搬用原书原文。</p>
        <p><strong>版权声明</strong></p>
        <div class="copy">本网站为学习型衍生项目，非官方站点，与作者及出版社无关联。原书版权归作者及出版社所有；本站文字内容由本站自行创作，欢迎学习交流，请勿用于商业用途。</div>
      </div>
      <div class="card">
        <div class="h2" style="margin-top:0">更新日志</div>
        <div class="changelog">
          <div class="item"><div class="d">2026-10-21</div><div class="t">v0.1.0 · MVP 上线：工具地图（30 工具）、练习打卡、每日一练、陷阱检测、我的清单。</div></div>
        </div>
      </div>
    `;
  }

  /* ---------- 事件绑定 ---------- */
  function bindPage(p) {
    // 导航
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.onclick = () => navTo(el.dataset.nav);
    });
    // 通用跳转
    document.querySelectorAll("[data-go]").forEach((el) => {
      el.onclick = () => navTo(el.dataset.go);
    });
    // 工具卡点击
    document.querySelectorAll("[data-tool]").forEach((el) => {
      el.onclick = () => navTo("tool", el.dataset.tool);
    });
    // 练习完成 / 取消
    document.querySelectorAll("[data-do]").forEach((el) => {
      el.onclick = () => {
        const [tid, idx] = el.dataset.do.split("|");
        st.done[tid + "|" + idx] = 1;
        save();
        render();
      };
    });
    document.querySelectorAll("[data-undo]").forEach((el) => {
      el.onclick = () => {
        const [tid, idx] = el.dataset.undo.split("|");
        delete st.done[tid + "|" + idx];
        save();
        render();
      };
    });
    // 工具标记
    document.querySelectorAll("[data-mark]").forEach((el) => {
      el.onclick = () => {
        const k = el.dataset.mark;
        const id = el.dataset.t;
        if (st[k][id]) delete st[k][id];
        else st[k][id] = 1;
        save();
        render();
      };
    });
    // 检测
    const startQuiz = page.querySelector("[data-startquiz]");
    if (startQuiz) startQuiz.onclick = () => renderQuizRun();
    const requiz = page.querySelector("[data-requiz]");
    if (requiz) requiz.onclick = () => renderQuizRun();
    document.querySelectorAll("[data-opt]").forEach((el) => {
      el.onclick = () => answerQuiz(+el.dataset.opt);
    });
    const nextq = page.querySelector("[data-nextq]");
    if (nextq) nextq.onclick = () => renderQuizQ();
    const copyBtn = page.querySelector("[data-copy]");
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = copyBtn.dataset.copy;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
          .then(() => { copyBtn.textContent = "已复制 ✓"; })
          .catch(() => {
            const ta = document.createElement("textarea");
            ta.value = text; document.body.appendChild(ta); ta.select();
            document.execCommand("copy"); document.body.removeChild(ta);
            copyBtn.textContent = "已复制 ✓";
          });
      };
    }
  }

  /* ---------- 启动 ---------- */
  window.addEventListener("hashchange", render);
  render();
})();
