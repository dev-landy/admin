# Landy brand assets

- `landy-symbol.svg`: unchanged official house mark from the mobile app's
  `app/assets/source/landy-logo.svg`; the landing header uses the same paths.
- `landy-symbol-tight.svg`: identical official paths with a viewBox fitted to
  the actual outline, including the curved roof. The source asset is retained.
- `landy-wordmark.svg`: rendered Pretendard ExtraBold (800) glyph outlines for
  Landy, shaped with kerning and the official -0.03em tracking.
- `landy-admin-label.svg`: rendered Geist (600) glyph outlines for Admin.
- Both rendered text assets have tight ink bounds. Landy is 20px high and the
  secondary Admin label is 10px high. The house bottom and the words' original
  y=0 baselines align; Landy's y descender remains below this line and is excluded
  from the lockup's vertical centering box. These offsets
  come from the SVG viewBoxes, rather than font loading or fallback metrics.
- `LICENSE-Pretendard.txt` and `LICENSE-Geist.txt`: original font licenses.

The English wordmark follows the mobile `docs/design-handoff/Landy App/logo-preview/logo-screens.jsx`
WordMark typography: Pretendard 800 and -0.03em tracking. The admin lockup
omits the circular dot at the user's request.

`BrandLogo` uses the original navy mark on light surfaces and the official app's
white mark on dark surfaces. The Admin descriptor is UI text, separate from
the official wordmark.

The wordmark and house stay mounted while the sidebar changes width. The rail,
logo spacing, house size, menu geometry and footer share a 240ms
`cubic-bezier(0.2, 0, 0, 1)` transition. On collapse, label paint is hidden
immediately and all geometry starts moving together, without an initial pause.
On expansion, text appears as its space opens. Reduced-motion preferences skip
these transitions.
