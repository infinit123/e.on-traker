# Tracker Gaze PWA

## Local
1. `npm install`
2. `npm run dev`
3. `npm run build`
4. `npm run preview`

## GitHub Pages
In repository Settings > Pages, set Source to GitHub Actions. Push to `main`; `.github/workflows/deploy.yml` builds and deploys the `dist` folder.

The production Vite base is relative (`./`), so the generated assets work when the app is hosted under a GitHub Pages repository path.
