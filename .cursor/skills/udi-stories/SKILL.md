---
name: udi-stories
description: >-
  Continue work on אודי סיפורים, the Hebrew static site of Udi's short stories.
  Use when editing this repository, the site at /Users/avtush/p/_Family/Aba/site,
  story text, themes, tags, dates, illustrations, or when publishing to
  avtushh/udi-stories or GitHub Pages.
---

# אודי סיפורים

Static Hebrew RTL site. No build step. `window.STORIES` in `data/stories.js` is the catalog. `app.js` renders it. `styles.css` is the Wattpad-like layout (white, orange `#ff500a`, Rubik + Frank Ruhl Libre).

## Where things are

- Local site (this repo): `/Users/avtush/p/_Family/Aba/site`
- Source Word files: `/Users/avtush/p/_Family/Aba/סיפורים גמורים`
- GitHub: `avtushh/udi-stories` on account **avtushh** (personal). Never push to `kavtush` (company).
- Live site: https://avtushh.github.io/udi-stories/
- Preview: `python3 -m http.server` in the site directory. Writes outside the Unity workspace need unrestricted permissions.

## Routes

Hash only: `#/` library, `#/s/<slug>` story, `#/t/<theme>` theme filter, `#/map` topics and tags.

## Story fields

`slug`, `title`, `form`, `hook`, `synopsis`, `primary`, `secondary`, `keywords`, `places`, `figures`, `tone`, `text`, `date` (`YYYY-MM-DD` or `""`), `dateLabel` (for example `20.9.2004`).

`primary` must be one of the 14 keys in `THEMES` in `app.js`. Do not invent a new theme without adding it there.

## Rules already decided

- Brand in the header is **אודי סיפורים**. Do not restore a second title "סיפורים גמורים".
- Link previews (WhatsApp) come from the Open Graph tags in `index.html` and `og.png` (1200×630 PNG, absolute URL). Do not point `og:image` at the SVG favicon.
- Cards show theme and reading time. No author name and no date on the card.
- Reading time is words / 200, minimum 1 minute, labeled `דקת קריאה` or `כ־N דקות קריאה`.
- Synopsis is spoilery. Keep it behind `<summary>תקציר</summary>`. On a fine pointer, show the tooltip only after 1 second of hover.
- Dates inside the manuscript (a line that is only `d/m/y` or `d.m.y`, or a title line with tabs then a date) are stripped from the body. The only visible date is at the **end** of the story: `נכתב {dateLabel}`, in gray (`.body p.written`), not the story ink. Not in the title, not at the top. If `dateLabel` is empty, show no date. Do not also print a raw date from the text.
- The site header (logo, search, הספרייה / נושאים ותגיות) is sticky only on the home page (`body[data-page="home"]`). On a story it scrolls away. Once the large title passes the top, `.reader` gets `collapsed` and `.story-bar` sticks to the top of the screen with only the back control and the story title.
- Shared word tags: a keyword of 1–3 words, listed on at least 3 stories, and found as a whole word in at most 25% of story texts. Whole-word match (`hasWord`); final Hebrew letters are not folded there, niqqud is stripped.
- Name tags: a `figures` entry on at least 2 stories, not a role (`notNames` in `app.js`). A name click matches the `figures` field, not a substring of the text. Names already used as word tags stay in the word list.
- Tag browser is on `#/map`, under the themes: word tags, then a **שמות** group. Clicking a tag searches; clicking a theme name filters by theme.
- Theme chips are smaller than the top nav buttons.
- Cover drawings are ink illustrations, one variant index per story within its `primary` theme, so two stories in the same theme do not share a drawing.
- Sort (`aba-sort`) and view (`aba-view`) persist in localStorage.

## Updating the live site

Commit on `main` and push to `origin` (`avtushh/udi-stories`). GitHub Pages serves that branch from `/`. Keep `.nojekyll`. Paths in `index.html` stay relative.
