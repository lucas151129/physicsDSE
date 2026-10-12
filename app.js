const state = {
  homeSort: "curriculum",
  drafts: {},
  formError: "",
  lastResult: null,
  mistakes: [],
  grading: false,
  gradeService: "down",
  profile: null,
  students: [],
  people: [],
  attempts: [],
  authError: "",
  authNotice: "",
  busy: false,
};

const RECENT_WEIGHTS = [1, 1, 1, 2, 2, 3, 3, 4];
let sb = null;

function allPoints(chapter) {
  return chapter.groups.flatMap((group) => group.points);
}

function findKp(id) {
  for (const chapter of this.CHAPTERS) {
    for (const group of chapter.groups) {
      for (const kp of group.points) {
        if (kp.id === id) return { chapter, group, kp };
      }
    }
  }
  return null;
}

function classScore(kp) {
  return kp.classScore == null ? null : kp.classScore;
}

function pointScore(kp, mode) {
  return mode === "class" ? classScore(kp) : kp.score;
}

function summarize(points, mode) {
  const started = points.filter((kp) => pointScore(kp, mode) != null);
  const mastery = started.length
    ? started.reduce((sum, kp) => sum + pointScore(kp, mode), 0) / started.length
    : null;
  return { mastery, started: started.length, total: points.length };
}

function overall(mode) {
  let weighted = 0;
  let hours = 0;
  for (const chapter of this.CHAPTERS) {
    const stats = summarize(allPoints(chapter), mode);
    if (stats.mastery == null) continue;
    weighted += stats.mastery * chapter.hours;
    hours += chapter.hours;
  }
  return hours ? weighted / hours : null;
}

function coverage(mode) {
  let started = 0;
  let total = 0;
  for (const chapter of this.CHAPTERS) {
    const stats = summarize(allPoints(chapter), mode);
    started += stats.started;
    total += stats.total;
  }
  return { started, total };
}

function weakPoints(mode) {
  const list = [];
  for (const chapter of this.CHAPTERS) {
    for (const kp of allPoints(chapter)) {
      const score = pointScore(kp, mode);
      if (score != null && score < 40) list.push({ chapter, kp, score });
    }
  }
  list.sort((a, b) => a.score - b.score);
  return list;
}

function band(kp) {
  if (!kp.n || kp.score == null) return { key: "none", label: "未開始" };
  if (kp.score >= 85 && kp.n >= 4) return { key: "mastered", label: "掌握" };
  if (kp.score >= 85) return { key: "early", label: "初步掌握" };
  if (kp.score >= 70) return { key: "steady", label: "穩定" };
  if (kp.score >= 40) return { key: "developing", label: "發展中" };
  return { key: "weak", label: "初學" };
}

function bandForScore(score) {
  if (score == null) return { key: "none", label: "未開始" };
  if (score >= 85) return { key: "mastered", label: "掌握" };
  if (score >= 70) return { key: "steady", label: "穩定" };
  if (score >= 40) return { key: "developing", label: "發展中" };
  return { key: "weak", label: "初學" };
}

function pctText(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return String(Math.round(value));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function route() {
  const parts = (location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean);
  const name = parts[0] || "home";
  if (name === "chapter") return { name, id: parts[1] };
  if (name === "point") return { name, id: parts[1] };
  if (name === "practice") return { name, id: parts[1] || "" };
  if (name === "mistakes") return { name, filter: parts[1] || "all" };
  if (name === "teacher") return { name: "teacher" };
  if (name === "register") return { name: "register" };
  if (name === "students") return { name: "students" };
  if (name === "accounts") return { name: "accounts" };
  if (name === "student") {
    return { name: "student", id: parts[1] || "", chapterId: parts[2] === "chapter" ? parts[3] : "" };
  }
  return { name: "home" };
}

function isStaff(profile) {
  return Boolean(profile && (profile.role === "admin" || profile.role === "super"));
}

function chapterById(id) {
  return this.CHAPTERS.find((chapter) => chapter.id === id) || null;
}

function pointOpen(kp) {
  return Boolean(kp && kp.open);
}

function chapterOpen(chapter) {
  return allPoints(chapter).some(pointOpen);
}

function questionById(id) {
  return this.QUESTIONS.find((question) => question.id === id) || null;
}

function lowestPoint(chapter) {
  const started = allPoints(chapter).filter((kp) => kp.score != null);
  if (!started.length) return null;
  return started.reduce((lowest, kp) => (kp.score < lowest.score ? kp : lowest));
}

function openMistakes() {
  return state.mistakes.filter((item) => item.status !== "mastered");
}

function scoresFromAttempts(attempts) {
  const byKp = new Map();
  for (const row of attempts) {
    if (!row.kp_id) continue;
    if (!byKp.has(row.kp_id)) byKp.set(row.kp_id, []);
    byKp.get(row.kp_id).push(row);
  }
  const scores = new Map();
  for (const [id, rows] of byKp) {
    const ordered = rows.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const recent = ordered.slice(-8);
    const weights = RECENT_WEIGHTS.slice(-recent.length);
    let got = 0;
    let full = 0;
    recent.forEach((row, index) => {
      const marks = Number(row.marks);
      if (!marks) return;
      got += (Number(row.earned) / marks) * weights[index];
      full += weights[index];
    });
    if (full) scores.set(id, { score: Math.round((got / full) * 100), n: ordered.length });
  }
  return scores;
}

function overallFromAttempts(attempts) {
  const scores = scoresFromAttempts(attempts);
  let weighted = 0;
  let hours = 0;
  for (const chapter of this.CHAPTERS) {
    const started = allPoints(chapter).map((kp) => scores.get(kp.id)).filter(Boolean);
    if (!started.length) continue;
    const mastery = started.reduce((sum, item) => sum + item.score, 0) / started.length;
    weighted += mastery * chapter.hours;
    hours += chapter.hours;
  }
  return hours ? weighted / hours : null;
}

function applyAttempts(attempts) {
  const scores = scoresFromAttempts(attempts);
  for (const chapter of this.CHAPTERS) {
    for (const kp of allPoints(chapter)) {
      const found = scores.get(kp.id);
      kp.score = found ? found.score : null;
      kp.n = found ? found.n : 0;
    }
  }
}

function deriveMistakes(attempts) {
  const groups = new Map();
  for (const row of attempts) {
    const key = row.question_id || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const list = [];
  for (const rows of groups.values()) {
    const ordered = rows.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const last = ordered[ordered.length - 1];
    const full = ordered.some((row) => Number(row.earned) === Number(row.marks) && Number(row.marks) > 0);
    list.push({
      questionId: last.question_id || "",
      chapterId: last.chapter_id,
      kpId: last.kp_id,
      title: last.title || "作答",
      type: "",
      status: full ? "mastered" : ordered.length > 1 ? "again" : "retry",
      reason: last.reason || "",
      score: last.earned + "/" + last.marks,
      when: last.created_at ? new Date(last.created_at).toLocaleDateString("zh-HK") : "",
    });
  }
  list.sort((a, b) => String(b.when).localeCompare(String(a.when)));
  return list;
}

function recordAttempt(kp, ratio) {
  const add = Math.round(ratio * 100);
  if (kp.score == null || !kp.n) {
    kp.score = add;
    kp.n = 1;
    return;
  }
  kp.score = Math.round((kp.score * kp.n + add) / (kp.n + 1));
  kp.n += 1;
}

function syncMistake(question, graded) {
  const full = graded.earned === graded.marks;
  let item = state.mistakes.find((entry) => entry.questionId === question.id);
  if (full) {
    if (item) {
      item.status = "mastered";
      item.score = graded.earned + "/" + graded.marks;
      item.reason = "重做後已拿滿分";
      item.when = "剛剛";
    }
    return item;
  }
  if (!item) {
    item = {
      id: "live-" + question.id,
      questionId: question.id,
      chapterId: question.chapterId,
      kpId: question.kpId,
      title: question.title,
      type: question.type === "mc" ? "選擇" : question.type === "numeric" ? "數值" : "結構",
      status: "retry",
      reason: graded.reason,
      score: graded.earned + "/" + graded.marks,
      when: "剛剛",
    };
    state.mistakes.unshift(item);
    return item;
  }
  item.status = "again";
  item.reason = graded.reason;
  item.score = graded.earned + "/" + graded.marks;
  item.when = "剛剛";
  return item;
}

function render() {
  const current = route();
  const gate = document.querySelector("#gate");
  const shell = document.querySelector("#shell");
  const entry = document.querySelector("#teacher-entry");
  const showTeacherGate = current.name === "teacher" && !isStaff(state.profile);
  if (!state.profile || showTeacherGate) {
    if (shell) shell.hidden = true;
    if (gate) {
      gate.hidden = false;
      gate.innerHTML = renderGate(showTeacherGate ? { name: "teacher" } : current);
    }
    if (entry) entry.hidden = current.name === "teacher";
    document.title = (current.name === "register" ? "註冊" : current.name === "teacher" ? "教師登入" : "登入") + " · FunLearning 物理";
    return;
  }
  if (gate) gate.hidden = true;
  if (shell) shell.hidden = false;
  if (!isStaff(state.profile) && (current.name === "students" || current.name === "accounts" || current.name === "student")) {
    location.hash = "#/";
    return;
  }
  if (isStaff(state.profile) && ["home", "chapter", "practice", "mistakes", "register", "teacher", "point"].includes(current.name)) {
    location.hash = "#/students";
    return;
  }
  paintChrome(current);
  const main = document.querySelector("#main");
  const titles = {
    home: "掌握情況",
    chapter: "課題",
    point: "知識點",
    practice: "做題",
    mistakes: "錯題本",
    students: "學生",
    student: "學生",
    accounts: "添加帳戶",
  };
  document.title = (titles[current.name] || "FunLearning 物理") + " · FunLearning 物理";
  if (isStaff(state.profile) && current.name === "student") {
    const rows = state.attempts.filter((row) => row.student_id === current.id);
    applyAttempts(rows);
  } else if (!isStaff(state.profile)) {
    applyAttempts(state.attempts);
    state.mistakes = deriveMistakes(state.attempts);
  }
  if (current.name === "chapter") main.innerHTML = renderChapter(current.id);
  else if (current.name === "point") main.innerHTML = renderPoint(current.id);
  else if (current.name === "practice") main.innerHTML = renderPractice(current.id);
  else if (current.name === "mistakes") main.innerHTML = renderMistakes(current.filter);
  else if (current.name === "students") main.innerHTML = renderStudentList();
  else if (current.name === "accounts") main.innerHTML = renderAccounts();
  else if (current.name === "student") main.innerHTML = renderStudentDetail(current);
  else main.innerHTML = renderHome();
  const count = document.querySelector("#mistake-count");
  if (count) count.textContent = String(openMistakes().length);
  main.focus({ preventScroll: true });
}

function paintChrome(current) {
  const staff = isStaff(state.profile);
  const nav = document.querySelector("#nav");
  const entry = document.querySelector("#teacher-entry");
  if (entry) entry.hidden = staff;
  if (staff) {
    nav.innerHTML =
      '<a href="#/students" data-route="students">學生</a>' +
      (state.profile.role === "super" ? '<a href="#/accounts" data-route="accounts">添加帳戶</a>' : "");
  } else if (!nav.querySelector('[data-route="home"]')) {
    nav.innerHTML =
      '<a href="#/" data-route="home">掌握情況</a>' +
      '<a href="#/practice" data-route="practice">做題</a>' +
      '<a href="#/mistakes" data-route="mistakes">錯題本 <span class="count" id="mistake-count">0</span></a>';
  }
  for (const link of nav.querySelectorAll("a")) {
    const key = link.dataset.route;
    const on = key === current.name || (key === "home" && current.name === "chapter") || (key === "students" && current.name === "student");
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const who = document.querySelector("#who");
  if (who) {
    const roleLabel = state.profile.role === "super" ? "總帳號" : state.profile.role === "admin" ? "管理員" : state.profile.class_name || "";
    who.textContent = state.profile.name + (roleLabel ? " · " + roleLabel : "");
  }
}

function renderGate(current) {
  const error = state.authError ? '<p class="form-error">' + esc(state.authError) + "</p>" : "";
  const notice = state.authNotice ? '<p class="grader-note">' + esc(state.authNotice) + "</p>" : "";
  if (current.name === "register") {
    return (
      '<form class="gate-card" method="post" action="#" data-auth="register">' +
      '<p class="kicker">學生註冊</p><h1>建立學生帳號</h1>' +
      '<p class="lede">註冊只會建立學生帳號。填電郵、姓名和班別。</p>' +
      error +
      notice +
      field("email", "電郵", "email", "email") +
      field("name", "姓名", "text", "name") +
      field("class_name", "班別", "text", "organization") +
      field("password", "密碼", "password", "new-password") +
      '<div class="actions"><button class="btn" type="submit"' +
      (state.busy ? " disabled" : "") +
      ">註冊</button>" +
      '<a href="#/">已有帳號，登入</a></div></form>'
    );
  }
  if (current.name === "teacher") {
    const back = state.profile ? '<a href="#/">返回學生版</a>' : '<a href="#/">學生登入</a>';
    return (
      '<form class="gate-card" method="post" action="#" data-auth="teacher">' +
      '<p class="kicker">教師</p><h1>教師登入</h1>' +
      '<p class="lede">這裡不能註冊。管理員和總帳號由總帳號建立。</p>' +
      error +
      notice +
      field("email", "電郵", "email", "username") +
      field("password", "密碼", "password", "current-password") +
      '<div class="actions"><button class="btn" type="submit"' +
      (state.busy ? " disabled" : "") +
      ">登入</button>" +
      back +
      "</div></form>"
    );
  }
  return (
    '<form class="gate-card" method="post" action="#" data-auth="login">' +
    '<p class="kicker">學生</p><h1>登入</h1>' +
    '<p class="lede">用註冊時的電郵和密碼。登入後只會看到自己的掌握情況。</p>' +
    error +
    notice +
    field("email", "電郵", "email", "username") +
    field("password", "密碼", "password", "current-password") +
    '<div class="actions"><button class="btn" type="submit"' +
    (state.busy ? " disabled" : "") +
    ">登入</button>" +
    '<a href="#/register">註冊學生帳號</a></div></form>'
  );
}

function field(name, label, type, auto, required) {
  return (
    '<label class="field"><span>' +
    label +
    '</span><input name="' +
    name +
    '" type="' +
    type +
    '" autocomplete="' +
    auto +
    '"' +
    (required === false ? "" : " required") +
    "></label>"
  );
}

function renderHome() {
  const chapters =
    state.homeSort === "weak"
      ? this.CHAPTERS.slice().sort((a, b) => {
          const sa = summarize(allPoints(a), "student").mastery;
          const sb = summarize(allPoints(b), "student").mastery;
          if (sa == null) return -1;
          if (sb == null) return 1;
          return sa - sb;
        })
      : this.CHAPTERS;
  const cover = coverage("student");
  const weak = weakPoints("student");
  const rows = chapters
    .map((chapter) => {
      const open = chapterOpen(chapter);
      const stats = summarize(allPoints(chapter), "student");
      const low = lowestPoint(chapter);
      const width = !open || stats.mastery == null ? 0 : Math.round(stats.mastery);
      const sub = open
        ? low
          ? "最弱：" + low.name + " · 覆蓋 " + stats.started + "/" + stats.total + " · " + chapter.hours + " 小時"
          : "未開始 · " + chapter.hours + " 小時"
        : "待開放";
      return (
        '<a class="chapter-row' +
        (open ? "" : " closed") +
        '" href="#/chapter/' +
        chapter.id +
        '">' +
        '<img src="' +
        chapter.image +
        '" alt="' +
        esc(chapter.alt) +
        '" width="96" height="96">' +
        '<span class="idx" style="color:' +
        chapter.color +
        '">' +
        chapter.index +
        "</span>" +
        '<span><span class="chapter-name">' +
        esc(chapter.name) +
        '</span><span class="chapter-sub">' +
        esc(sub) +
        '</span><span class="bar"><span style="width:' +
        width +
        "%;background:" +
        chapter.color +
        '"></span></span></span>' +
        '<span class="pct">' +
        (open ? pctText(stats.mastery) + "<small>%</small>" : "待開放") +
        "</span></a>"
      );
    })
    .join("");
  return (
    '<div class="wrap">' +
    '<div class="page-head"><div><p class="kicker">必修部分 · 五個課題 · 184 小時</p><h1>掌握情況</h1>' +
    '<p class="lede">課題百分比是已作答知識點的平均得分率，整體再按課題時數加權。未做過的知識點計入覆蓋，不計入得分率。最近 8 次越近越重。</p></div>' +
    '<div class="segmented" role="group" aria-label="排列">' +
    '<button type="button" data-sort="curriculum" aria-pressed="' +
    (state.homeSort === "curriculum") +
    '">課題順序</button>' +
    '<button type="button" data-sort="weak" aria-pressed="' +
    (state.homeSort === "weak") +
    '">先看薄弱</button></div></div>' +
    '<ul class="stats"><li class="stat"><b>' +
    pctText(overall("student")) +
    '<small>%</small></b><span>整體掌握</span></li><li class="stat"><b>' +
    weak.length +
    '</b><span>初學知識點</span></li><li class="stat"><b>' +
    cover.started +
    "/" +
    cover.total +
    '</b><span>知識點覆蓋</span></li></ul>' +
    '<div class="chapter-list">' +
    rows +
    "</div>" +
    '<p class="note">選修部分不在這版。還沒有作答時，課題顯示為未開始。</p></div>'
  );
}

function renderChapter(id) {
  const chapter = chapterById(id);
  if (!chapter) return '<div class="wrap"><p>找不到這個課題。</p></div>';
  const stats = summarize(allPoints(chapter), "student");
  const openRows = [];
  const closedRows = [];
  for (const group of chapter.groups) {
    for (const kp of group.points) {
      if (!pointOpen(kp)) {
        closedRows.push('<div class="kp closed"><span class="kp-name">' + esc(kp.name) + '</span><span class="band none">待開放</span></div>');
        continue;
      }
      const label = band(kp);
      const width = kp.score == null ? 0 : Math.round(kp.score);
      openRows.push(
        '<a class="kp" href="#/point/' +
          kp.id +
          '"><span class="kp-name">' +
          esc(kp.name) +
          '</span><span class="band ' +
          label.key +
          '">' +
          label.label +
          '</span><span class="bar"><span style="width:' +
          width +
          "%;background:" +
          chapter.color +
          '"></span></span><span class="pct">' +
          pctText(kp.score) +
          '<small>%</small></span><span class="tries">' +
          (kp.n ? kp.n + " 次" : "做題") +
          "</span></a>"
      );
    }
  }
  const groups =
    (openRows.length ? '<h2 class="group-label">已開放</h2>' + openRows.join("") : "") +
    (closedRows.length ? '<h2 class="group-label">待開放</h2>' + closedRows.join("") : "");
  return (
    '<div class="wrap"><a class="back" href="#/">返回掌握情況</a><div class="hero"><img src="' +
    chapter.image +
    '" alt="' +
    esc(chapter.alt) +
    '" width="220" height="220"><div><p class="idx" style="color:' +
    chapter.color +
    '">' +
    chapter.index +
    "</p><h1>" +
    esc(chapter.name) +
    '</h1><p class="hero-meta">' +
    chapter.hours +
    " 小時 · 掌握 " +
    pctText(stats.mastery) +
    "% · 覆蓋 " +
    stats.started +
    "/" +
    stats.total +
    "</p></div></div>" +
    '<div class="legend"><span><i style="background:#9a3412"></i>初學，40% 以下</span><span><i style="background:#8a5a22"></i>發展中</span><span><i style="background:#1e4e86"></i>穩定，或未滿 4 次的初步掌握</span><span><i style="background:#0e6b5c"></i>掌握，85% 或以上而且至少 4 次</span></div>' +
    groups +
    '<p class="note">課題掌握只平均已經做過的知識點。掌握需要得分率至少 85%，而且至少做過 4 次。</p></div>'
  );
}

function questionKind(question) {
  if (question.type === "mc") return "選擇題";
  if (question.length === "long") return "計算題 · 長題目";
  return "計算題 · 短題目";
}

function questionLevel(question) {
  if (question.level === "1") return "程度一";
  if (question.level === "2") return "程度二";
  return "";
}

function questionMeta(question) {
  const level = questionLevel(question);
  return (level ? level + " · " : "") + questionKind(question) + " · " + question.marks + " 分";
}

function questionsFor(kpId) {
  return this.QUESTIONS.filter((question) => question.kpId === kpId);
}

function renderMomentNotes() {
  const notes = this.MOMENT_NOTES;
  if (!notes) return "";
  return (
    '<p class="kicker">先看這頁，再做題</p><h1>' +
    esc(notes.title) +
    "</h1>" +
    notes.sections
      .map(
        (section) =>
          '<h2 class="group-label">' + esc(section.heading) + '</h2><p class="lede">' + esc(section.body) + "</p>"
      )
      .join("")
  );
}

function renderPoint(id) {
  const found = findKp(id);
  if (!found || !pointOpen(found.kp)) {
    return '<div class="wrap"><a class="back" href="#/">返回掌握情況</a><h1>待開放</h1><p class="lede">這個知識點尚未開放。</p></div>';
  }
  const questions = questionsFor(id);
  let levelCount = 0;
  let previousLevel = "";
  const list = questions
    .map((question) => {
      const level = questionLevel(question);
      if (level !== previousLevel) {
        levelCount = 0;
        previousLevel = level;
      }
      levelCount += 1;
      const heading = level ? '<h2 class="group-label">' + level + "</h2>" : "";
      const showHeading = levelCount === 1 && level ? heading : "";
      return (
        showHeading +
        '<a class="chapter-row" href="#/practice/' +
        question.id +
        '"><span class="idx" style="color:' +
        found.chapter.color +
        '">' +
        String(levelCount).padStart(2, "0") +
        '</span><span><span class="chapter-name">' +
        esc(question.title) +
        '</span><span class="chapter-sub">' +
        esc(questionMeta(question)) +
        "</span></span></a>"
      );
    })
    .join("");
  const notes = id === "motion.moment" ? renderMomentNotes() : "";
  const energyNote =
    id === "motion.energy"
      ? '<p class="lede">程度一是單一關係，程度二要把兩個高度、摩擦或外力作功放在一起。數值題取 g = 10 m/s²。</p>'
      : "";
  return (
    '<div class="wrap"><a class="back" href="#/chapter/' +
    found.chapter.id +
    '">返回' +
    esc(found.chapter.name) +
    "</a>" +
    (notes || '<p class="kicker">' + esc(found.chapter.name) + "</p><h1>" + esc(found.kp.name) + "</h1>") +
    energyNote +
    '<h2 class="group-label">做題</h2><div class="chapter-list">' +
    (list || '<p class="empty">尚未有題目。</p>') +
    "</div></div>"
  );
}

function renderPractice(id) {
  const question = questionById(id) || this.QUESTIONS[0];
  if (!question) {
    return '<div class="wrap"><p class="kicker">題庫</p><h1>做題</h1><p class="lede">尚未有題目。</p></div>';
  }
  const found = findKp(question.kpId);
  if (!found || !pointOpen(found.kp)) {
    return '<div class="wrap"><a class="back" href="#/">返回掌握情況</a><h1>待開放</h1></div>';
  }
  const draft = state.drafts[question.id] || {};
  const pool = questionsFor(question.kpId);
  const index = pool
    .map((item, number) => {
      const current = item.id === question.id ? ' aria-current="page"' : "";
      return (
        '<a href="#/practice/' +
        item.id +
        '"' +
        current +
        '><span class="q-no">' +
        String(number + 1).padStart(2, "0") +
        " · " +
        esc(questionMeta(item)) +
        "</span><strong>" +
        esc(item.title) +
        "</strong></a>"
      );
    })
    .join("");
  const error = state.formError ? '<p class="form-error">' + esc(state.formError) + "</p>" : "";
  const actions =
    question.type === "mc"
      ? '<div class="actions"><button class="btn" type="submit"' +
        (state.grading ? " disabled" : "") +
        ">" +
        (state.grading ? "請稍候…" : "批改這題") +
        '</button><button class="btn quiet" type="button" data-act="analyze" data-qid="' +
        question.id +
        '"' +
        (state.grading ? " disabled" : "") +
        ">AI 分析</button></div>"
      : '<div class="upload"><label class="btn file-btn">拍照或上傳<input class="work-file" type="file" accept="image/*,.pdf,application/pdf" data-qid="' +
        question.id +
        '"></label><p class="grader-note">' +
        esc(draft.fileLabel || "可以拍照，或上傳 jpg、png、PDF。") +
        "</p>" +
        (draft.preview ? '<img class="work-preview" alt="已上傳的作答" src="' + draft.preview + '">' : "") +
        '</div><div class="actions"><button class="btn" type="button" data-act="grade-image" data-qid="' +
        question.id +
        '"' +
        (state.grading ? " disabled" : "") +
        ">" +
        (state.grading ? "請稍候…" : "AI 改題") +
        '</button><button class="btn quiet" type="button" data-act="show-answer" data-qid="' +
        question.id +
        '">' +
        (draft.showAnswer ? "收起答案" : "顯示答案") +
        '</button><button class="btn quiet" type="button" data-act="analyze" data-qid="' +
        question.id +
        '"' +
        (state.grading ? " disabled" : "") +
        ">AI 分析</button></div>";
  return (
    '<div class="wrap"><a class="back" href="#/point/' +
    found.kp.id +
    '">返回' +
    esc(found.kp.name) +
    '</a><p class="kicker">' +
    esc(questionKind(question)) +
    "</p><h1>做題</h1>" +
    '<nav class="q-index">' +
    index +
    "</nav>" +
    '<article class="question"><p class="kicker">' +
    esc(found.kp.name) +
    " · " +
    question.marks +
    ' 分</p><h2>' +
    esc(question.title) +
    '</h2><p class="stem">' +
    esc(question.stem) +
    "</p>" +
    graderNote(question) +
    '<form class="answer" data-qid="' +
    question.id +
    '">' +
    renderFields(question, draft) +
    error +
    actions +
    "</form>" +
    renderAnswer(question, draft) +
    renderAnalysis(draft) +
    renderResult(question) +
    "</article></div>"
  );
}

function renderAnswer(question, draft) {
  if (!draft.showAnswer) return "";
  const parts = Array.isArray(question.solution) ? question.solution : [question.solution || ""];
  return (
    '<section class="answer-doc"><h3>參考答案</h3>' +
    parts.map((part) => "<p>" + esc(part) + "</p>").join("") +
    "</section>"
  );
}

function renderAnalysis(draft) {
  if (!draft.analysis) return "";
  return '<section class="analysis"><h3>AI 分析</h3><p>' + esc(draft.analysis) + "</p></section>";
}

function graderNote(question) {
  if (question.type === "calc") {
    return '<p class="grader-note">拍照或上傳作答後可以 AI 改題。PDF 只讀前兩頁。也可以直接看參考答案，或請 AI 分析這題。金鑰只在伺服器。</p>';
  }
  if (question.type === "mc") {
    return '<p class="grader-note">選擇題先由程式對答案。AI 分析會說明正確項和其他選項的分別，由伺服器呼叫 DeepSeek。</p>';
  }
  return "";
}

function renderFields(question, draft) {
  if (question.type === "calc") return "";
  if (question.type === "mc") {
    return (
      '<ul class="choices">' +
      question.choices
        .map((choice) => {
          const checked = draft.choice === choice.id ? " checked" : "";
          return (
            '<li><label class="choice"><input type="radio" name="choice" value="' +
            choice.id +
            '"' +
            checked +
            "><span><strong>" +
            choice.id +
            "</strong>　" +
            esc(choice.text) +
            "</span></label></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }
  if (question.type === "numeric") {
    const options = question.units
      .map((unit) => {
        const selected = (draft.unit || question.units[0]) === unit ? " selected" : "";
        return '<option value="' + esc(unit) + '"' + selected + ">" + esc(unit) + "</option>";
      })
      .join("");
    return (
      '<label class="field"><span>數值</span><input name="value" inputmode="decimal" autocomplete="off" value="' +
      esc(draft.value || "") +
      '" placeholder="900 或 9.00×10^2"></label>' +
      '<label class="field"><span>單位</span><select name="unit">' +
      options +
      "</select></label>"
    );
  }
  return (
    '<label class="field"><span>解釋</span><textarea name="text" placeholder="' +
    esc(question.placeholder) +
    '">' +
    esc(draft.text || "") +
    "</textarea></label>"
  );
}

function renderResult(question) {
  const result = state.lastResult;
  if (!result || result.questionId !== question.id) return "";
  const graded = result.graded;
  const points = graded.points
    ? '<ul class="points">' +
      graded.points
        .map(
          (point) =>
            "<li><span class=\"" +
            (point.hit ? "got" : "miss") +
            '">' +
            (point.hit ? "得到" : "未得") +
            "</span><span>" +
            esc(point.text) +
            "</span></li>"
        )
        .join("") +
      "</ul>"
    : "";
  const steps = graded.steps
    ? '<ol class="steps">' + graded.steps.map((step) => "<li>" + esc(step) + "</li>").join("") + "</ol>"
    : "";
  const quote = graded.answerText
    ? '<blockquote class="quote">' + esc(graded.answerText) + "</blockquote>"
    : "";
  const book =
    graded.earned === graded.marks
      ? "錯題本：這題現為已掌握。"
      : "錯題本已收下這題。";
  return (
    '<section class="result" id="result"><div class="result-score"><b>' +
    graded.earned +
    "<small>/" +
    graded.marks +
    "</small></b><h3>" +
    esc(graded.headline) +
    "</h3></div><p class=\"detail\">" +
    esc(graded.detail) +
    "</p>" +
    quote +
    points +
    steps +
    '<p class="note">記入「' +
    esc(result.kpName) +
    "」。得分率 " +
    result.before +
    "% → " +
    result.after +
    "%，累計 " +
    result.n +
    " 次。" +
    book +
    "</p></section>"
  );
}

function renderMistakes(filter) {
  const labels = { retry: "待重做", again: "重做仍錯", mastered: "已掌握" };
  const items = state.mistakes.filter((item) => {
    if (filter === "open") return item.status !== "mastered";
    if (filter === "mastered") return item.status === "mastered";
    return true;
  });
  const filters =
    '<nav class="filters">' +
    filterLink("all", "全部", filter) +
    filterLink("open", "未掌握", filter) +
    filterLink("mastered", "已掌握", filter) +
    "</nav>";
  const rows = items.length
    ? items
        .map((item) => {
          const found = findKp(item.kpId);
          const where = found ? found.chapter.name + " · " + found.kp.name : "";
          const redo =
            item.questionId && questionById(item.questionId)
              ? '<a class="redo" href="#/practice/' + item.questionId + '">重做這題</a>'
              : "<span></span>";
          return (
            '<article class="mistake"><p class="status ' +
            item.status +
            '">' +
            labels[item.status] +
            '</p><div><h2>' +
            esc(item.title) +
            '</h2><p>' +
            esc(where) +
            (where ? " · " : "") +
            esc(item.type) +
            " · " +
            esc(item.score) +
            " · " +
            esc(item.when) +
            "</p><p>" +
            esc(item.reason) +
            "</p></div>" +
            redo +
            "</article>"
          );
        })
        .join("")
    : '<p class="empty">這個篩選下面沒有題目。</p>';
  return (
    '<div class="wrap"><p class="kicker">未拿滿分的題留在這裡</p><h1>錯題本</h1>' +
    '<p class="lede">第一次未滿分是待重做；再做仍未滿分是重做仍錯；之後有一次滿分就改為已掌握，紀錄仍保留。</p>' +
    filters +
    rows +
    "</div>"
  );
}

function filterLink(id, label, current) {
  const on = id === current ? ' aria-current="page"' : "";
  return '<a href="#/mistakes/' + id + '"' + on + ">" + label + "</a>";
}

function onMainClick(event) {
  const sort = event.target.closest("[data-sort]");
  if (sort) {
    state.homeSort = sort.dataset.sort;
    render();
    return;
  }
  const act = event.target.closest("[data-act]");
  if (!act || act.disabled) return;
  if (act.dataset.act === "check-service") refreshGradeService();
  if (act.dataset.act === "show-answer") toggleAnswer(act.dataset.qid);
  if (act.dataset.act === "analyze") runAnalysis(act.dataset.qid);
  if (act.dataset.act === "grade-image") runImageGrade(act.dataset.qid);
}

function serviceMessage(err, fallback) {
  const message = String((err && err.message) || "");
  if (message.includes("請先寫下解釋")) return "伺服器上的批改功能還沒有這一步。請重新部署 grade-physics，並設定 DEEPSEEK_API_KEY。";
  return message || fallback;
}

function toggleAnswer(qid) {
  const draft = state.drafts[qid] || {};
  draft.showAnswer = !draft.showAnswer;
  state.drafts[qid] = draft;
  render();
}

async function runAnalysis(qid) {
  const question = questionById(qid);
  if (!question || state.grading) return;
  state.grading = true;
  state.formError = "";
  render();
  try {
    const text = await analyzeQuestion(question);
    const draft = state.drafts[qid] || {};
    draft.analysis = text || "沒有收到分析。";
    state.drafts[qid] = draft;
  } catch (err) {
    state.formError = serviceMessage(err, "分析失敗。");
  }
  state.grading = false;
  render();
}

async function runImageGrade(qid) {
  const question = questionById(qid);
  const draft = state.drafts[qid] || {};
  if (!question || state.grading) return;
  if (!draft.images || !draft.images.length) {
    state.formError = "請先拍照或上傳檔案。";
    render();
    return;
  }
  state.grading = true;
  state.formError = "";
  state.lastResult = null;
  render();
  try {
    const graded = await gradeUploadedWork(question, draft.images);
    finishGrade(question, graded);
  } catch (err) {
    state.grading = false;
    state.formError = serviceMessage(err, "改題失敗。");
    render();
  }
}

async function onWorkFile(event) {
  const input = event.target;
  if (!input.classList || !input.classList.contains("work-file")) return;
  const file = input.files && input.files[0];
  const qid = input.dataset.qid;
  if (!file || !qid) return;
  state.formError = "";
  state.grading = true;
  render();
  try {
    const images = await fileToImages(file);
    const draft = state.drafts[qid] || {};
    draft.images = images;
    draft.fileLabel = file.name;
    draft.preview = images[0] || "";
    state.drafts[qid] = draft;
  } catch (err) {
    state.formError = err.message || "檔案讀不到。";
  }
  state.grading = false;
  render();
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("這張圖片讀不到。"));
    };
    img.src = url;
  });
}

async function fileToImages(file) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (!window.pdfjsLib) throw new Error("PDF 元件還沒載入，請改拍照或上傳圖片。");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const images = [];
    const count = Math.min(pdf.numPages, 2);
    for (let pageNumber = 1; pageNumber <= count; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.72));
    }
    if (!images.length) throw new Error("這份 PDF 沒有頁面。");
    return images;
  }
  if (!/^image\//.test(file.type)) throw new Error("請上傳圖片或 PDF。");
  return [await resizeImageFile(file)];
}

function onInput(event) {
  const form = event.target.form;
  if (!form || !form.dataset.qid) return;
  const draft = state.drafts[form.dataset.qid] || {};
  const name = event.target.name;
  if (name === "value" || name === "unit" || name === "text" || name === "choice") {
    draft[name] = event.target.value;
  }
  state.drafts[form.dataset.qid] = draft;
}

function finishGrade(question, graded) {
  state.grading = false;
  state.formError = "";
  const found = findKp(question.kpId);
  const before = found.kp.score == null ? "—" : String(found.kp.score);
  recordAttempt(found.kp, graded.earned / graded.marks);
  syncMistake(question, graded);
  state.lastResult = {
    questionId: question.id,
    graded,
    kpName: found.kp.name,
    before,
    after: found.kp.score,
    n: found.kp.n,
  };
  render();
  const result = document.querySelector("#result");
  if (result) result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function onSubmit(event) {
  const form = event.target;
  if (!form.dataset) return;
  if (form.dataset.account) {
    event.preventDefault();
    await onCreateAccount(form);
    return;
  }
  if (!form.dataset.qid) return;
  event.preventDefault();
  const question = questionById(form.dataset.qid);
  if (!question || state.grading) return;
  if (question.type === "calc") return;
  const data = new FormData(form);
  const response = {
    choice: data.get("choice") || "",
    value: data.get("value") || "",
    unit: data.get("unit") || "",
    text: data.get("text") || "",
  };
  state.drafts[question.id] = response;
  if (question.type === "structured" && deepseekReady()) {
    const draft = String(response.text || "").trim();
    if (!draft) {
      state.formError = "請先寫下解釋。";
      state.lastResult = null;
      render();
      return;
    }
    state.formError = "";
    state.grading = true;
    state.lastResult = null;
    render();
    try {
      const graded = await gradeWithDeepseek(question, draft);
      finishGrade(question, graded);
    } catch (err) {
      state.grading = false;
      if (err.fallback) {
        const local = gradeQuestion(question, response);
        if (!local.error) {
          local.detail = err.message + " " + local.detail;
          finishGrade(question, local);
          return;
        }
      }
      state.formError = err.message || "批改失敗。";
      render();
    }
    return;
  }
  const graded = gradeQuestion(question, response);
  if (graded.error) {
    state.formError = graded.error;
    state.lastResult = state.lastResult && state.lastResult.questionId === question.id ? null : state.lastResult;
    render();
    return;
  }
  finishGrade(question, graded);
}

function renderStudentList() {
  const groups = new Map();
  for (const student of state.students) {
    const key = student.class_name || "未分班";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(student);
  }
  let body = "";
  if (!state.students.length) {
    body = '<p class="empty">還沒有學生。學生可以自行註冊，總帳號也可以添加。</p>';
  }
  for (const [className, list] of groups) {
    body += '<h2 class="group-label">' + esc(className) + "</h2>";
    body += list
      .map((student) => {
        const mine = state.attempts.filter((row) => row.student_id === student.id);
        return (
          '<a class="student-row" href="#/student/' +
          student.id +
          '"><span>' +
          esc(student.name) +
          '</span><span>' +
          esc(student.email) +
          "</span><b>" +
          pctText(overallFromAttempts(mine)) +
          "<small>%</small></b></a>"
        );
      })
      .join("");
  }
  return (
    '<div class="wrap"><p class="kicker">教師</p><h1>學生</h1>' +
    '<p class="lede">只列出學生。學生登入後只能看到自己的掌握情況和錯題本。</p>' +
    body +
    "</div>"
  );
}

function renderStudentDetail(current) {
  const student = state.students.find((item) => item.id === current.id);
  if (!student || !/^[0-9a-f-]{36}$/i.test(student.id)) {
    return '<div class="wrap"><a class="back" href="#/students">返回學生名單</a><p>找不到這個學生。</p></div>';
  }
  const keep = (value) => String(value).replace(/\$/g, "$$$$");
  if (current.chapterId) {
    return renderChapter(current.chapterId)
      .replace('href="#/"', 'href="#/student/' + student.id + '"')
      .replace("返回掌握情況", keep("返回" + esc(student.name)));
  }
  const head =
    '<div class="wrap"><a class="back" href="#/students">返回學生名單</a><p class="kicker">' +
    esc(student.class_name || "未分班") +
    " · " +
    esc(student.email) +
    "</p>";
  return renderHome()
    .replace("<h1>掌握情況</h1>", keep("<h1>" + esc(student.name) + "</h1>"))
    .replace('<div class="wrap">', keep(head))
    .replace(/href="#\/chapter\//g, 'href="#/student/' + student.id + "/chapter/");
}

function renderAccounts() {
  if (!state.profile || state.profile.role !== "super") {
    return '<div class="wrap"><p>只有總帳號可以添加帳戶。</p></div>';
  }
  const admins = state.people.filter((person) => person.role === "admin");
  const adminRows = admins.length
    ? admins
        .map(
          (person) =>
            "<li>" + esc(person.name) + " · " + esc(person.email) + "</li>"
        )
        .join("")
    : "<li>還沒有管理員。</li>";
  return (
    '<div class="wrap"><p class="kicker">總帳號</p><h1>添加帳戶</h1>' +
    '<p class="lede">可以添加管理員或學生。學生註冊頁不能建立這兩種以外的帳號，也不能自行成為管理員。</p>' +
    (state.formError ? '<p class="form-error">' + esc(state.formError) + "</p>" : "") +
    (state.authNotice ? '<p class="grader-note">' + esc(state.authNotice) + "</p>" : "") +
    '<form class="answer" method="post" action="#" data-account="1">' +
    '<label class="field"><span>身分</span><select name="role"><option value="student">學生</option><option value="admin">管理員</option></select></label>' +
    field("email", "電郵", "email", "off") +
    field("name", "姓名", "text", "name") +
    field("class_name", "班別（學生要填）", "text", "off", false) +
    field("password", "密碼", "password", "new-password") +
    '<div class="actions"><button class="btn" type="submit"' +
    (state.busy ? " disabled" : "") +
    ">建立</button></div></form>" +
    '<h2 class="group-label">管理員</h2><ul class="plain">' +
    adminRows +
    "</ul></div>"
  );
}

function authMessage(error) {
  const message = String((error && error.message) || "");
  if (error && error.code === "PGRST205") return "資料庫還沒有建好。請在 Supabase 的 SQL Editor 執行 supabase/physics.sql。";
  if (/invalid login/i.test(message)) return "電郵或密碼不對。";
  if (/already registered/i.test(message)) return "這個電郵已經註冊。";
  if (/password/i.test(message) && /least/i.test(message)) return "密碼至少 6 個字。";
  return message || "沒有完成。";
}

async function loadWorkspace(user) {
  const { data, error } = await sb.from("physics_users").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    state.profile = null;
    state.authError = authMessage(error);
    render();
    return;
  }
  if (!data) {
    state.profile = null;
    state.authError = "這個登入還沒有物理帳戶。";
    await sb.auth.signOut();
    render();
    return;
  }
  state.profile = data;
  state.authError = "";
  const attemptQuery = sb.from("physics_attempts").select("*").order("created_at", { ascending: true });
  const attemptResult = isStaff(data) ? await attemptQuery : await attemptQuery.eq("student_id", data.id);
  state.attempts = attemptResult.data || [];
  if (isStaff(data)) {
    const peopleResult = await sb.from("physics_users").select("*").order("class_name", { ascending: true });
    state.people = peopleResult.data || [];
    state.students = state.people.filter((person) => person.role === "student");
    const here = route().name;
    if (["home", "teacher", "register", "practice", "mistakes", "chapter"].includes(here)) location.hash = "#/students";
  } else {
    state.students = [];
    state.people = [];
    applyAttempts(state.attempts);
    state.mistakes = deriveMistakes(state.attempts);
    if (route().name === "register" || route().name === "teacher") location.hash = "#/";
  }
  render();
}

async function onGateSubmit(event) {
  const form = event.target;
  if (!form.dataset || !form.dataset.auth) return;
  event.preventDefault();
  if (state.busy) return;
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");
  const name = String(data.get("name") || "").trim();
  const className = String(data.get("class_name") || "").trim();
  state.busy = true;
  state.authError = "";
  state.authNotice = "";
  render();
  try {
    if (form.dataset.auth === "register") {
      if (!name || !className) throw new Error("要填姓名和班別。");
      if (password.length < 6) throw new Error("密碼至少 6 個字。");
      const result = await sb.auth.signUp({
        email,
        password,
        options: { data: { app: "physics", name, class_name: className } },
      });
      if (result.error) throw result.error;
      if (result.data.session) {
        await loadWorkspace(result.data.session.user);
        return;
      }
      state.authNotice = "帳號已建立。請用這組電郵和密碼登入。";
      location.hash = "#/";
    } else {
      const result = await sb.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      await loadWorkspace(result.data.user);
      return;
    }
  } catch (err) {
    state.authError = authMessage(err);
  } finally {
    state.busy = false;
    if (!state.profile || route().name === "teacher") render();
  }
}

async function onCreateAccount(form) {
  if (state.busy) return;
  const data = new FormData(form);
  const role = String(data.get("role") || "student");
  const email = String(data.get("email") || "").trim();
  const name = String(data.get("name") || "").trim();
  const className = String(data.get("class_name") || "").trim();
  const password = String(data.get("password") || "");
  state.busy = true;
  state.formError = "";
  state.authNotice = "";
  render();
  const result = await sb.rpc("physics_create_account", {
    p_email: email,
    p_password: password,
    p_name: name,
    p_class_name: role === "student" ? className : "",
    p_role: role,
  });
  state.busy = false;
  if (result.error) {
    state.formError = authMessage(result.error);
    render();
    return;
  }
  state.authNotice = "已建立。對方可以用這個電郵和密碼登入。";
  const userResult = await sb.auth.getUser();
  if (userResult.data.user) await loadWorkspace(userResult.data.user);
}

document.addEventListener("DOMContentLoaded", async () => {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const main = document.querySelector("#main");
  main.addEventListener("click", onMainClick);
  main.addEventListener("input", onInput);
  main.addEventListener("change", onInput);
  main.addEventListener("change", onWorkFile);
  main.addEventListener("submit", onSubmit);
  document.querySelector("#gate").addEventListener("submit", onGateSubmit);
  document.querySelector("#logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    state.profile = null;
    state.students = [];
    state.people = [];
    state.attempts = [];
    state.mistakes = [];
    state.authError = "";
    state.authNotice = "";
    applyAttempts([]);
    location.hash = "#/";
    render();
  });
  window.addEventListener("hashchange", () => {
    state.formError = "";
    state.authError = "";
    render();
  });
  const sessionResult = await sb.auth.getSession();
  if (sessionResult.data.session) await loadWorkspace(sessionResult.data.session.user);
  else render();
});
