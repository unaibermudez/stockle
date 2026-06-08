/* ── Configuración ──────────────────────────────────────────────────────── */
const MAX_GUESSES = 6;
const EPOCH = Date.UTC(2025, 0, 1);

const COUNTRY_CODE = {
  España:"ESP", USA:"USA", Taiwan:"TWN", Netherlands:"NLD", Germany:"DEU",
  Denmark:"DNK", Switzerland:"CHE", France:"FRA", Japan:"JPN", China:"CHN",
  Canada:"CAN", UK:"GBR", India:"IND", Brazil:"BRA", Australia:"AUS",
  "South Korea":"KOR", "Saudi Arabia":"SAU", Sweden:"SWE"
};
const SECTOR_LABEL = {
  Technology:"Tecnología", Communications:"Telecom",
  "Consumer Cyclical":"Cons. Discr.", "Consumer Defensive":"Cons. Básico",
  Financials:"Finanzas", Energy:"Energía", Healthcare:"Salud",
  Industrials:"Industrial", Materials:"Materiales", "Real Estate":"Inmobiliaria"
};
const COLUMNS = [
  { key:"ticker",    label:"Ticker",     kind:"cat", fmt: s => s.ticker },
  { key:"country",   label:"País",       kind:"cat", fmt: s => COUNTRY_CODE[s.country] || s.country.slice(0,3).toUpperCase() },
  { key:"sector",    label:"Sector",     kind:"cat", fmt: s => SECTOR_LABEL[s.sector] || s.sector },
  { key:"marketCap", label:"Cap. Burs.", kind:"num", fmt: s => fmtMoney(s.marketCap) },
  { key:"price",     label:"Precio",     kind:"num", fmt: s => fmtPrice(s.price) },
  { key:"ebitda",    label:"EBITDA",     kind:"num", fmt: s => fmtMoney(s.ebitda) },
  { key:"employees", label:"Empleados",  kind:"num", fmt: s => fmtEmp(s.employees) },
  { key:"founded",   label:"Fundada",    kind:"num", fmt: s => "" + s.founded }
];
const SQ = { green:"🟩", amber:"🟨", red:"🟥" };
const SVG_SHARE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>`;
const SVG_CHECK = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4.5 4.5L19 7"/></svg>`;
const SVG_CLOSE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/* ── Formato ─────────────────────────────────────────────────────────────── */
function fmtMoney(b) {
  if (b >= 1000) return "$" + (b / 1000).toFixed(b >= 10000 ? 0 : 1) + "T";
  if (b >= 100)  return "$" + Math.round(b) + "B";
  if (b >= 10)   return "$" + b.toFixed(0) + "B";
  return "$" + b.toFixed(1) + "B";
}
function fmtPrice(p) {
  if (p >= 100) return "$" + Math.round(p);
  if (p >= 10)  return "$" + p.toFixed(0);
  return "$" + p.toFixed(p < 1 ? 2 : 1);
}
function fmtEmp(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return "" + n;
}

/* ── Puzzle ─────────────────────────────────────────────────────────────── */
function puzzleNumber() {
  const d = new Date();
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((utc - EPOCH) / 86400000);
}
function getDailyAnswer(pn) {
  return STOCKS[((pn % STOCKS.length) + STOCKS.length) % STOCKS.length];
}

/* ── Comparación ─────────────────────────────────────────────────────────── */
function compareCell(col, guess, answer) {
  if (col.kind === "cat") {
    return { state: guess[col.key] === answer[col.key] ? "green" : "red", dir: null };
  }
  const g = guess[col.key], a = answer[col.key];
  const dir = a > g ? "up" : a < g ? "down" : null;
  if (col.key === "founded") {
    const d = Math.abs(a - g);
    if (d === 0) return { state: "green", dir: null };
    if (d <= 8)  return { state: "amber", dir };
    return { state: "red", dir };
  }
  const ratio = g / a;
  if (ratio >= 0.95 && ratio <= 1.05) return { state: "green", dir: null };
  if (ratio >= 0.5  && ratio <= 2.0)  return { state: "amber", dir };
  return { state: "red", dir };
}

/* ── Almacenamiento ─────────────────────────────────────────────────────── */
function loadGame(pn) {
  try { return JSON.parse(localStorage.getItem("stockle_game_" + pn)) || null; } catch { return null; }
}
function saveGame(pn, data) {
  try { localStorage.setItem("stockle_game_" + pn, JSON.stringify(data)); } catch {}
}
function loadStats() {
  try {
    return JSON.parse(localStorage.getItem("stockle_stats")) ||
      { currentStreak:0, maxStreak:0, played:0, wins:0, lastWonPuzzle:null };
  } catch {
    return { currentStreak:0, maxStreak:0, played:0, wins:0, lastWonPuzzle:null };
  }
}
function saveStats(s) { try { localStorage.setItem("stockle_stats", JSON.stringify(s)); } catch {} }

/* ── Estado ──────────────────────────────────────────────────────────────── */
let G = { pn:0, answer:null, guesses:[], status:"playing", stats:null, lastAdded:-1 };
let DEV = window.location.search.includes("dev=1");

/* ── Badge / logo ────────────────────────────────────────────────────────── */
function makeBadge(stock, size) {
  size = size || 56;
  const div = document.createElement("div");
  div.className = "logo-badge";
  div.style.cssText = `width:${size}px;height:${size}px;border-radius:${Math.round(size*0.25)}px;` +
    `background:linear-gradient(160deg,${stock.color}33,${stock.color}12);border:1px solid ${stock.color}66;`;
  const span = document.createElement("span");
  span.className = "logo-badge-text";
  span.style.cssText = `color:${stock.color};font-size:${Math.round(size*0.26)}px;text-shadow:0 0 12px ${stock.color}55;`;
  span.textContent = stock.ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 4);
  div.appendChild(span);
  return div;
}

/* ── Cuadrícula ──────────────────────────────────────────────────────────── */
function buildTile(col, guess, answer, isNew, delay) {
  const cmp = compareCell(col, guess, answer);
  const value = col.fmt(guess);
  const div = document.createElement("div");
  div.className = "tile tile-" + cmp.state;
  if (isNew) div.style.animation = `tileIn .42s cubic-bezier(.2,.7,.2,1) ${delay}ms both`;
  const inner = document.createElement("div");
  inner.className = "tile-val";
  inner.style.fontSize = value.length > 6 ? "11.5px" : "13px";
  const txt = document.createElement("span");
  txt.textContent = value;
  inner.appendChild(txt);
  if (cmp.dir) {
    const arrow = document.createElement("span");
    arrow.className = "tile-dir";
    arrow.textContent = cmp.dir === "up" ? "▲" : "▼";
    inner.appendChild(arrow);
  }
  div.appendChild(inner);
  return div;
}

function buildEmptyTile() {
  const d = document.createElement("div");
  d.className = "tile tile-empty";
  return d;
}

function buildRow(guess, answer, isNew, isWin) {
  const row = document.createElement("div");
  row.className = "grid-row grid-cols";
  if (isNew) row.style.animation = "rowIn .44s cubic-bezier(.2,.8,.2,1) both";
  if (isWin) {
    row.dataset.winrow = "1";
    row.style.animation = "rowIn .44s cubic-bezier(.2,.8,.2,1) both, winGlow 1.6s ease-in-out .25s infinite";
  }
  for (let ci = 0; ci < COLUMNS.length; ci++) {
    row.appendChild(buildTile(COLUMNS[ci], guess, answer, isNew, ci * 60));
  }
  return row;
}

function renderGrid() {
  const section = document.getElementById("grid-section");
  section.innerHTML = "";
  const inner = document.createElement("div");
  inner.className = "grid-inner";

  const hdr = document.createElement("div");
  hdr.className = "grid-cols grid-header";
  for (const col of COLUMNS) {
    const cell = document.createElement("div");
    cell.className = "grid-header-cell";
    cell.textContent = col.label;
    hdr.appendChild(cell);
  }
  inner.appendChild(hdr);

  const rows = document.createElement("div");
  rows.className = "grid-rows";
  const won = G.status === "won";
  for (let ri = 0; ri < G.guesses.length; ri++) {
    const g = G.guesses[ri];
    rows.appendChild(buildRow(g, G.answer, ri === G.lastAdded, won && g.ticker === G.answer.ticker));
  }
  for (let i = 0; i < Math.max(0, MAX_GUESSES - G.guesses.length); i++) {
    const row = document.createElement("div");
    row.className = "grid-row grid-cols";
    for (let j = 0; j < COLUMNS.length; j++) row.appendChild(buildEmptyTile());
    rows.appendChild(row);
  }
  inner.appendChild(rows);
  section.appendChild(inner);
}

/* ── Cabecera / meta ────────────────────────────────────────────────────── */
function renderStreak() {
  const badge = document.getElementById("streak-badge");
  badge.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 2c1 3-1.5 4.5-1.5 7 0 1 .6 1.8 1.5 1.8S13.5 10 13.5 9c1.2 1 2 2.6 2 4.4A5.5 5.5 0 1 1 6.6 9.6C8 8 9 6 8.8 3.6c1.6.9 2.4 2.2 3.2-1.6Z" fill="currentColor"/></svg><span class="mono num">${G.stats.currentStreak}</span>`;
}

function renderMeta() {
  const over = G.status !== "playing";
  document.getElementById("guess-num").textContent =
    Math.min(G.guesses.length + (over ? 0 : 1), MAX_GUESSES);
  document.getElementById("puzzle-label").textContent = "DÍA #" + G.pn;
}

function updateSearch() {
  const input = document.getElementById("search-input");
  const box   = document.getElementById("search-box");
  const over  = G.status !== "playing";
  input.disabled = over;
  input.placeholder = over ? "Partida acabada — vuelve mañana" : "Adivina una acción — nombre o ticker…";
  box.classList.toggle("disabled", over);
  if (over) document.getElementById("autocomplete").classList.add("hidden");
}

/* ── Autocompletado ──────────────────────────────────────────────────────── */
let AC = { open:false, hi:0, results:[] };

function filterStocks(q) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const starts = [], incl = [];
  for (const s of STOCKS) {
    const nm = s.name.toLowerCase(), tk = s.ticker.toLowerCase();
    if (tk.startsWith(t) || nm.startsWith(t)) starts.push(s);
    else if (nm.includes(t) || tk.includes(t)) incl.push(s);
  }
  return [...starts, ...incl].slice(0, 7);
}

function renderAC() {
  const ac = document.getElementById("autocomplete");
  ac.innerHTML = "";
  for (let i = 0; i < AC.results.length; i++) {
    const s = AC.results[i];
    const used = G.guesses.some(g => g.ticker === s.ticker);
    const btn = document.createElement("button");
    btn.className = "ac-item" + (i === AC.hi && !used ? " hi" : "") + (used ? " used" : "");
    btn.type = "button";
    btn.disabled = used;

    const badge = makeBadge(s, 30);
    badge.style.borderRadius = "8px";

    const info = document.createElement("div");
    info.style.cssText = "min-width:0;flex:1";
    const nm   = document.createElement("div"); nm.className = "ac-name";      nm.textContent = s.name;
    const meta = document.createElement("div"); meta.className = "ac-meta mono";
    meta.textContent = s.country + " · " + (SECTOR_LABEL[s.sector] || s.sector);
    info.appendChild(nm); info.appendChild(meta);

    const tk = document.createElement("span");
    tk.className = "ac-ticker";
    tk.textContent = used ? "usada" : s.ticker;

    btn.appendChild(badge); btn.appendChild(info); btn.appendChild(tk);

    btn.addEventListener("mouseenter", () => {
      if (!used) {
        AC.hi = i;
        ac.querySelectorAll(".ac-item").forEach((el, j) =>
          el.classList.toggle("hi", j === i && !el.classList.contains("used")));
      }
    });
    btn.addEventListener("mousedown", e => { e.preventDefault(); if (!used) submitGuess(s); });
    ac.appendChild(btn);
  }
}

function openAC(q) {
  if (G.status !== "playing") return;
  AC.results = filterStocks(q);
  AC.hi = 0;
  AC.open = AC.results.length > 0;
  const ac = document.getElementById("autocomplete");
  if (AC.open) { ac.classList.remove("hidden"); renderAC(); }
  else ac.classList.add("hidden");
}

function closeAC() {
  AC.open = false;
  document.getElementById("autocomplete").classList.add("hidden");
}

function submitGuess(s) {
  document.getElementById("search-input").value = "";
  closeAC();
  handleGuess(s);
}

function setupSearch() {
  const input = document.getElementById("search-input");
  const box   = document.getElementById("search-box");
  input.addEventListener("input",  () => openAC(input.value));
  input.addEventListener("focus",  () => { box.classList.add("focused"); if (input.value.trim()) openAC(input.value); });
  input.addEventListener("blur",   () => { box.classList.remove("focused"); setTimeout(closeAC, 150); });
  input.addEventListener("keydown", e => {
    if (G.status !== "playing") return;
    if (!AC.open || !AC.results.length) { if (e.key === "ArrowDown" && input.value.trim()) openAC(input.value); return; }
    if      (e.key === "ArrowDown") { e.preventDefault(); AC.hi = Math.min(AC.hi+1, AC.results.length-1); renderAC(); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); AC.hi = Math.max(AC.hi-1, 0); renderAC(); }
    else if (e.key === "Enter")     { e.preventDefault(); const s = AC.results[AC.hi]; if (s && !G.guesses.some(g => g.ticker === s.ticker)) submitGuess(s); }
    else if (e.key === "Escape")    closeAC();
  });
}

/* ── Estadísticas ───────────────────────────────────────────────────────── */
function recordStats(won) {
  const prev = G.stats, ns = { ...prev };
  ns.played += 1;
  if (won) {
    ns.wins += 1;
    ns.currentStreak = prev.lastWonPuzzle === G.pn - 1 ? prev.currentStreak + 1 : 1;
    ns.maxStreak = Math.max(ns.maxStreak, ns.currentStreak);
    ns.lastWonPuzzle = G.pn;
  } else { ns.currentStreak = 0; }
  G.stats = ns;
  saveStats(ns);
  renderStreak();
}

/* ── Confeti ─────────────────────────────────────────────────────────────── */
function fireConfetti(x, y) {
  const colors = ["#00ff88","#f59e0b","#34d399","#ffffff","#10b981"];
  let canvas = document.getElementById("confetti-canvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "confetti-canvas";
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    document.body.appendChild(canvas);
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const W = window.innerWidth, H = window.innerHeight;
  const ox = x != null ? x : W/2, oy = y != null ? y : H*0.38;
  const particles = Array.from({length:160}, () => {
    const angle = Math.PI*2*Math.random(), speed = 6+Math.random()*11;
    return { x:ox, y:oy, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-6,
      size:4+Math.random()*7, color:colors[Math.floor(Math.random()*colors.length)],
      rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.4, life:1, rect:Math.random()>0.5 };
  });
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of particles) {
      p.vx *= 0.985; p.vy = p.vy*0.985+0.32; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (t > 1400) p.life -= 0.04;
      if (p.life <= 0 || p.y > H+40) continue;
      alive = true;
      ctx.save(); ctx.globalAlpha = Math.max(0,p.life);
      ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if (p.rect) ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      else { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame); else ctx.clearRect(0,0,W,H);
  })(start);
}

/* ── Procesar intento ────────────────────────────────────────────────────── */
function handleGuess(stock) {
  if (G.status !== "playing") return;
  if (G.guesses.some(g => g.ticker === stock.ticker)) return;

  G.guesses = [...G.guesses, stock];
  G.lastAdded = G.guesses.length - 1;

  const won  = stock.ticker === G.answer.ticker;
  const lost = !won && G.guesses.length >= MAX_GUESSES;

  if (won || lost) {
    G.status = won ? "won" : "lost";
    saveGame(G.pn, { guesses: G.guesses.map(s => s.ticker), status: G.status });
    recordStats(won);
  } else {
    saveGame(G.pn, { guesses: G.guesses.map(s => s.ticker), status:"playing" });
  }

  renderGrid(); renderMeta(); updateSearch();

  if (won) {
    setTimeout(() => {
      const r = document.querySelector("[data-winrow]");
      const rect = r ? r.getBoundingClientRect() : null;
      fireConfetti(rect ? rect.left + rect.width/2 : undefined, rect ? rect.top+8 : undefined);
    }, 480);
    setTimeout(showResultModal, 1300);
  } else if (lost) {
    setTimeout(showResultModal, 900);
  }
}

/* ── Cuenta atrás ────────────────────────────────────────────────────────── */
let cdInterval = null;
function startCountdown(el) {
  clearInterval(cdInterval);
  function tick() {
    const now = new Date(), next = new Date(now);
    next.setHours(24,0,0,0);
    let s = Math.max(0, Math.floor((next-now)/1000));
    el.textContent = String(Math.floor(s/3600)).padStart(2,"0") + ":" +
      String(Math.floor((s%3600)/60)).padStart(2,"0") + ":" +
      String(s%60).padStart(2,"0");
  }
  tick(); cdInterval = setInterval(tick,1000);
}

/* ── Compartir ───────────────────────────────────────────────────────────── */
function buildShareText() {
  const head = "STOCKLE #" + G.pn + "  " + (G.status==="won" ? G.guesses.length+"/"+MAX_GUESSES : "X/"+MAX_GUESSES);
  const grid = G.guesses.map(g => COLUMNS.map(c => SQ[compareCell(c,g,G.answer).state]).join("")).join("\n");
  return head + "\n" + grid + "\n🟩=exacto 🟨=cerca 🟥=frío\njuega → stockle.app";
}
function doShare(onDone) {
  const text = buildShareText(), done = () => { if (onDone) onDone(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done,done);
  else {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta); done();
  }
}

/* ── Modales ─────────────────────────────────────────────────────────────── */
function closeModals() {
  clearInterval(cdInterval); cdInterval = null;
  document.querySelectorAll(".modal-overlay").forEach(el => el.remove());
}

function makeOverlay() {
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.addEventListener("click", e => { if (e.target === ov) closeModals(); });
  return ov;
}
function makeCloseBtn() {
  const btn = document.createElement("button");
  btn.className = "modal-close"; btn.innerHTML = SVG_CLOSE;
  btn.addEventListener("click", closeModals);
  return btn;
}

function showResultModal() {
  closeModals();
  const won = G.status === "won", a = G.answer, st = G.stats;
  const ov = makeOverlay();
  const modal = document.createElement("div");
  modal.className = "modal";

  // Encabezado
  const hdr = document.createElement("div"); hdr.className = "modal-hdr";
  const status = document.createElement("span");
  status.className = "modal-status " + (won ? "won" : "lost");
  status.textContent = won ? "◆ Posición cerrada — en beneficio" : "◆ Margin call";
  hdr.appendChild(status); hdr.appendChild(makeCloseBtn());

  // Tarjeta acción
  const card = document.createElement("div"); card.className = "modal-card";
  card.style.cssText = `background:linear-gradient(160deg,${a.color}1f,transparent);border:1px solid ${a.color}44;`;
  const nameWrap = document.createElement("div"); nameWrap.style.minWidth = "0";
  const nameEl = document.createElement("div"); nameEl.className = "modal-stock-name"; nameEl.textContent = a.name;
  const metaEl = document.createElement("div"); metaEl.className = "modal-stock-meta";
  metaEl.textContent = a.ticker + " · " + a.country;
  nameWrap.appendChild(nameEl); nameWrap.appendChild(metaEl);
  card.appendChild(makeBadge(a,58)); card.appendChild(nameWrap);

  // Datos
  const dataGrid = document.createElement("div"); dataGrid.className = "modal-data";
  for (const [k,v] of [
    ["Sector",     SECTOR_LABEL[a.sector] || a.sector],
    ["Fundada",    a.founded],
    ["Cap. Burs.", fmtMoney(a.marketCap)],
    ["Precio",     fmtPrice(a.price)],
    ["EBITDA",     fmtMoney(a.ebitda)],
    ["Empleados",  fmtEmp(a.employees)]
  ]) {
    const cell = document.createElement("div"); cell.className = "modal-cell";
    const kEl = document.createElement("div"); kEl.className = "modal-cell-k"; kEl.textContent = k;
    const vEl = document.createElement("div"); vEl.className = "modal-cell-v"; vEl.textContent = v;
    cell.appendChild(kEl); cell.appendChild(vEl); dataGrid.appendChild(cell);
  }

  // Estadísticas
  const statsRow = document.createElement("div"); statsRow.className = "modal-stats";
  for (const [k,v] of [
    ["Racha", st.currentStreak], ["Máx.", st.maxStreak],
    ["Jugadas", st.played], ["% Vic.", st.played ? Math.round((st.wins/st.played)*100) : 0]
  ]) {
    const s = document.createElement("div"); s.className = "modal-stat";
    const sv = document.createElement("div"); sv.className = "modal-stat-v"; sv.textContent = v;
    const sk = document.createElement("div"); sk.className = "modal-stat-k"; sk.textContent = k;
    s.appendChild(sv); s.appendChild(sk); statsRow.appendChild(s);
  }

  // Siguiente
  const nextRow = document.createElement("div"); nextRow.className = "modal-next";
  const nextLeft = document.createElement("div");
  const lbl = document.createElement("div"); lbl.className = "modal-next-lbl"; lbl.textContent = "Siguiente acción";
  const cd  = document.createElement("div"); cd.className = "modal-countdown";
  nextLeft.appendChild(lbl); nextLeft.appendChild(cd);
  const shareBtn = document.createElement("button"); shareBtn.className = "share-btn";
  shareBtn.innerHTML = SVG_SHARE + "Compartir";
  shareBtn.addEventListener("click", () => {
    doShare(() => { shareBtn.innerHTML = SVG_CHECK + "¡Copiado!"; setTimeout(() => { shareBtn.innerHTML = SVG_SHARE + "Compartir"; }, 1800); });
  });
  nextRow.appendChild(nextLeft); nextRow.appendChild(shareBtn);

  // Pie
  const foot = document.createElement("div"); foot.className = "modal-foot";
  foot.textContent = "Stockle #" + G.pn + " · " + (won ? G.guesses.length+"/"+MAX_GUESSES : "X/"+MAX_GUESSES);

  modal.appendChild(hdr); modal.appendChild(card); modal.appendChild(dataGrid);
  modal.appendChild(statsRow); modal.appendChild(nextRow); modal.appendChild(foot);
  ov.appendChild(modal); document.body.appendChild(ov);
  startCountdown(cd);
}

function showHowToModal() {
  closeModals();
  const ov = makeOverlay();
  const modal = document.createElement("div"); modal.className = "modal howto";

  const hdr = document.createElement("div"); hdr.className = "modal-hdr"; hdr.style.marginBottom = "8px";
  const title = document.createElement("h2"); title.className = "howto-title"; title.textContent = "Cómo jugar";
  hdr.appendChild(title); hdr.appendChild(makeCloseBtn());

  const desc = document.createElement("p"); desc.className = "howto-desc";
  desc.innerHTML = 'Adivina la acción misteriosa en <strong style="color:var(--text)">6 intentos</strong>. Cada intento revela cómo se comparan sus datos con los de la acción objetivo.';

  const rows = document.createElement("div"); rows.className = "howto-rows";
  for (const [bg,bd,tx,lbl,txt] of [
    ["rgba(0,255,136,0.16)","rgba(0,255,136,0.55)","#5dffb4","$3.3T","Coincidencia exacta — el atributo es correcto."],
    ["rgba(245,158,11,0.15)","rgba(245,158,11,0.5)","#fbc66b","$1.2T▲","Cerca — en el rango. ▲ sube · ▼ baja."],
    ["rgba(239,68,68,0.12)","rgba(239,68,68,0.38)","#f3a3a3","Energía","Frío — categoría incorrecta o muy lejos (la flecha indica dirección)."]
  ]) {
    const row = document.createElement("div"); row.className = "howto-row";
    const tile = document.createElement("div"); tile.className = "howto-tile";
    tile.style.cssText = `background:${bg};border:1px solid ${bd};color:${tx};`;
    tile.textContent = lbl;
    const text = document.createElement("span"); text.className = "howto-text"; text.textContent = txt;
    row.appendChild(tile); row.appendChild(text); rows.appendChild(row);
  }

  modal.appendChild(hdr); modal.appendChild(desc); modal.appendChild(rows);
  ov.appendChild(modal); document.body.appendChild(ov);
}

/* ── Modo desarrollador ─────────────────────────────────────────────────── */
function showDevStockList() {
  closeModals();
  const ov = makeOverlay();
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.cssText = "max-width:760px;width:95vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;";

  const hdr = document.createElement("div"); hdr.className = "modal-hdr"; hdr.style.flexShrink = "0";
  const title = document.createElement("h2"); title.className = "howto-title";
  title.textContent = "Pool completo — " + STOCKS.length + " acciones";
  hdr.appendChild(title); hdr.appendChild(makeCloseBtn());

  // Filter bar
  const filterRow = document.createElement("div");
  filterRow.style.cssText = "display:flex;gap:8px;margin-bottom:10px;flex-shrink:0;flex-wrap:wrap;";

  const filterInput = document.createElement("input");
  filterInput.placeholder = "Filtrar por nombre, ticker, país…";
  filterInput.style.cssText = "flex:1;min-width:160px;background:rgba(140,165,200,0.06);border:1px solid var(--border-strong);" +
    "border-radius:8px;padding:6px 10px;color:var(--text);font-family:inherit;font-size:13px;outline:none;";

  const countries = ["Todos", ...new Set(STOCKS.map(s => s.country).sort())];
  const countrySelect = document.createElement("select");
  countrySelect.style.cssText = "background:rgba(140,165,200,0.06);border:1px solid var(--border-strong);" +
    "border-radius:8px;padding:6px 10px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer;";
  countries.forEach(c => { const o = document.createElement("option"); o.value = c; o.textContent = c; countrySelect.appendChild(o); });

  filterRow.appendChild(filterInput); filterRow.appendChild(countrySelect);

  // Table
  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "overflow-y:auto;flex:1;border-radius:8px;border:1px solid var(--border);";

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;font-size:12.5px;";

  const thead = document.createElement("thead");
  thead.style.cssText = "position:sticky;top:0;background:var(--panel-solid);z-index:1;";
  const headRow = document.createElement("tr");
  for (const [lbl, align] of [
    ["Ticker","left"], ["Nombre","left"], ["País","left"],
    ["Sector","left"], ["Cap.Burs.","right"], ["Precio","right"],
    ["EBITDA","right"], ["Empleados","right"], ["Fundada","right"]
  ]) {
    const th = document.createElement("th");
    th.textContent = lbl;
    th.style.cssText = `text-align:${align};padding:7px 9px;color:var(--muted);font-size:10.5px;` +
      "letter-spacing:0.06em;text-transform:uppercase;border-bottom:1px solid var(--border);font-weight:600;white-space:nowrap;";
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  function buildRows(list) {
    tbody.innerHTML = "";
    list.forEach((s, i) => {
      const tr = document.createElement("tr");
      const isAnswer = s.ticker === G.answer.ticker;
      tr.style.cssText = "border-bottom:1px solid rgba(140,165,200,0.06);" +
        (isAnswer ? "background:rgba(0,255,136,0.07);" : (i%2===0 ? "" : "background:rgba(140,165,200,0.02);"));
      tr.addEventListener("mouseover", () => { tr.style.background = "rgba(245,158,11,0.07)"; });
      tr.addEventListener("mouseout",  () => {
        tr.style.background = isAnswer ? "rgba(0,255,136,0.07)" : (i%2===0 ? "" : "rgba(140,165,200,0.02)");
      });

      const cells = [
        [s.ticker, "left", "font-family:'JetBrains Mono',monospace;font-weight:700;color:" + (isAnswer ? "var(--green)" : "var(--green)") + ";white-space:nowrap;"],
        [s.name + (isAnswer ? " ★" : ""), "left", "font-weight:600;" + (isAnswer ? "color:var(--green);" : "")],
        [s.country, "left", "color:var(--muted);"],
        [SECTOR_LABEL[s.sector] || s.sector, "left", "color:var(--muted);white-space:nowrap;"],
        [fmtMoney(s.marketCap), "right", "font-family:'JetBrains Mono',monospace;"],
        [fmtPrice(s.price), "right", "font-family:'JetBrains Mono',monospace;"],
        [fmtMoney(s.ebitda), "right", "font-family:'JetBrains Mono',monospace;"],
        [fmtEmp(s.employees), "right", "font-family:'JetBrains Mono',monospace;"],
        ["" + s.founded, "right", "font-family:'JetBrains Mono',monospace;"]
      ];
      cells.forEach(([val, align, extra]) => {
        const td = document.createElement("td");
        td.textContent = val;
        td.style.cssText = `text-align:${align};padding:6px 9px;${extra}`;
        tr.appendChild(td);
      });

      const btnTd = document.createElement("td");
      btnTd.style.cssText = "padding:4px 6px;";
      if (!isAnswer) {
        const pickBtn = document.createElement("button");
        pickBtn.textContent = "▶";
        pickBtn.title = "Usar como respuesta";
        pickBtn.style.cssText = "background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);" +
          "border-radius:5px;padding:2px 6px;color:var(--amber);cursor:pointer;font-size:11px;";
        pickBtn.addEventListener("click", () => {
          G.answer = s; G.guesses = []; G.status = "playing"; G.lastAdded = -1;
          resetHintCooldown(); closeModals(); renderAll();
        });
        btnTd.appendChild(pickBtn);
      } else {
        btnTd.textContent = "✓";
        btnTd.style.cssText += "color:var(--green);font-weight:800;text-align:center;";
      }
      tr.appendChild(btnTd);
      tbody.appendChild(tr);
    });
  }

  function applyFilters() {
    const q = filterInput.value.trim().toLowerCase();
    const country = countrySelect.value;
    let list = STOCKS.slice();
    if (country !== "Todos") list = list.filter(s => s.country === country);
    if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q) || s.country.toLowerCase().includes(q));
    buildRows(list);
  }

  filterInput.addEventListener("input", applyFilters);
  countrySelect.addEventListener("change", applyFilters);
  buildRows(STOCKS.slice());

  table.appendChild(tbody);
  tableWrap.appendChild(table);

  const foot = document.createElement("div");
  foot.style.cssText = "flex-shrink:0;padding-top:8px;font-size:12px;color:var(--muted);text-align:right;";
  foot.textContent = "★ = respuesta actual · ▶ = fijar como respuesta";

  modal.appendChild(hdr); modal.appendChild(filterRow); modal.appendChild(tableWrap); modal.appendChild(foot);
  ov.appendChild(modal); document.body.appendChild(ov);
}

function renderDevBar() {
  const existing = document.getElementById("dev-bar");
  if (!DEV) { if (existing) existing.remove(); return; }

  const bar = existing || document.createElement("div");
  bar.id = "dev-bar";
  if (!existing) {
    bar.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 12px;margin-bottom:10px;" +
      "border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.4);" +
      "font-size:12.5px;color:var(--amber);flex-wrap:wrap;";
    document.getElementById("root").insertBefore(bar, document.querySelector("header"));
  }

  bar.innerHTML = "";

  const badge = document.createElement("span");
  badge.style.cssText = "font-family:'JetBrains Mono',monospace;font-weight:800;font-size:10px;" +
    "letter-spacing:0.1em;padding:2px 7px;border-radius:4px;background:rgba(245,158,11,0.25);white-space:nowrap;";
  badge.textContent = "⚙ DEV";

  const label = document.createElement("span");
  label.style.cssText = "flex:1;font-family:'JetBrains Mono',monospace;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  label.textContent = "Respuesta: " + G.answer.ticker + " — " + G.answer.name;

  const devBtnStyle = "background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.35);" +
    "border-radius:6px;padding:4px 10px;color:var(--amber);cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;white-space:nowrap;";

  const listBtn = document.createElement("button");
  listBtn.style.cssText = devBtnStyle;
  listBtn.textContent = "Ver acciones ☰";
  listBtn.addEventListener("click", showDevStockList);

  const changeBtn = document.createElement("button");
  changeBtn.style.cssText = devBtnStyle;
  changeBtn.textContent = "Cambiar →";
  changeBtn.addEventListener("click", () => {
    const others = STOCKS.filter(s => s.ticker !== G.answer.ticker);
    G.answer   = others[Math.floor(Math.random() * others.length)];
    G.guesses  = [];
    G.status   = "playing";
    G.lastAdded = -1;
    resetHintCooldown(); closeModals();
    renderAll();
  });

  bar.appendChild(badge); bar.appendChild(label); bar.appendChild(listBtn); bar.appendChild(changeBtn);
}

/* ── Pista ───────────────────────────────────────────────────────────────── */
function getHintStock() {
  const usedTickers = new Set(G.guesses.map(g => g.ticker));
  usedTickers.add(G.answer.ticker);

  // Columnas que todavía no están en verde
  const greenCols = new Set(["ticker"]);
  for (const g of G.guesses) {
    for (const col of COLUMNS) {
      if (col.key === "ticker") continue;
      if (compareCell(col, g, G.answer).state === "green") greenCols.add(col.key);
    }
  }
  const needCols = COLUMNS.filter(c => !greenCols.has(c.key));
  if (!needCols.length) return null;

  // Stocks que coinciden en al menos uno de esos campos
  const candidates = STOCKS.filter(s => {
    if (usedTickers.has(s.ticker)) return false;
    return needCols.some(col => {
      if (col.kind === "cat") return s[col.key] === G.answer[col.key];
      if (col.key === "founded") return s[col.key] === G.answer[col.key];
      const ratio = s[col.key] / G.answer[col.key];
      return ratio >= 0.95 && ratio <= 1.05;
    });
  });

  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const HINT_COOLDOWN_MS = 30000;
let hintLastUsed = 0;
let hintCdInterval = null;

function resetHintCooldown() { hintLastUsed = 0; clearInterval(hintCdInterval); hintCdInterval = null; }

const HINT_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.7 2.7 0 0 1 5.2 1c0 1.8-2.7 2-2.7 4"/><path d="M12 17.5h.01"/></svg>`;

function renderFooter() {
  const footer = document.getElementById("footer");
  footer.innerHTML = "";
  clearInterval(hintCdInterval); hintCdInterval = null;
  if (G.status !== "playing" || G.guesses.length >= MAX_GUESSES) return;

  const hint = getHintStock();

  const btn = document.createElement("button");
  btn.id = "btn-hint";
  btn.style.cssText = "display:flex;align-items:center;gap:7px;background:none;" +
    "border:1px solid var(--border);border-radius:10px;padding:8px 16px;" +
    "color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:600;" +
    "transition:border-color .15s,color .15s;";

  function setReady() {
    btn.disabled = false;
    btn.style.cursor = "pointer";
    btn.style.opacity = "1";
    btn.innerHTML = HINT_ICON + "Dame una pista";
    btn.onmouseover = () => { btn.style.borderColor = "var(--border-strong)"; btn.style.color = "var(--text)"; };
    btn.onmouseout  = () => { btn.style.borderColor = ""; btn.style.color = "var(--muted)"; };
  }

  function setNoHint() {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
    btn.style.opacity = "0.45";
    btn.innerHTML = HINT_ICON + "Sin pistas disponibles";
    btn.onmouseover = null; btn.onmouseout = null;
  }

  function setCooldown(secsLeft) {
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
    btn.style.opacity = "0.6";
    btn.innerHTML = HINT_ICON + "Pista en " + secsLeft + "s…";
    btn.onmouseover = null; btn.onmouseout = null;
  }

  function tick() {
    const remaining = Math.ceil((HINT_COOLDOWN_MS - (Date.now() - hintLastUsed)) / 1000);
    if (remaining <= 0) {
      clearInterval(hintCdInterval); hintCdInterval = null;
      if (hint) setReady(); else setNoHint();
    } else {
      setCooldown(remaining);
    }
  }

  const onCooldown = hintLastUsed > 0 && (Date.now() - hintLastUsed) < HINT_COOLDOWN_MS;

  if (onCooldown) {
    tick();
    hintCdInterval = setInterval(tick, 500);
  } else if (hint) {
    setReady();
  } else {
    setNoHint();
  }

  btn.addEventListener("click", () => {
    if (!hint || btn.disabled) return;
    hintLastUsed = Date.now();
    setCooldown(Math.ceil(HINT_COOLDOWN_MS / 1000));
    hintCdInterval = setInterval(tick, 500);
    handleGuess(hint);
  });

  footer.appendChild(btn);
}

/* ── Render completo ────────────────────────────────────────────────────── */
function renderAll() {
  renderStreak(); renderMeta(); updateSearch(); renderGrid(); renderDevBar(); renderFooter();
  const input = document.getElementById("search-input");
  if (input) input.value = "";
  document.getElementById("autocomplete").classList.add("hidden");
}

/* ── Inicialización ─────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const pn = puzzleNumber();
  const saved = loadGame(pn);
  G = {
    pn, answer: getDailyAnswer(pn),
    guesses: saved && saved.guesses
      ? saved.guesses.map(tk => STOCKS.find(s => s.ticker === tk)).filter(Boolean)
      : [],
    status: saved ? (saved.status || "playing") : "playing",
    stats: loadStats(), lastAdded: -1
  };

  renderAll();
  setupSearch();

  document.getElementById("btn-how").addEventListener("click", showHowToModal);
  document.getElementById("btn-share").addEventListener("click", () => {
    if (G.status !== "playing") showResultModal(); else doShare(() => {});
  });

  // Atajo teclado para modo dev: Ctrl+Shift+D
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      e.preventDefault();
      DEV = !DEV;
      renderDevBar();
    }
  });

  if (G.status !== "playing") setTimeout(showResultModal, 350);

  if (window.innerWidth < 560) {
    const kbd = document.getElementById("search-kbd");
    if (kbd) kbd.style.display = "none";
  }
});
