# vitepress-plugin-viewerjs

Click any image in your VitePress docs to open it in a [viewerjs](https://github.com/fengyuanchen/viewerjs) lightbox.

A fork of [T-miracle/vitepress-plugin-image-viewer](https://github.com/T-miracle/vitepress-plugin-image-viewer),
rewritten for VitePress 2.x alpha and in use on the [Calagopus](https://calagopus.com) docs.
Still works on VitePress 1.x.

## Install

```bash
npm i vitepress-plugin-viewerjs viewerjs
```

## Usage

`.vitepress/theme/index.ts`:

```ts
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import 'viewerjs/dist/viewer.css'
import useImageViewer, { VImageViewer } from 'vitepress-plugin-viewerjs'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Only if you want the <VImageViewer> component in markdown.
    app.component('VImageViewer', VImageViewer)
  },
  setup() {
    useImageViewer()
  }
} satisfies Theme
```

The `viewer.css` import has to live in your theme file. The plugin is plain
JavaScript so VitePress can load it during the SSR build, which means it cannot
import a stylesheet on your behalf.

### Options

```ts
useImageViewer({
  selector: '.vp-doc',   // container(s) to scan; every match gets its own viewer
  svg: true,             // also open inline <svg> (mermaid diagrams, etc.)
  cursor: 'zoom-in',     // cursor over anything clickable; false to leave the page's own
  viewer: {}             // https://github.com/fengyuanchen/viewerjs#options
})
```

Returns `{ refresh, destroy }`. Disposed automatically with the surrounding component.

## What gets a viewer

| | |
| --- | --- |
| `![]()` and `<img>` | png, jpeg, gif, webp, avif, svg |
| `<picture>` / `srcset` | opens the source the browser resolved, not the fallback |
| images inside links | opens the viewer instead of following the link |
| inline `<svg>` | mermaid and the like, serialised at 2x so zooming stays sharp |
| images added later | lazy content, client-only components, other plugins |

Skipped: `display: none` images (so light/dark pairs leave no gaps), anything
marked `data-viewer-ignore` or inside `.no-viewer`, and inline SVG that is an
icon rather than a diagram (`aria-hidden`, under 100x100 in area, or inside a
link or button).

Point at a higher-resolution original with `data-viewer-src`:

```html
<img src="/thumb.png" data-viewer-src="/original.png" alt="a thumbnail">
```

## Component

```md
<VImageViewer src="/demo.png" alt="open the demo image" />
```

| prop | type | default |
| --- | --- | --- |
| `src` | `string` | required |
| `alt` | `string` | `''`, also the button label |
| `inline` | `boolean` | `false` |
| `options` | `Viewer.Options` | none |

`openImageViewer(src, alt?, options?)` is exported too.

## Changes from 1.x

- The package is published as `vitepress-plugin-viewerjs`. Upstream keeps the
  `vitepress-plugin-image-viewer` name.
- `imageViewer(route)` becomes `useImageViewer()`. The route argument is gone.
  The plugin watches the DOM instead of the router, so it also picks up images
  that appear after the page renders. The old three-argument call still works.
- `vitepress-plugin-image-viewer/lib/vImageViewer.vue` becomes
  `import { VImageViewer } from 'vitepress-plugin-viewerjs'`. The component
  owns its own viewer now, so it works outside `.vp-doc`.
- Default `toolbar` no longer uses bare numbers. viewerjs reads those as a
  responsive visibility level, not a button size, so `{ zoomIn: 4 }` and friends
  hid the entire toolbar below 1200px. If you pass your own, use
  `{ show: true, size: 'large' }` per button.
- Viewers are rebuilt per page rather than updated, so a page with no images no
  longer inherits the previous page's gallery, and they are destroyed on unmount.

## Development

```bash
pnpm install && pnpm test && pnpm docs:dev
```

## License

MIT
