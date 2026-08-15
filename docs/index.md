# Demo

Every image below should open in the viewer, except the two marked otherwise.

## Markdown image

![a markdown image](/demo.png)

## Linked image

Opens the viewer instead of following the link.

[![a linked image](/demo.png)](https://example.com/should-not-navigate)

## `<picture>` / `srcset`

The viewer opens whatever the browser actually resolved, not the fallback.

<picture>
  <source srcset="/demo.png" type="image/png">
  <img src="/demo.png" alt="a picture element">
</picture>

## Inline SVG

<svg width="220" height="90" viewBox="0 0 220 90" aria-label="an inline svg">
  <rect width="220" height="90" rx="8" fill="#ff6348" />
  <text x="20" y="52" fill="white" font-family="sans-serif">inline svg</text>
</svg>

## Opted out

<img src="/demo.png" alt="ignored" data-viewer-ignore width="200">

## Hidden

Never collected, so it does not leave a gap in the gallery.

<img src="/demo.png" alt="hidden" style="display: none">

## Component

<VImageViewer src="/demo.png" alt="open the demo image" />
