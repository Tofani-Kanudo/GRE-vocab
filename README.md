# Lexiloop

A mobile-first GRE vocabulary PWA with 1,112 GregMat words, definitions,
example sentences, and SM-2-style spaced repetition.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

The production output is in `dist/`. Deploy that directory to any static host
with HTTPS, such as Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

## Install on a phone

1. Deploy the `dist/` directory to an HTTPS URL.
2. Open the URL in Chrome on Android.
3. Choose **Install app** or **Add to Home screen** from the browser menu.
4. Launch Lexiloop from the home screen. The app and vocabulary library work
   offline after the first successful load.

Review history is stored locally on the device. Clearing browser data removes
that history.

## Vocabulary data

The generated dataset lives at `src/data/vocab.json`. To rebuild it from the
source CSV:

```bash
npm run build:vocab -- "/path/to/word-list.csv"
```

Definitions come from the local WordNet database. Example sentences use
WordNet examples when available and contextual templates otherwise.
