
const THEMES = {
  "מוות ואבל": "פרידות, לוויות, ומי שנשאר בחדר אחרי שהדלת נסגרת.",
  "זקנה ושיכחה": "זיכרון שהולך, גוף שמסרב, ושמות שחוזרים לא נכון.",
  "משפחה ודם": "הורים, אחים, תאומים, וחשבונות ישנים בתוך הבית.",
  "אהבה ופרידה": "מפגשים, געגוע, וזוגות שנפרדים בלי לצאת מהחדר.",
  "תשוקה וגוף": "רצון, בושה, וגוף שמדבר לפני האדם.",
  "מלחמה ואלימות": "חיילים, מחבלים, וזעם שנשאר אחרי שהירי נגמר.",
  "שואה וגרמנים": "היטלר, נאצים, וזיכרון אירופה שיושב בתוך יום רגיל.",
  "קיבוץ ומקום": "קיבוץ, שכונה, כביש, ועיר שמשנה את מי שגר בה.",
  "זהות וכפילות": "מי אני, מי דומה לי, ושם שלא יושב על האדם.",
  "יום־יום ישראלי": "מרכול, תור, הודעה בטלפון, וחיים קטנים שמתפקעים.",
  "אמנות וכתיבה": "סופרים, מלחינים, וסיפור שמסתכל על עצמו.",
  "אבסורד וחלום": "חלומות, היגיון עקום, ומשפטים שרצים עד הקצה.",
  "ילדות": "ילדים, הורים, ומה שנשאר מהבית הראשון.",
  "בעלי חיים": "כלב, פרה, זבוב, ויצור שקט ליד האדם."
};

const COVERS = [
  ["#ff500a", "#7a1f6d"],
  ["#111", "#ff500a"],
  ["#0e6b6b", "#123"],
  ["#5b2a86", "#ff7a59"],
  ["#163a70", "#4aa3df"],
  ["#8c1c3a", "#e25b45"],
  ["#1d4d2c", "#9ccc65"],
  ["#3d2b1f", "#e0a15a"],
  ["#202020", "#6d6d6d"],
  ["#b4234a", "#ffb4a2"]
];

const addedSlugs = new Set((window.ADDED_STORIES || []).map(s => s.slug));
const stories = [...(window.STORIES || []), ...(window.ADDED_STORIES || [])].sort((a, b) => a.title.localeCompare(b.title, "he"));
const bySlug = Object.fromEntries(stories.map(s => [s.slug, s]));

function clean(s) {
  return (s || "").replace(/[\u0591-\u05C7]/g, "").replace(/\s+/g, " ").trim();
}
function hasWord(hay, term) {
  const n = clean(term);
  if (n.length < 3) return false;
  const re = new RegExp("(^|[^\\u0590-\\u05FF])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=$|[^\\u0590-\\u05FF])");
  return re.test(clean(hay));
}
function readingMinutes(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
function readingLabel(text) {
  const m = readingMinutes(text);
  return m === 1 ? "דקת קריאה" : "כ־" + m + " דקות קריאה";
}
const hayOf = s => [s.title, ...(s.keywords || []), s.text].join("\n");
const phraseSeen = new Map();
for (const s of stories) {
  for (const raw of s.keywords || []) {
    for (const part of String(raw).split(/[,،]/)) {
      const phrase = part.trim();
      if (phrase.length < 3 || phrase.split(/\s+/).length > 3) continue;
      const key = clean(phrase);
      if (!phraseSeen.has(key)) phraseSeen.set(key, phrase);
    }
  }
}
const sharedTags = [];
for (const [key, display] of phraseSeen) {
  let listed = 0;
  for (const s of stories) {
    if ((s.keywords || []).some(k => clean(k) === key || clean(k).split(/[,،]/).some(part => clean(part) === key))) listed++;
  }
  if (listed < 3) continue;
  let inText = 0;
  for (const s of stories) if (hasWord(hayOf(s), key)) inText++;
  if (inText <= stories.length * 0.25) sharedTags.push({ key, display, n: listed });
}
const notNames = new Set(["המספר", "אמא", "אבא", "האב", "אשתו", "הסבתא", "הסבא", "ילדיו", "בניו", "בנותיו", "הגיבור", "הנערה", "הילד", "הילדה", "אמו של המספר", "אחיו", "אחותו", "בנו", "בתו", "האישה", "הבעל", "בעלה", "אביו", "אמו", "הזקן", "הזקנה"]);
function hasFigure(s, key) {
  return (s.figures || []).some(f => clean(f) === key);
}
const nameSeen = new Map();
for (const s of stories) {
  for (const raw of s.figures || []) {
    const name = String(raw).trim();
    const key = clean(name);
    if (key.length < 3 || notNames.has(key) || name.split(/\s+/).length > 3) continue;
    if (!nameSeen.has(key)) nameSeen.set(key, name);
  }
}
for (const [key, display] of nameSeen) {
  if (sharedTags.some(tag => tag.key === key)) continue;
  const n = stories.filter(s => hasFigure(s, key)).length;
  if (n < 2) continue;
  sharedTags.push({ key, display, n, name: true });
}
function tagsFor(s) {
  const hay = hayOf(s);
  const byRare = (a, b) => a.n - b.n || a.display.localeCompare(b.display, "he");
  const fit = tag => tag.name ? hasFigure(s, tag.key) : hasWord(hay, tag.key) && clean(s.title) !== tag.key;
  return [...sharedTags.filter(tag => !tag.name && fit(tag)).sort(byRare), ...sharedTags.filter(tag => tag.name && fit(tag)).sort(byRare)];
}


const app = document.getElementById("app");
const q = document.getElementById("q");
let mode = "home";
let theme = "";
let query = "";
let openSlug = "";
let view = localStorage.getItem("aba-view") === "list" ? "list" : "cards";
let sortMode = localStorage.getItem("aba-sort") === "date" ? "date" : "alpha";
let signedIn = false;
let openEditor = () => {};
function ordered(list) {
  return list.slice().sort((a, b) => {
    if (sortMode === "date") {
      return (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") || a.title.localeCompare(b.title, "he");
    }
    return a.title.localeCompare(b.title, "he");
  });
}
let readSize = window.matchMedia("(max-width: 800px)").matches ? 19 : 21;

function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[ך]/g, "כ").replace(/[ם]/g, "מ").replace(/[ן]/g, "נ")
    .replace(/[ף]/g, "פ").replace(/[ץ]/g, "צ")
    .replace(/[\u0591-\u05C7]/g, "");
}

function blob(s) {
  return norm([s.title, s.hook, s.synopsis, (s.keywords || []).join(" "), (s.places || []).join(" "), (s.figures || []).join(" "), s.primary, ...(s.secondary || []), s.text].join("\n"));
}

function coverStyle(s) {
  const i = [...s.slug].reduce((n, c) => n + c.charCodeAt(0), 0) % COVERS.length;
  const [c1, c2] = COVERS[i];
  return `--c1:${c1};--c2:${c2}`;
}

function esc(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function highlight(text, term) {
  const safe = esc(text);
  const t = term.trim();
  if (!t) return safe;
  const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return safe.replace(re, m => `<span class="mark">${m}</span>`);
}

function matches(s) {
  if (theme && s.primary !== theme && !(s.secondary || []).includes(theme)) return false;
  if (!query.trim()) return true;
  const tag = sharedTags.find(x => x.key === clean(query));
  if (tag) return tag.name ? hasFigure(s, tag.key) : hasWord(hayOf(s), tag.key);
  return blob(s).includes(norm(query));
}


function illustration(s) {
  const ink = "#1c140f";
  const red = "#b33b2e";
  if (!illustration.variants) {
    const groups = {};
    for (const story of stories) (groups[story.primary || ""] ||= []).push(story);
    illustration.variants = {};
    for (const group of Object.values(groups)) {
      group.sort((a, b) => a.slug.localeCompare(b.slug));
      group.forEach((story, n) => { illustration.variants[story.slug] = n; });
    }
  }
  const n = illustration.variants[s.slug] || 0;
  const shift = [...(s.primary || "")].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  illustration.size = 27;
  const g = (body) => `<g fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  const drawings = [
    g(`<path d="M28 104V46h24v58M28 46h24M34 58h12M34 68h8"/>`) + `<circle cx="40" cy="96" r="3" fill="${red}"/>`,
    g(`<circle cx="28" cy="58" r="14"/><circle cx="52" cy="58" r="14"/><path d="M42 58h-2M28 48v20M52 48v20"/>`),
    g(`<path d="M16 100h48M22 100V64h36v36M18 64h44L40 40zM34 76h12v24H34z"/>`),
    g(`<path d="M40 86C18 64 16 42 30 36c8-4 10 4 10 4s2-8 10-4c14 6 12 28-10 50z"/>`),
    g(`<circle cx="40" cy="36" r="12"/><path d="M28 52c-8 10-8 30 0 48M52 52c8 10 8 30 0 48M24 68h32"/>`),
    g(`<path d="M24 96h32M30 96V68h20v28M26 68c8-18 20-18 28 0M36 56c2-8 10-8 12 0"/>`),
    g(`<path d="M14 88h52M18 88V46h26v42M18 58h26M18 70h26M50 88V62h12v26"/>`),
    g(`<path d="M8 98h64M18 98V66h28v32M14 66h36L32 46zM56 98V44M56 56c12 0 14 14 4 18"/>`),
    g(`<ellipse cx="40" cy="60" rx="18" ry="28"/><path d="M30 54c4-8 16-8 20 0M32 62h16M40 54v16M34 74c4 4 8 4 12 0"/>`),
    g(`<path d="M22 100V58h36v42M22 72h36M34 58V46h12v12M28 80h24"/>`),
    g(`<path d="M18 90h34l6 12H24zM24 82h24M26 72h16M48 74c14-22 18-24 16-34"/><circle cx="66" cy="36" r="2" fill="${red}"/>`),
    g(`<path d="M12 78c12-20 44-20 56 0"/><circle cx="40" cy="40" r="10"/><path d="M32 38h16M40 30v20M16 100h48"/>`),
    g(`<circle cx="32" cy="42" r="10"/><path d="M24 54c-4 14-2 32 4 46M42 54c4 14 2 32-4 46M22 68h18"/>`) + `<circle cx="58" cy="70" r="12" fill="none" stroke="${ink}" stroke-width="1.4"/><circle cx="58" cy="70" r="3" fill="${red}"/>`,
    g(`<ellipse cx="32" cy="78" rx="16" ry="12"/><circle cx="52" cy="64" r="11"/><path d="M58 54l6-8M48 54l-4-8M22 88v12M36 86v14M14 100h52"/>`),
    g(`<path d="M26 100V52h28v48M22 52h36M34 36h12v16H34zM18 100h44"/>`),
    g(`<path d="M22 34h36v48H22zM22 46h36M28 56h22M28 66h14"/><circle cx="52" cy="30" r="4" fill="${red}"/>`),
    g(`<path d="M22 66h32v10c0 12-8 20-16 20s-16-8-16-20zM54 70c8 0 10 12 0 12M18 100h44M32 58c-2-6 2-8 0-14M42 58c-2-6 2-8 0-14"/>`),
    g(`<path d="M16 70c10-24 38-24 48 0 6 14-8 22-16 16"/><circle cx="30" cy="64" r="1.6" fill="${ink}"/><path d="M18 96h44"/>`),
    g(`<path d="M16 78h40M20 78c0-16 8-28 16-28s16 12 16 28"/><circle cx="30" cy="70" r="2" fill="${ink}"/><path d="M48 50c8-10 14-6 10 2"/>`),
    g(`<circle cx="40" cy="52" r="22"/><path d="M40 36v18l12 8"/>`),
    g(`<path d="M22 48c2-12 14-12 16 0v8H22zM42 48c2-12 14-12 16 0v8H42zM30 56v28M50 56v28M18 100h44"/>`),
    g(`<path d="M24 70h32M28 70V48h24v22M32 48V36h16v12M20 100h40M36 80h8"/>`),
    g(`<path d="M22 96l18-62 18 62M28 78h24"/><path d="M40 34c10-8 18-2 14 8"/>`),
    g(`<circle cx="46" cy="62" r="14"/><path d="M34 56c-10 2-14 14-8 20M18 96h48M52 48l8-10"/>`),
    g(`<circle cx="40" cy="46" r="10"/><path d="M40 56v28M28 96c4-16 20-16 24 0M40 70h16"/>`) + `<circle cx="56" cy="70" r="3" fill="${red}"/>`,
    g(`<path d="M28 28v64M22 28h20M24 100h36M40 92V70"/>`),
    g(`<path d="M12 80h56M16 80V48h10v32M32 80V40h10v40M48 80V56h10v24M12 48h56"/>`)
  ];
  illustration.size = drawings.length;
  const index = Number.isInteger(s.icon) ? ((s.icon % drawings.length) + drawings.length) % drawings.length : (n + shift) % drawings.length;
  return `<svg viewBox="0 0 80 120" aria-hidden="true"><rect width="80" height="120" fill="#f4efe4"/>${drawings[index]}</svg>`;
}
function card(s, queryText) {
  return `<button class="card" data-slug="${s.slug}">
    <div class="cover">${illustration(s)}</div>
    <h3>${highlight(s.title, queryText)}</h3>
    <p class="by">${esc(s.primary || "סיפור")} · ${readingMinutes(s.text)} דק׳</p>
    <p class="hook">${highlight(s.hook || "", queryText)}</p>
  </button>`;
}

function byYear(list) {
  const groups = [];
  for (const s of list) {
    const year = s.date ? s.date.slice(0, 4) : "ללא תאריך";
    if (!groups.length || groups[groups.length - 1][0] !== year) groups.push([year, []]);
    groups[groups.length - 1][1].push(s);
  }
  return groups;
}

function renderHome() {
  const list = ordered(stories.filter(matches));
  const shelves = theme
    ? ""
    : Object.keys(THEMES).map(name => {
        const items = stories.filter(s => s.primary === name).slice(0, 8);
        if (!items.length) return "";
        return `<section class="shelf">
          <div class="shelf-h"><h2>${esc(name)}</h2><button type="button" data-theme="${esc(name)}">הכול</button></div>
          <div class="row scroll">${items.map(s => card(s, "")).join("")}</div>
        </section>`;
      }).join("");

  const gridTitle = query.trim()
    ? `תוצאות עבור „${esc(query.trim())}”`
    : (theme ? theme : (sortMode === "date" ? "לפי תאריך כתיבה" : "כל הסיפורים"));

  app.innerHTML = `
    <div class="page-head head-row">
      <div>
        <p>${stories.length} סיפורים מאת אודי גבריאלי</p>
      </div>
      <div class="actions">
        <div class="view-toggle" role="group" aria-label="מיון">
          <button type="button" data-sort="alpha" class="${sortMode === "alpha" ? "on" : ""}">א״ב</button>
          <button type="button" data-sort="date" class="${sortMode === "date" ? "on" : ""}">כרונולוגי</button>
        </div>
        <div class="view-toggle" role="group" aria-label="תצוגה">
          <button type="button" data-view="list" class="${view === "list" ? "on" : ""}">רשימה</button>
          <button type="button" data-view="cards" class="${view === "cards" ? "on" : ""}">כרטיסיות</button>
        </div>
        <button class="orange-btn" id="random" type="button">סיפור אקראי</button>
      </div>
    </div>
    <div class="pin"><div class="chips">
      <button class="chip ${theme ? "" : "on"}" data-theme="">הכול</button>
      ${Object.keys(THEMES).map(name => `<button class="chip ${theme === name ? "on" : ""}" data-theme="${esc(name)}">${esc(name)}</button>`).join("")}
    </div></div>
    ${view === "cards" && sortMode !== "date" && !query.trim() && !theme ? shelves : ""}
    <section class="shelf">
      <div class="shelf-h"><h2>${gridTitle}</h2><span style="color:#757575;font-size:14px">${list.length}</span></div>
      ${list.length ? `${sortMode === "date" ? byYear(list).map(([year, items]) => `<h3 class="year">${year}</h3><div class="row${view === "list" ? " as-list" : ""}">${items.map(s => card(s, query.trim())).join("")}</div>`).join("") : `<div class="row${view === "list" ? " as-list" : ""}">${list.map(s => card(s, query.trim())).join("")}</div>`}` : `<p class="empty">אין סיפור עם המילה הזו. נסו שם, מקום, או משפט קצר.</p>`}
    </section>`;
}

function renderMap() {
  app.innerHTML = `
    <div class="page-head">
      <h1>לפי נושא</h1>
      <p>הסיפורים מסודרים לפי מה שקורה בהם, לא לפי סדר האלף־בית.</p>
    </div>
    <div class="map-grid">
      ${Object.entries(THEMES).map(([name, blurb]) => {
        const n = stories.filter(s => s.primary === name || (s.secondary || []).includes(name)).length;
        return `<button class="map-card" data-theme="${esc(name)}"><div class="n">${n}</div><h2>${esc(name)}</h2><p>${esc(blurb)}</p></button>`;
      }).join("")}
    </div>
    <section class="tag-index">
      <div class="shelf-h"><h2>תגיות</h2><span class="muted">${tagIndex().length}</span></div>
      <p class="muted">מילים ושמות שחוזרים בכמה סיפורים. לחיצה מציגה את כל הסיפורים שבהם הם מופיעים.</p>
      <div class="tag-cloud">
        ${tagIndex().filter(tag => !tag.name).map(tagChip).join("")}
      </div>
      <h3 class="tag-sub">שמות</h3>
      <div class="tag-cloud">
        ${tagIndex().filter(tag => tag.name).map(tagChip).join("")}
      </div>
    </section>`;
}

function tagChip(tag) {
  return `<button class="tag shared" data-tag="${esc(tag.display)}" type="button">${esc(tag.display)} <small>${tag.count}</small></button>`;
}
function tagIndex() {
  if (!tagIndex.list) {
    tagIndex.list = sharedTags
      .map(tag => ({
        display: tag.display,
        name: !!tag.name,
        count: stories.filter(s => tag.name ? hasFigure(s, tag.key) : hasWord(hayOf(s), tag.key)).length,
      }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display, "he"));
  }
  return tagIndex.list;
}

function paragraphs(s) {
  const bare = x => norm(x).replace(/[^\u0590-\u05FFa-z0-9]/g, "");
  const dateOnly = /^(\d{1,2}[./]\d{1,2}[./]\d{2,4})$/;
  const dateTail = /^(.*?)[\t ]{2,}(\d{1,2}[./]\d{1,2}[./]\d{2,4})$/;
  const out = [];
  (s.text || "").split(/\n+/).map(x => x.trim()).filter(Boolean).forEach((line, i) => {
    const only = line.match(dateOnly);
    if (only) { out.push({ date: only[1] }); return; }
    const tail = line.match(dateTail);
    if (tail) {
      const text = tail[1].trim();
      if (text && !(i === 0 && bare(text) === bare(s.title))) out.push({ text });
      out.push({ date: tail[2] });
      return;
    }
    if (i === 0 && bare(line) === bare(s.title)) return;
    out.push({ text: line });
  });
  return out;
}

function renderStory() {
  const s = bySlug[openSlug];
  if (!s) { mode = "home"; render(); return; }
  const related = stories.filter(x => x.slug !== s.slug && (x.primary === s.primary || (s.keywords || []).some(k => (x.keywords || []).includes(k)))).slice(0, 6);
  const allTags = tagsFor(s);
  const shared = [...allTags.filter(tag => !tag.name).slice(0, 6), ...allTags.filter(tag => tag.name).slice(0, 4)];
  const sharedKeys = new Set(shared.map(tag => clean(tag.display)));
  const extra = [...new Set([s.primary, ...(s.secondary || []), ...(s.keywords || [])])].filter(v => v && !sharedKeys.has(clean(v))).slice(0, 4);
  const seenTag = new Set();
  const tags = [...shared.map(tag => tag.display), ...extra].filter(v => { const k = clean(v); if (seenTag.has(k)) return false; seenTag.add(k); return true; });
  const parts = paragraphs(s);
  app.innerHTML = `
    <article class="reader">
      <div class="story-bar">
        <button class="back" id="back" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>חזרה לספרייה</span></button>
        <p class="bar-title" aria-hidden="true">${esc(s.title)}</p>
      </div>
      <div class="story-top">
        <div class="cover">${illustration(s)}</div>
        <div>
          <p class="read-time">${readingLabel(s.text)}</p>
          <div class="title-row">
            <h1>${esc(s.title)}</h1>
            ${signedIn && addedSlugs.has(s.slug) ? `<button type="button" class="edit-story" id="edit-story" aria-label="עריכה"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.2 6.8l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>` : ""}
          </div>
          <p class="byline">מאת <b>אודי גבריאלי</b></p>
          ${s.synopsis ? `<div class="blurb"><details><summary>תקציר</summary><p>${esc(s.synopsis)}</p></details><div class="tip" role="tooltip">${esc(s.synopsis)}</div></div>` : ""}
          <div class="chips" style="margin:0">
            ${tags.map((t, i) => `<button class="tag${i < shared.length ? " shared" : ""}" data-tag="${esc(t)}" type="button">${esc(t)}</button>`).join("")}
          </div>
        </div>
      </div>
      <div class="reader-tools">
        <span>גודל טקסט</span>
        <button type="button" id="smaller" aria-label="הקטנת טקסט">א-</button>
        <button type="button" id="larger" aria-label="הגדלת טקסט">א+</button>
      </div>
      <div class="body" style="--read:${readSize}px">
        ${parts.filter(p => p.text).map(p => `<p>${esc(p.text)}</p>`).join("")}
        ${s.dateLabel ? `<p class="written">נכתב ${esc(s.dateLabel)}</p>` : ""}
      </div>
      ${related.length ? `<section class="more"><h2>עוד באותו נושא</h2><div class="row">${related.map(x => card(x, "")).join("")}</div></section>` : ""}
    </article>`;
  document.getElementById("back").onclick = () => go("home");
  const editStory = document.getElementById("edit-story");
  if (editStory) editStory.onclick = () => openEditor(s);
  document.getElementById("smaller").onclick = () => { readSize = Math.max(16, readSize - 2); renderStory(); };
  document.getElementById("larger").onclick = () => { readSize = Math.min(28, readSize + 2); renderStory(); };
  const blurb = document.querySelector(".blurb");
  if (blurb && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const summary = blurb.querySelector("summary");
    const details = blurb.querySelector("details");
    let timer;
    summary.addEventListener("mouseenter", () => {
      if (details.open) return;
      timer = setTimeout(() => blurb.classList.add("tip-on"), 1000);
    });
    summary.addEventListener("mouseleave", (e) => {
      if (blurb.contains(e.relatedTarget)) return;
      clearTimeout(timer);
      blurb.classList.remove("tip-on");
    });
    blurb.addEventListener("mouseleave", () => {
      clearTimeout(timer);
      blurb.classList.remove("tip-on");
    });
    details.addEventListener("toggle", () => blurb.classList.remove("tip-on"));
  }
  watchStoryTitle();
  window.scrollTo(0, 0);
}

function watchStoryTitle() {
  if (watchStoryTitle.onScroll) window.removeEventListener("scroll", watchStoryTitle.onScroll);
  const reader = document.querySelector(".reader");
  const title = document.querySelector(".story-top h1");
  const bar = document.querySelector(".story-bar");
  if (!reader || !title || !bar) return;
  const past = () => {
    reader.classList.toggle("collapsed", title.getBoundingClientRect().top < bar.offsetHeight);
  };
  watchStoryTitle.onScroll = past;
  window.addEventListener("scroll", past, { passive: true });
  past();
}

function render(keepScroll) {
  document.body.dataset.page = mode;
  if (mode !== "story" && watchStoryTitle.onScroll) {
    window.removeEventListener("scroll", watchStoryTitle.onScroll);
    watchStoryTitle.onScroll = null;
  }
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.go === (mode === "story" ? "home" : mode)));
  if (mode === "map") renderMap();
  else if (mode === "story") renderStory();
  else renderHome();
  bind();
  syncHeaderHeight();
  if (!keepScroll) window.scrollTo(0, 0);
}

function syncHeaderHeight() {
  const bar = document.querySelector(".top");
  if (bar) document.documentElement.style.setProperty("--top-h", bar.offsetHeight + "px");
}

function bind() {
  app.querySelectorAll("[data-slug]").forEach(el => {
    el.onclick = () => { openSlug = el.dataset.slug; mode = "story"; history.replaceState(null, "", "#/s/" + openSlug); render(); };
  });
  app.querySelectorAll("[data-theme]").forEach(el => {
    el.onclick = () => { theme = el.dataset.theme; query = ""; q.value = ""; mode = "home"; history.replaceState(null, "", theme ? "#/t/" + encodeURIComponent(theme) : "#/"); render(); };
  });
  app.querySelectorAll("[data-tag]").forEach(el => {
    el.onclick = () => {
      const tag = el.dataset.tag;
      if (THEMES[tag]) { theme = tag; query = ""; q.value = ""; }
      else { theme = ""; query = tag; q.value = tag; }
      mode = "home";
      render();
    };
  });
  app.querySelectorAll("[data-sort]").forEach(el => {
    el.onclick = () => {
      sortMode = el.dataset.sort;
      localStorage.setItem("aba-sort", sortMode);
      render(true);
    };
  });
  app.querySelectorAll("[data-view]").forEach(el => {
    el.onclick = () => {
      view = el.dataset.view;
      localStorage.setItem("aba-view", view);
      render(true);
    };
  });
  const random = document.getElementById("random");
  if (random) random.onclick = () => {
    const s = stories[Math.floor(Math.random() * stories.length)];
    openSlug = s.slug; mode = "story"; history.replaceState(null, "", "#/s/" + openSlug); render();
  };
}

function go(next) {
  mode = next;
  if (next !== "story") history.replaceState(null, "", next === "map" ? "#/map" : "#/");
  render();
}

window.UdiSite = {
  themes: Object.keys(THEMES),
  iconSvg: i => illustration({ slug: "preview", primary: "", icon: i }),
  matchTags(text) {
    const words = [];
    const names = [];
    for (const tag of sharedTags) {
      if (!hasWord(text || "", tag.key)) continue;
      (tag.name ? names : words).push(tag.display);
    }
    return { keywords: words, figures: names };
  },
  usedIcons(theme) {
    const group = stories.filter(s => s.primary === theme).sort((a, b) => a.slug.localeCompare(b.slug));
    const shift = [...theme].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const size = illustration.size || 27;
    const used = new Set();
    group.forEach((s, n) => used.add(Number.isInteger(s.icon) ? ((s.icon % size) + size) % size : (n + shift) % size));
    return [...used];
  }
};

if (!document.getElementById("app")) {
  // Editor page reuses the icon list without drawing the library.
} else {
document.getElementById("logo").onclick = () => go("home");
document.querySelectorAll(".nav-btn[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
document.getElementById("search-form").onsubmit = e => e.preventDefault();
q.oninput = () => {
  query = q.value;
  theme = "";
  mode = "home";
  render(true);
};

function fromHash() {
  const h = decodeURIComponent(location.hash || "");
  if (h.startsWith("#/s/")) { openSlug = h.slice(4); mode = "story"; }
  else if (h.startsWith("#/t/")) { theme = h.slice(4); mode = "home"; }
  else if (h === "#/map") mode = "map";
  else mode = "home";
}
window.addEventListener("resize", syncHeaderHeight);
window.addEventListener("hashchange", () => { fromHash(); render(); });
fromHash();
render();
const auth = document.getElementById("auth");
const addOpen = document.getElementById("add-open");
const logout = document.getElementById("logout");
const login = document.getElementById("login");
const addPop = document.getElementById("add-pop");
const addForm = document.getElementById("add");

function showSession(on) {
  if (auth) auth.hidden = on;
  if (addOpen) addOpen.hidden = !on;
  if (logout) logout.hidden = !on;
}

fetch("/api/me").then(me => {
  signedIn = me.ok;
  showSession(me.ok);
  if (mode === "story") render();
  if (!me.ok && new URLSearchParams(location.search).get("denied") && login) {
    document.getElementById("login-msg").textContent = "הקישור לא בתוקף. אפשר לבקש חדש.";
    history.replaceState(null, "", location.pathname);
    login.showModal();
  }
});
if (auth && login) auth.onclick = () => login.showModal();
if (logout) logout.onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
};
let editingSlug = "";
function prepareForm(story) {
  const theme = document.getElementById("theme");
  if (!theme.dataset.ready) {
    theme.innerHTML = window.UdiSite.themes.map(name => `<option value="${name}">${name}</option>`).join("");
    theme.dataset.ready = "1";
  }
  editingSlug = story ? story.slug : "";
  document.getElementById("add-title").textContent = story ? "עריכת סיפור" : "סיפור חדש";
  document.querySelector("label[for=file]").textContent = story ? "קובץ וורד, אם מחליפים את הטקסט" : "קובץ וורד";
  document.getElementById("file").required = !story;
  document.getElementById("file").value = "";
  document.getElementById("add-delete").hidden = !story;
  document.getElementById("add-save").textContent = story ? "שמירת שינויים" : "שמירה לספרייה";
  document.getElementById("title").value = story ? story.title : "";
  document.getElementById("when").value = story ? story.date || "" : "";
  document.getElementById("synopsis").value = story ? story.synopsis || "" : "";
  document.getElementById("text").value = story ? story.text : "";
  if (story) theme.value = story.primary;
  document.getElementById("save-msg").textContent = "";
  addPop.showModal();
}
openEditor = prepareForm;
if (addOpen && addPop) addOpen.onclick = () => prepareForm(null);
if (addPop) {
  addPop.addEventListener("click", (event) => { if (event.target === addPop) addPop.close(); });
  document.getElementById("add-close").onclick = () => addPop.close();
}
if (login) {
  login.addEventListener("click", (event) => { if (event.target === login) login.close(); });
  document.getElementById("login-close").onclick = () => login.close();
  document.getElementById("login-form").onsubmit = async (event) => {
    event.preventDefault();
    const msg = document.getElementById("login-msg");
    msg.className = "msg";
    msg.textContent = "";
    const response = await fetch("/api/login/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: document.getElementById("login-email").value.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    msg.className = "ok";
    msg.textContent = data.message || "אם המייל מורשה, נשלח אליו קישור התחברות.";
  };
}
if (addForm) {
  document.getElementById("file").onchange = async () => {
    const file = document.getElementById("file").files[0];
    if (!file) return;
    const msg = document.getElementById("save-msg");
    msg.className = "msg";
    msg.textContent = "קורא את הקובץ…";
    const response = await fetch("/api/extract?name=" + encodeURIComponent(file.name), { method: "POST", body: file });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.reload(); return; }
    if (!response.ok) {
      msg.textContent = data.error || "לא הצלחתי לקרוא את הקובץ";
      return;
    }
    document.getElementById("title").value = data.title || "";
    document.getElementById("text").value = data.text || "";
    document.getElementById("when").value = data.date || "";
    msg.textContent = "";
  };
  addForm.onsubmit = async (event) => {
    event.preventDefault();
    const msg = document.getElementById("save-msg");
    msg.className = "msg";
    const text = document.getElementById("text").value.trim();
    const primary = document.getElementById("theme").value;
    const tags = window.UdiSite.matchTags(text);
    const when = document.getElementById("when").value;
    const opening = text.split("\n").map(line => line.trim()).find(Boolean) || "";
    let dateLabel = "";
    if (when) {
      const [year, month, day] = when.split("-");
      dateLabel = `${+day}.${+month}.${year}`;
    }
    msg.textContent = "שומר…";
    const response = await fetch(editingSlug ? "/api/update" : "/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: editingSlug,
        title: document.getElementById("title").value.trim(),
        text,
        primary,
        icon: freeIcon(primary),
        synopsis: document.getElementById("synopsis").value.trim(),
        hook: opening.slice(0, 140),
        date: when,
        dateLabel,
        keywords: tags.keywords,
        figures: tags.figures,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { location.reload(); return; }
    if (!response.ok) {
      msg.textContent = data.error || "השמירה נכשלה";
      return;
    }
    location.href = "index.html#/s/" + data.slug;
  };
  document.getElementById("add-delete").onclick = async () => {
    if (!editingSlug || !confirm("למחוק את הסיפור?")) return;
    const response = await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: editingSlug }),
    });
    if (response.ok) location.href = "index.html";
    else {
      const data = await response.json().catch(() => ({}));
      const msg = document.getElementById("save-msg");
      msg.className = "msg";
      msg.textContent = data.error || "המחיקה נכשלה";
    }
  };
}

function freeIcon(theme) {
  const used = new Set(window.UdiSite.usedIcons(theme));
  for (let i = 0; i < 27; i++) if (!used.has(i)) return i;
  return 0;
}
}
