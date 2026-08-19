# Self-hosted fonts for Paperlytic — verification + final implementation path

Typography/font-loading only. No changes to feed loading, SSR, TanStack Query, Supabase, Apps Script, Sheets, triggers, article data, or layout.

## Answers to the technical questions

1. **Bundling.** `@fontsource` ships plain CSS with relative `url(./files/*.woff2)`. Importing those CSS files from `src/styles.css` makes Lightning CSS/Vite resolve each `url()` from node_modules, emit the file as a hashed build asset (`/_build/assets/instrument-serif-latin-400-normal-<hash>.woff2`), and rewrite the reference. Nothing is fetched at runtime from a third party.
2. **Automatic discovery.** Vite handles the rewrite and long-term-cacheable hashed filenames automatically, but it does **not** emit `<link rel="preload">` for fonts referenced inside CSS. So the browser still discovers the font only after the app CSS parses — one hop instead of the current two. Preload is therefore optional but still worth ~1 round trip on a cold load.
3. **Duplicate downloads.** Only if the preload URL differs from the CSS URL. Hardcoding a path would risk that; importing the same module (`...woff2?url`) yields the identical emitted asset, so the browser reuses one request. Also required: `as="font" type="font/woff2" crossorigin` — a preload without `crossorigin` is the classic cause of a double fetch.
4. **Referencing hashed URLs from `__root.tsx`.** Yes — via `import serif400 from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url"` and using that value in the `head().links` array. Never a literal path string.
5. **Cleaner option.** The `?url` import above *is* the build-system-native way; it is stable across SSR and client because Vite injects the same resolved URL into both graphs.
6. **Exact files included.** Latin subset only, matching current usage: Instrument Serif 400 normal (+400 italic only if italics are actually rendered), IBM Plex Sans 400/500/600 normal, IBM Plex Mono 400/500 normal. Importing the `latin-*.css` entrypoints (not the package root) avoids pulling cyrillic/greek/vietnamese subsets and unused weights. The legacy `.woff` fallback in each `@font-face` also gets emitted to the build, but no modern browser downloads it.
7. **Payload.** ~21 KB serif + ~71 KB sans (3 weights) + ~30 KB mono (2 weights) ≈ **122 KB** of woff2, of which only the fonts actually used on a given page are fetched (typically serif 400 + sans 400/500 ≈ 68 KB). This replaces the same bytes previously pulled from gstatic, plus removes two cross-origin connections.
8. **`font-display`.** Yes — `@fontsource` CSS ships `font-display: swap`, so text is never invisible. Unchanged from today.
9. **Visual typography.** Identical families, weights, and styles; same Google-published font binaries. The only intended change is that the fallback window shrinks to near-zero, and the metric-tuned fallback removes the remaining Georgia-to-serif jump.
10. **SSR / hydration / caching / feed.** No impact. Font CSS is static, resolved at build time, and touches neither the loader, the query cache, nor the persister. Hashed filenames are immutably cacheable — strictly better than the current gstatic dependency.

**Confirmations:** no Google Fonts request remains (the `<link>` and both `preconnect`s are removed); no hardcoded gstatic URLs are introduced; no unrelated dependencies are upgraded; exactly three `@fontsource` packages are added; existing typography, weights, styles, and layout stay as-is.

## Final implementation path

1. `bun add @fontsource/instrument-serif @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`.
2. In `src/styles.css`, at the very top of the existing `@import` block (before `@theme`):
   `@import "@fontsource/instrument-serif/latin-400.css";` plus `latin-400/500/600.css` for IBM Plex Sans and `latin-400/500.css` for IBM Plex Mono (italic serif added only if used).
3. In `src/routes/__root.tsx`: delete the `fonts.googleapis.com` stylesheet link and the two `preconnect` links; add `?url` imports for the serif 400 and sans 400 woff2 and two `rel="preload"` link entries with `as="font"`, `type="font/woff2"`, `crossOrigin: "anonymous"`.
4. In `src/styles.css`, add two metric-matched fallback `@font-face` blocks ("Instrument Serif Fallback" over Georgia, "Plex Sans Fallback" over system-ui) using `size-adjust`/`ascent-override`/`descent-override`, and insert them into the `--font-display` and `--font-sans` stacks in `@theme`.
5. Verify: throttled headless load showing no request to fonts.googleapis.com/gstatic.com, headings rendering in Instrument Serif, exactly one request per font file, and unchanged page layout.
