---
name: udi-stories
description: >-
  Continue work on אודי סיפורים, the Hebrew static site of Udi's short stories.
  Use when editing this repository, the site at /Users/avtush/p/_Family/Aba/site,
  story text, themes, tags, dates, illustrations, the local editor, the two
  catalogs, or when publishing to avtushh/udi-stories or GitHub Pages.
---

# אודי סיפורים

Static Hebrew RTL site. No build step. `app.js` renders both catalogs. `styles.css` is the Wattpad-like layout (white, orange `#ff500a`, Rubik + Frank Ruhl Libre).

## Where things are

- Local site (this repo): `/Users/avtush/p/_Family/Aba/site`
- Source Word files: `/Users/avtush/p/_Family/Aba/סיפורים גמורים`
- GitHub: `avtushh/udi-stories` on account **avtushh** (personal). Never push to `kavtush` (company).
- Live site: https://avtushh.github.io/udi-stories/ — reading only. GitHub Pages does not run a server.
- Local editor: `python3 serve.py`, then http://127.0.0.1:8765/. Do not use `python3 -m http.server` when a story must be saved. Writes outside the Unity workspace need unrestricted permissions.

## Two catalogs

- `data/stories.js` is `window.STORIES`, the original stories. Never rewrite this file from the editor.
- `data/added.js` is `window.ADDED_STORIES`, stories added later. Save, edit, and delete touch only this file.
- `app.js` shows both. The home count is `${stories.length}` and must not be hardcoded.
- `editor.html` only redirects to `index.html`.

## Local editor

- **התחברות** is rendered only when `location.hostname` is `127.0.0.1` or `localhost`. The published site must not show it.
- Logged out: **התחברות** opens an in-page `<dialog>` (not `window.open`) and asks for an email. The server mails a one-time link. On this Mac that send goes through Mail.app, which may come to the front. A real host would send from the server.
- Logged in: the nav shows **+ הוספת סיפור** and **התנתקות**. Logout reloads the page.
- The allowlist is `.secrets/allowlist`, one address per line, mode 600, gitignored. Never write those addresses into HTML, JS, the README, or this file. The server checks the list and sets an httpOnly session cookie. Do not trust an email header from the browser.
- A new story comes from a Word file (`textutil`). Do not invent a synopsis. The card line is the opening sentence. The author picks one of the 14 themes. The drawing is the first unused index in that category; `icon` stores it. Tags and names are only existing ones that appear as whole words.
- On an added story, a logged-in reader gets a pencil button to the left of the title. It opens the same dialog to change the fields or delete the story. Original stories have no pencil.

## Routes

Hash only: `#/` library, `#/s/<slug>` story, `#/t/<theme>` theme filter, `#/map` topics and tags, `#/legal` copyright and terms.

The footer is a full-width warm-dark band (`#241e1a`), centered. Links live in `.site-foot-links` (today only **זכויות יוצרים ותנאי שימוש**; later mail or Facebook go there as extra anchors, not as a form). On `#/legal` that one link is hidden, and the header back arrow returns to the library. Under the links: `© 2026 אודי גבריאלי. כל הזכויות שמורות.` Then a quieter line that the site was created by אבנר גבריאלי. That credit is not a copyright claim. The copyright belongs to אודי גבריאלי. Do not name a publisher, and do not add legal text beyond what is already on that page. Do not add a cookie banner or a privacy policy unless the user asks after being told what data the site actually sends.

## Story fields

`slug`, `title`, `form`, `hook`, `synopsis`, `primary`, `secondary`, `keywords`, `places`, `figures`, `tone`, `text`, `date` (`YYYY-MM-DD` or `""`), `dateLabel` (for example `20.9.2004`).

`primary` must be one of the 14 keys in `THEMES` in `app.js`. Do not invent a new theme without adding it there.

## Rules already decided

- Brand in the header is **אודי סיפורים**. Do not restore a second title "סיפורים גמורים".
- Link previews (WhatsApp) come from the Open Graph tags in `index.html` and `og.png` (1200×630 PNG, absolute URL). Do not point `og:image` at the SVG favicon.
- Text-size buttons keep the same character under the story bar. Do not rebuild the story and jump back to the top.
- Cards show theme and reading time. No author name and no date on the card. The home count stays `${stories.length}`.
- Reading time is words / 200, minimum 1 minute, labeled `דקת קריאה` or `כ־N דקות קריאה`.
- Synopsis is spoilery. Keep it behind `<summary>תקציר</summary>`. On a fine pointer, show the tooltip only after 1 second of hover.
- Dates inside the manuscript (a line that is only `d/m/y` or `d.m.y`, or a title line with tabs then a date) are stripped from the body. The only visible date is at the **end** of the story: `נכתב {dateLabel}`, in gray (`.body p.written`), not the story ink. Not in the title, not at the top. If `dateLabel` is empty, show no date. Do not also print a raw date from the text.
- The site header is sticky only on the home page. On a story it scrolls away. While the story is still at the top, a right arrow sits in that header row (`#top-back`) and returns to the library. It does not take a row above the story card. Once the large title reaches the top, `.reader` gets `collapsed`: the header arrow hides, and a fixed `.story-bar` shows the arrow plus the story title. There is no "חזרה לספרייה" label. Story meta order is title, author, synopsis, tags, then reading time. Mobile uses the same side-by-side cover layout as desktop, only smaller.
- Opening a story pushes a history entry with the library (`#/`) underneath it. The browser back button, the header arrow, and the story arrow return to the main library. Direct story links do the same.
- Shared word tags: a keyword of 1–3 words, listed on at least 3 stories, and found as a whole word in at most 25% of story texts. Whole-word match (`hasWord`); final Hebrew letters are not folded there, niqqud is stripped.
- Name tags: a `figures` entry on at least 2 stories, not a role (`notNames` in `app.js`). A name click matches the `figures` field, not a substring of the text. Names already used as word tags stay in the word list.
- Tag browser is on `#/map`, under the themes: word tags, then a **שמות** group. Clicking a tag searches; clicking a theme name filters by theme.
- Theme chips are smaller than the top nav buttons.
- Cover drawings are ink illustrations. Within one `primary` theme, each story gets a different index until all 27 drawings are used.
- The home subtitle has a small globe to its left. It opens the public Google My Maps viewer (`mid=10ms6cbzXqtH6h_mj64L6jA4a1VLtD0A`). Use the viewer URL, not the `/edit` URL. There is no extra sentence beside the subtitle.
- **סיפורים אחרונים** is this tab's session only (`sessionStorage` `aba-recent`, newest first, at most 12). Opening a story adds it. Closing the tab clears it.
- **סיפורים שקראתי** persists in `localStorage` `aba-read`. Opening a story does not mark it read. On the story, **קראתי** / **לא קראתי** is the only way in or out. A read card shows `נקרא` and a small green check beside the title.
- Those two lists are buttons in the library toolbar, beside א״ב / כרונולוגי, רשימה / כרטיסיות, and סיפור אקראי. They replace the story grid. They use the same list or cards view as the rest of the library. They are not separate shelves.
- **עוד באותו נושא** follows the library view. Cards: one horizontal row (`.row.scroll`, at most 8). List: five stories in the list layout.
- While the page is loading, the footer stays hidden and a 2px orange bar sits at the top. `body.ready` is added after the first `render()`. Do not show the footer before that.
- While reading, a 2px warm-neutral gray bar (`#d0d0d0`) under the visible header shows progress through the story text (`.body` only). Its width matches the text column, so it does not cover the scrollbar. It sits under the site header until that header scrolls away, then under the fixed story bar.
- **מהתחלה לסוף** and **מהסוף להתחלה** are one arrow button beside the library heading **לפי א״ב** or **לפי תאריך כתיבה**. Up is start-to-end (א to ת, or oldest first). Down is end-to-start. Clicking flips it. Stories with no date stay at the end either way. The choice is `localStorage` `aba-sort-dir`. Do not put that button in the sort toolbar.

## Updating the live site

Commit on `main` and push to `origin` (`avtushh/udi-stories`). GitHub Pages serves that branch from `/`. Keep `.nojekyll`. Paths in `index.html` stay relative.
