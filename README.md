# אודי סיפורים

Hebrew reading site for Udi's finished short stories. Static files, no build. The live site is for reading. Adding and editing stories runs only on this computer.

**Live:** https://avtushh.github.io/udi-stories/

**Repository:** https://github.com/avtushh/udi-stories (personal account `avtushh`)

## Files

| File | Role |
| --- | --- |
| `index.html` | Page shell, Hebrew RTL |
| `app.js` | Library, search, themes, tags, story view, local editor dialogs |
| `styles.css` | Layout |
| `data/stories.js` | Original catalog, `window.STORIES`. The editor must not rewrite this file |
| `data/added.js` | Stories added later, `window.ADDED_STORIES`. The only catalog the editor writes |
| `serve.py` | Local server on port 8765: login link, Word upload, save, edit, delete |
| `editor.html` | Redirects to `index.html`. There is no separate editor screen |
| `.secrets/allowlist` | One allowed address per line. Gitignored. Never copy those addresses into the repo |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

Local copy of this repo: `/Users/avtush/p/_Family/Aba/site`  
Original Word files: `/Users/avtush/p/_Family/Aba/סיפורים גמורים`

## Local site

```bash
python3 serve.py
```

Open `http://127.0.0.1:8765/`. `python3 -m http.server` can show the pages, but it cannot save a story.

On localhost, logged out, the nav shows **התחברות**. Logged in, it shows **+ הוספת סיפור** and **התנתקות**. The published site does not show **התחברות**. GitHub Pages only serves the files; it does not run `serve.py`.

## Reading a story

The full header stays only while the story is still at the top of the page. A right arrow in that header row returns to the library. The browser back button does the same. It does not sit on its own row above the story card. After scrolling, the header leaves and a bar shows the story name plus that same arrow.

Inside the card the order is title, author, synopsis, tags, then reading time. Phone and desktop use the same side-by-side cover layout. The phone cover is just smaller.

A small globe to the left of the story-count line opens the Google My Maps list of places from the stories. It is a viewer link, not the edit link.

**סיפורים אחרונים** are the stories opened in this browser tab. They disappear when the tab closes. **סיפורים שקראתי** stay on this browser until the reader presses **לא קראתי**. Opening a story does not mark it as read. A read story shows a small green check beside its title. Both lists are buttons in the library toolbar, and they use the same list or cards view as the rest of the stories.

## Publish

Push `main` to this repository. GitHub Pages rebuilds https://avtushh.github.io/udi-stories/ from that branch.

Do not publish from the company account `kavtush`.

## Continuing the work

Agents working in this repo should follow `.cursor/skills/udi-stories/SKILL.md`. It records the decisions that are easy to undo by accident: the single header title, dates only at the end of a story, how tags and names are chosen, the two catalogs, and which GitHub account owns the site.
