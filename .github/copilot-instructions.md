Repository guidance for GitHub Copilot and AI assistants

Project: wa-sticker-formatter — TypeScript library to create and format WhatsApp stickers (WebP) from images, GIFs, and videos, and to read/write sticker metadata.

High-level summary
- Primary entry points: `Sticker` class, `createSticker` factory, `extractMetadata` util, `StickerTypes` enum.
- Supported inputs: Buffer, local file path, HTTP(S) URL, raw SVG string.
- Outputs: WebP buffer (`toBuffer`/`build`), saved WebP file (`toFile`), or Baileys-MD compatible message object (`toMessage`).
- Metadata: EXIF-like JSON embedded via `node-webpmux` containing pack id/name, author, categories (emojis).
- Image pipeline: `sharp` for processing, `fluent-ffmpeg` for video/GIF handling and animated cropping, `axios` for remote fetch, `file-type` for MIME detection.

Public API surface (src/index.ts)
- Default export: `Sticker` class.
- Named exports:
  - `Sticker` (class)
  - `createSticker(...args: ConstructorParameters<typeof Sticker>): Promise<Buffer>`
  - `extractMetadata(image: Buffer): Promise<Partial<IRawMetadata>>`
  - `StickerTypes` enum: `DEFAULT | CROPPED ('crop') | FULL ('full') | CIRCLE ('circle') | ROUNDED ('rounded')`
  - `StickerMetadata` class (helper builder; default export from internal path)
  - `Exif` class (internal metadata writer; default export from internal path)
  - Types: `IStickerConfig`, `IStickerOptions`, `IRawMetadata`, `Categories`

Sticker class contract (src/Sticker.ts)
- Constructor
  - `data: string | Buffer` — file path, URL, Buffer, or raw SVG string (starts with `<svg`).
  - `metadata?: Partial<IStickerOptions>` — fields defaulted as:
    - `author?: string` -> ''
    - `pack?: string` -> ''
    - `id?: string` -> random 32-byte hex (`Utils.generateStickerID()`)
    - `quality?: number` -> 100
    - `type?: StickerTypes | string` -> one of `StickerTypes`, otherwise `DEFAULT`
    - `background?: sharp.Color` -> transparent (`defaultBg`)
- Methods
  - `build()` / `toBuffer()`: Promise<Buffer> — convert + attach EXIF metadata.
  - `toFile(filename = defaultFilename)`: Promise<string> — saves WebP.
  - Fluent setters: `setPack`, `setAuthor`, `setID`, `setCategories`, `setType`, `setQuality`, `setBackground`.
  - `toMessage()`: Promise<{ sticker: Buffer }> — for Baileys.
  - `defaultFilename`: `./<pack>-<author>.webp` (getter).
  - `static extractMetadata = extractMetadata`.

Conversion pipeline (src/internal/convert.ts)
1) Determine animation and video:
   - Videos are converted to GIF via `videoToGif` (ffmpeg), then processed.
   - `isAnimated` if video, or MIME includes `gif`/`webp`.
2) For animated inputs with `type` in `['crop','circle','rouded']`:
   - Persist temp WebP, run `crop` (ffmpeg) when needed, then normalize `type` back to `DEFAULT | CIRCLE | ROUNDED`.
3) Apply shape/fit with `sharp`:
   - DEFAULT: no extra fit, final `.webp({ quality, lossless: false })`.
   - CROPPED: 512x512 cover.
   - FULL: 512x512 contain with `background` (transparent by default).
   - CIRCLE: 512x512 cover + SVG circle mask (`dest-in`).
   - ROUNDED: 512x512 cover + SVG rounded-rect mask (`dest-in`).
4) Always encode to WebP; final EXIF metadata is added via `Exif.add` in `Sticker.build()`.

Metadata (src/internal/Metadata)
- JSON shape embedded in EXIF:
  - `sticker-pack-id` (string)
  - `sticker-pack-name` (string)
  - `sticker-pack-publisher` (string)
  - `emojis` (string[])
- `RawMetadata` maps from `Metadata` (config) to the EXIF payload; `Utils.generateStickerID()` used when `id` absent.
- `extractMetadata(buffer)` uses `node-webpmux` to parse and returns parsed JSON subset.

Types and categories (src/Types.ts)
- `IStickerConfig`: `pack?`, `author?`, `id?`, `categories?: Categories[]`.
- `IStickerOptions` extends `IStickerConfig` with `type?`, `quality?` (0-100), `background?` (sharp.Color).
- `IRawMetadata` as above. `Categories` is a union of whitelisted emoji types (Love/Happy/Sad/Angry/Greet/Celebrate).

Important behaviors and edge cases
- Input detection:
  - Buffer: used as-is.
  - String starting with `<svg`: treated as raw SVG; converted via `sharp`.
  - Existing local path: read from disk.
  - Otherwise: fetched via HTTP(S) using `axios` (responseType `arraybuffer`).
- MIME detection with `file-type`:
  - If unknown and input is a string: assumed SVG (`image/svg+xml`).
  - Otherwise throws `Invalid file type`.
- Animated handling:
  - ffmpeg must be installed on the host for video/GIF processing and animated crop.
  - Temp files are created in `os.tmpdir()` and cleaned up (videos/gifs in `videoToGif`, intermediates after use in `crop`).
- Quality bounds: Callers should provide 0–100. Defaults to 100.
- Background:
  - Only meaningful for `FULL` and as mask fill color for `CIRCLE/ROUNDED` shapes.
  - Defaults to fully transparent RGBA.
- Default filename uses `pack` and `author`; ensure those are filesystem-safe when customizing.

Development environment
- Node: project targets TS with `@types/node@^16` and `sharp@^0.30.0`.
- Required native/CLI tooling: `ffmpeg` available in PATH.
- Scripts
  - `npm run build` — compile TypeScript to `dist`.
  - `npm test` — mocha via ts-node (tests in `tests/`).
  - `npm run lint` — ESLint on `src/**/*.ts`.
  - `npm run fmt` — Prettier formatting.
  - `npm run examples` — runs example scripts in `examples/`.
  - `npm run doc` — generate typedoc.
- Publish: `prepublish` runs build; package exposes `dist` as `main` and `types`.

Code conventions and constraints
- Preserve public API exports from `src/index.ts`. Do not break `default` export of `Sticker`.
- Type additions: centralize in `src/Types.ts` and re-export from `src/index.ts` when part of the public API.
- Keep `StickerTypes` string values stable; they are used in README and examples. When adding new types:
  1) Extend `StickerTypes` enum.
  2) Update switch in `src/internal/convert.ts` to implement behavior.
  3) Add examples under `examples/` and tests under `tests/`.
  4) Document in README and typedoc.
- Avoid unnecessary re-encoding when not needed; always end with `.webp({ quality, lossless: false })` for consistency.
- Use `fs-extra` for file I/O, and prefer async/await patterns used across the codebase.

Testing guidance
- Add unit tests for:
  - Sticker creation for each `StickerTypes` variant (static + animated where applicable).
  - `extractMetadata` round-trip: metadata set via `Sticker` should be readable back.
  - Error cases: invalid MIME, network failure for URL, ffmpeg absent (skip or detect), quality bounds.
- Use small input assets or remote GIF/PNG URLs as in `examples/` to keep tests fast.

Troubleshooting
- ENOENT or processing failures on animated inputs typically indicate missing `ffmpeg`.
- `Invalid file type`: confirm the input is a valid image/video/gif or provide SVG string.
- Sharp install issues: ensure environment meets sharp’s libvips requirements.

How to add a new sticker shape (example checklist)
1) Add enum member in `src/internal/Metadata/StickerTypes.ts`.
2) Implement shape in `src/internal/convert.ts` using `sharp` compositing/masks or pre-process animated frames via ffmpeg if needed.
3) Export type through `src/index.ts` if public.
4) Add a usage example in `examples/<shape>.ts` and wire it in `examples/index.ts`.
5) Add tests covering the new type.
6) Update README “Sticker Types” section and options docs.

Security and networking
- Remote URL handling uses `axios`. Avoid enabling redirects to file:// or internal addresses; if adding features, be mindful of SSRF risks.
- Do not embed untrusted metadata beyond the defined JSON structure.

Performance tips
- Keep animated output to 512x512 and moderate FPS (ffmpeg params already constrain this) to limit file size.
- Use lower `quality` for smaller sticker size when needed.

Assistant Do’s and Don’ts
- Do preserve the public API and default exports.
- Do update all references when renaming or moving internal modules.
- Do add types and minimal tests alongside new features.
- Don’t introduce breaking changes without surfacing them in README and tests.
- Don’t assume `ffmpeg` availability in CI without checking or skipping animated tests.

Acceptance criteria for changes suggested by AI
- Build passes: `npm run build`.
- Lint passes: `npm run lint`.
- Tests pass locally: `npm test` (skip animated tests if no ffmpeg; mark accordingly).
- Examples still run: `npm run examples`.
- No change to public API without explicit approval and docs update.

Quick reference: file map
- `src/index.ts` — public exports.
- `src/Sticker.ts` — main class and `createSticker`.
- `src/extractMetadata.ts` — read EXIF-embedded metadata.
- `src/internal/convert.ts` — core image/video pipeline.
- `src/internal/crop.ts`, `src/internal/videoToGif.ts`, `src/internal/imagesToWebp.ts` — ffmpeg helpers.
- `src/internal/Metadata/*` — metadata building, enum, and EXIF writer.
- `examples/*` — runnable examples per sticker type.
- `tests/*` — mocha tests.

This document is intended to guide GitHub Copilot and similar assistants when proposing edits, writing tests, or answering questions about this repository.
