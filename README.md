# אודי סיפורים

Hebrew reading site for Udi's finished short stories. Static files, no build.

**Live:** https://avtushh.github.io/udi-stories/

**Repository:** https://github.com/avtushh/udi-stories (personal account `avtushh`)

## Files

| File | Role |
| --- | --- |
| `index.html` | Page shell, Hebrew RTL |
| `app.js` | Library, search, themes, tags, story view |
| `styles.css` | Layout |
| `data/stories.js` | `window.STORIES` — one object per story |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is |

Local copy of this repo: `/Users/avtush/p/_Family/Aba/site`  
Original Word files: `/Users/avtush/p/_Family/Aba/סיפורים גמורים`

## Preview

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/`.

## Publish

Push `main` to this repository. GitHub Pages rebuilds https://avtushh.github.io/udi-stories/ from that branch.

Do not publish from the company account `kavtush`.

## Continuing the work

Agents working in this repo should follow `.cursor/skills/udi-stories/SKILL.md`. It records the decisions that are easy to undo by accident: the single header title, dates only at the end of a story, how tags and names are chosen, and which GitHub account owns the site.
