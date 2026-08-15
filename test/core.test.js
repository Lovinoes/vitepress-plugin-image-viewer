import assert from 'node:assert/strict'
import test from 'node:test'
import { parseHTML } from 'linkedom'

const { window } = parseHTML('<!doctype html><html><body></body></html>')

// linkedom has no layout; fake just enough for the visibility check.
window.Element.prototype.getClientRects = function () {
  return this.getAttribute('style')?.includes('display:none') ||
    this.closest('[style*="display:none"]')
    ? []
    : [{ width: 160, height: 80 }]
}
// Size comes from data-w/data-h so tests can vary it per element.
window.Element.prototype.getBoundingClientRect = function () {
  return { width: +(this.dataset.w ?? 160), height: +(this.dataset.h ?? 80) }
}

for (const key of ['document', 'Image', 'MutationObserver', 'HTMLImageElement']) {
  globalThis[key] = window[key]
}
// linkedom ships no XMLSerializer; markup shape is all these tests inspect.
globalThis.XMLSerializer = class {
  serializeToString(node) {
    return node.outerHTML
  }
}

const { imageUrl, isViewableImage, isViewableSvg, svgToDataUrl } = await import('../dist/core.js')

const html = (markup) => {
  document.body.innerHTML = markup
  return document.body
}
const img = (markup) => html(markup).querySelector('img')

test('imageUrl prefers the explicit override, then the resolved source', () => {
  assert.equal(imageUrl(img('<img src="/a.png" data-viewer-src="/full.png">')), '/full.png')
  assert.equal(imageUrl(img('<img src="/a.png">')), '/a.png')
  assert.equal(imageUrl(img('<img alt="no src">')), '')
  assert.equal(imageUrl(img('<img src="">')), '')
})

test('isViewableImage skips opted-out, hidden and source-less images', () => {
  assert.equal(isViewableImage(img('<img src="/a.png">')), true)
  assert.equal(isViewableImage(img('<img src="/a.png" data-viewer-ignore>')), false)
  assert.equal(isViewableImage(img('<div class="no-viewer"><img src="/a.png"></div>')), false)
  assert.equal(isViewableImage(img('<img src="/a.png" style="display:none">')), false)
  assert.equal(isViewableImage(img('<img alt="no src">')), false)
})

test('isViewableSvg takes diagrams and leaves icons alone', () => {
  const svg = (markup) => html(markup).querySelector('svg')
  // A mermaid flowchart, including a wide and short one.
  assert.equal(isViewableSvg(svg('<svg data-w="355" data-h="289"></svg>')), true)
  assert.equal(isViewableSvg(svg('<svg data-w="609" data-h="80"></svg>')), true)
  // A Font Awesome glyph, and a decorative rule.
  assert.equal(isViewableSvg(svg('<svg data-w="30" data-h="24" aria-hidden="true"></svg>')), false)
  assert.equal(isViewableSvg(svg('<svg data-w="30" data-h="24"></svg>')), false)
  assert.equal(isViewableSvg(svg('<svg data-w="600" data-h="8"></svg>')), false)
  // Interactive or opted out.
  assert.equal(isViewableSvg(svg('<button><svg data-w="355" data-h="289"></svg></button>')), false)
  assert.equal(isViewableSvg(svg('<a href="#"><svg data-w="355" data-h="289"></svg></a>')), false)
  assert.equal(isViewableSvg(svg('<svg data-w="355" data-h="289" data-viewer-ignore></svg>')), false)
  // Hidden, so it has no box at all.
  assert.equal(isViewableSvg(svg('<svg data-w="0" data-h="0"></svg>')), false)
})

test('svgToDataUrl serialises an inline svg with oversampled dimensions', () => {
  const svg = html('<svg style="max-width: 160px"><rect width="10" height="10"/></svg>').querySelector(
    'svg'
  )
  const url = svgToDataUrl(svg)
  assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'))
  const xml = decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length))
  assert.match(xml, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  // viewBox keeps the displayed geometry, width/height rasterise it at 2x.
  assert.match(xml, /viewBox="0 0 160 80"/)
  assert.match(xml, /width="320"/)
  assert.match(xml, /height="160"/)
  assert.doesNotMatch(xml, /max-width/)
  assert.match(xml, /<rect/)
  // The live node must not be touched.
  assert.equal(svg.getAttribute('width'), null)
  assert.match(svg.getAttribute('style'), /max-width/)
})
