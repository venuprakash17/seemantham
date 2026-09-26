# Lavanya's Seemantham – Digital Album

Static flip-book album ready for **GitHub Pages** (no build step). Publish the repository root from the `main` branch.

## Features
- Realistic hardcover flip-book (leather cover, stacked pages, table lighting)
- Download the full album PDF from the opening screen, header, or cinema intro
- **47** photo album pages
- Ceremonial opening / loading ritual with progress
- Theme music at **40%** volume with mute (album + cinema)
- Cinema film page (`cinema.html`) — ink transitions, Ken Burns, gold particles
- Slideshow, resume, deep links (`?page=12`), share, zoom, thumbnails, fullscreen
- PWA-ready (manifest + service worker)
- Mobile-first with safe-area insets

## Publish on GitHub Pages

### Option A — GitHub website (drag & drop)
1. Create a new empty repository on GitHub.
2. Upload everything **except** `seemanttham.pdf` (see PDF note below).
3. **Settings → Pages → Build and deployment**
4. Source: **Deploy from a branch**
5. Branch: **main** / folder: **/(root)** → Save

### Option B — Git CLI
```bash
cd lavanya-digital-album-fabulous
git init
git add .
git commit -m "Publish Lavanya Seemantham digital album"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```
Then enable Pages as in steps 3–5 above.

Live URL:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/`

Cinema: `…/cinema.html` · Deep link: `…/?page=12`

### Project-site paths
This album uses **relative** asset paths, so it works as a project site under `/REPO-NAME/` without changes. Do **not** move files into a `docs/` subfolder unless you also keep `assets/`, `vendor/`, etc. next to `index.html`.

## PDF download (important)
`seemanttham.pdf` is ~234MB. **GitHub rejects files over 100MB**, so it is listed in `.gitignore` and will not be pushed.

**Keep downloads working after publish:**
1. Upload the PDF to Google Drive, Dropbox, or a GitHub **Release** asset.
2. Open `config.js` and set `pdfUrl` to that public/direct link.
3. Commit and push the one-line change.

Locally, leave `pdfUrl: 'seemanttham.pdf'` — the file stays on your machine for testing.

## Checklist before first publish
- [x] `.nojekyll` present (GitHub won’t run Jekyll on the site)
- [x] Relative paths only (works under `/username/repo/`)
- [x] PageFlip vendored in `vendor/` (no CDN required)
- [x] Service worker uses soft install; skips caching the huge PDF/MP3
- [x] Oversized PDF excluded via `.gitignore`
- [x] Duplicate audio removed; theme is `assets/audio/seemantham-theme.mp3` (~10MB, OK)
- [ ] Create GitHub repo + push `main`
- [ ] Enable Pages (branch `main`, root)
- [ ] Point `config.js` → hosted PDF URL if you want the download buttons live

## Notes
- Pages: `assets/pages/page-01.jpg` … `page-47.jpg`
- To change page count later: update files in `assets/pages/` and `TOTAL_PAGES` in `script.js`
- Google Fonts load when online; UI falls back to system fonts offline
- After a big update, hard-refresh once (or clear site data) so the new service worker (`lavanya-album-v5`) activates
