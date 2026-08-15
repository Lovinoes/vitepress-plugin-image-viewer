import Viewer from 'viewerjs'

export type ViewerOptions = Viewer.Options

export interface ImageViewerOptions {
  /** CSS selector for the container(s) to scan. Every match gets its own viewer. Default `.vp-doc` */
  selector?: string
  /** viewerjs options, merged over the defaults */
  viewer?: ViewerOptions
  /** Open inline `<svg>` (mermaid diagrams, embedded vectors) too. Default `true` */
  svg?: boolean
  /** Cursor shown over anything clickable. `false` leaves the page's own. Default `zoom-in` */
  cursor?: string | false
}

export interface ImageViewerHandle {
  /** Re-scan the DOM. Runs automatically whenever the page content changes. */
  refresh(): void
  /** Tear down every viewer and stop watching the DOM. */
  destroy(): void
}

/**
 * A bare number here is viewerjs' *responsive visibility* level, not a size.
 * `4` means `hide-md-down`, which blanks the whole toolbar below 1200px. The
 * object form is what actually gives large, always-visible buttons.
 */
const BUTTON: Viewer.ToolbarButtonOptions = { show: true, size: 'large' }

const DEFAULT_OPTIONS: ViewerOptions = {
  navbar: false,
  title: false,
  toolbar: {
    zoomIn: BUTTON,
    zoomOut: BUTTON,
    prev: BUTTON,
    next: BUTTON,
    reset: BUTTON,
    oneToOne: BUTTON
  }
}

const SINGLE_IMAGE_TOOLBAR: ViewerOptions['toolbar'] = {
  zoomIn: BUTTON,
  zoomOut: BUTTON,
  reset: BUTTON,
  oneToOne: BUTTON,
  rotateLeft: BUTTON,
  rotateRight: BUTTON
}

/** viewerjs animates unconditionally; honour the OS setting instead. */
const motionSafe = (): boolean =>
  typeof window === 'undefined' ||
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Opt-out hooks, plus viewerjs' own overlay so it never views itself. */
const IGNORE = '[data-viewer-ignore], .no-viewer, .viewer-container'

/**
 * Full-size URL of an image. `currentSrc` is what `<picture>`/`srcset` actually
 * resolved to; `src` alone would open the low-res fallback.
 */
export const imageUrl = (img: HTMLImageElement): string =>
  img.dataset.viewerSrc || img.currentSrc || (img.getAttribute('src') ? img.src : '')

/** False for `display: none` (light/dark image pairs) and detached nodes. */
const isVisible = (el: Element): boolean => el.getClientRects().length > 0

/** What the default viewerjs `filter` uses. Exported so custom filters can reuse it. */
export const isViewableImage = (img: HTMLImageElement): boolean =>
  !!imageUrl(img) && !img.closest(IGNORE) && isVisible(img)

/**
 * Below this, an inline `<svg>` is an icon or a rule rather than a diagram worth
 * enlarging. Area rather than per-side, so a wide, short flowchart still counts.
 */
const SVG_MIN_AREA = 100 * 100

const outermostSvg = (el: Element): SVGSVGElement | null => {
  let svg = el.closest('svg')
  while (svg?.ownerSVGElement) svg = svg.ownerSVGElement
  return svg
}

/**
 * Inline SVG is mostly icons: Font Awesome glyphs, UI chrome, VitePress' own
 * markup. Blowing one of those up full screen is never what a click meant, so
 * only diagram-sized, non-decorative vectors qualify.
 */
export const isViewableSvg = (svg: SVGSVGElement): boolean => {
  if (svg.getAttribute('aria-hidden') === 'true') return false
  if (svg.closest(`a, button, [role="button"], label, summary, ${IGNORE}`)) return false
  const { width, height } = svg.getBoundingClientRect()
  return width * height >= SVG_MIN_AREA
}

/** Rasterise inline SVG above display size so zooming into a diagram stays sharp. */
const SVG_SCALE = 2

/** Inline SVG is not an `<img>`, so viewerjs cannot see it. Serialise it into one. */
export const svgToDataUrl = (svg: SVGSVGElement): string => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const { width, height } = svg.getBoundingClientRect()
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('viewBox') && width && height) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  // Mermaid caps its diagrams with an inline max-width, which would fight the
  // intrinsic size set below.
  clone.style.removeProperty('max-width')
  // A data-URL image needs intrinsic dimensions or it renders at 0x0, and it
  // rasterises at exactly that size.
  clone.setAttribute('width', String(Math.round(width * SVG_SCALE) || 1600))
  clone.setAttribute('height', String(Math.round(height * SVG_SCALE) || 1200))
  const xml = new XMLSerializer().serializeToString(clone)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
}

/**
 * Open a single image in an overlay, independent of any container viewer.
 * The viewer and its host element are torn down when the overlay closes.
 */
export function openImageViewer(src: string, alt = '', options?: ViewerOptions): Viewer {
  const host = document.createElement('div')
  host.setAttribute('data-viewer-ignore', '')
  host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden'
  const img = new Image()
  img.alt = alt
  img.src = src
  host.append(img)
  document.body.append(host)

  let viewer!: Viewer
  viewer = new Viewer(img, {
    ...DEFAULT_OPTIONS,
    toolbar: SINGLE_IMAGE_TOOLBAR,
    transition: motionSafe(),
    ...options,
    hidden(event) {
      options?.hidden?.call(this, event)
      viewer.destroy()
      host.remove()
    }
  })
  viewer.show()
  return viewer
}

interface Attached {
  /** viewerjs sets this synchronously in `show`/`hide`; it is just not in its types. */
  isShown(): boolean
  teardown(): void
}

/** Wire one container. */
function attach(container: HTMLElement, options: ImageViewerOptions): Attached {
  const userFilter = options.viewer?.filter
  const accepts = (self: unknown, image: HTMLImageElement) =>
    isViewableImage(image) && (!userFilter || !!userFilter.call(self, image))

  const viewer = new Viewer(container, {
    ...DEFAULT_OPTIONS,
    transition: motionSafe(),
    ...options.viewer,
    url: options.viewer?.url ?? imageUrl,
    filter(image: HTMLImageElement) {
      return accepts(this, image)
    }
  })

  // Nothing about an image says "click me", and viewerjs styles only its own
  // overlay. Hint on exactly what this viewer would actually open.
  const cursor = options.cursor ?? 'zoom-in'
  const hinted: Array<HTMLElement | SVGElement> = []
  if (cursor) {
    const hint = (el: HTMLElement | SVGElement) => {
      el.style.setProperty('cursor', cursor)
      hinted.push(el)
    }
    for (const image of container.querySelectorAll('img')) {
      if (accepts(viewer, image)) hint(image)
    }
    if (options.svg !== false) {
      for (const svg of container.querySelectorAll('svg')) {
        if (!svg.ownerSVGElement && isViewableSvg(svg)) hint(svg)
      }
    }
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null
    if (!target || event.defaultPrevented) return

    // viewerjs opens the image but does not stop a wrapping <a> from navigating away.
    if (target instanceof HTMLImageElement) {
      if (target.closest('a') && isViewableImage(target)) event.preventDefault()
      return
    }

    if (options.svg === false) return
    const svg = outermostSvg(target)
    if (!svg || !isViewableSvg(svg)) return
    event.preventDefault()
    const label = svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || ''
    openImageViewer(svgToDataUrl(svg), label, options.viewer)
  }
  container.addEventListener('click', onClick)

  return {
    isShown: () => (viewer as Viewer & { isShown?: boolean }).isShown === true,
    teardown() {
      container.removeEventListener('click', onClick)
      for (const el of hinted) el.style.removeProperty('cursor')
      viewer.destroy()
    }
  }
}

const MEDIA = /^(img|svg|picture)$/

const isElement = (node: Node): node is Element => node.nodeType === 1

/** Did this mutation add or remove something we would want to view? */
const isMediaNode = (node: Node): boolean => {
  if (!isElement(node) || node.matches(IGNORE)) return false
  return MEDIA.test(node.localName) || !!node.querySelector('img, svg')
}

/**
 * Watches the DOM instead of the router: this catches route changes, HMR,
 * lazily rendered client components and images injected by other plugins,
 * and keeps the package free of VitePress runtime imports (which would break
 * the SSR build, where Node rather than Vite loads this module).
 */
export function createImageViewer(options: ImageViewerOptions = {}): ImageViewerHandle {
  const selector = options.selector || '.vp-doc'
  const attached = new Map<HTMLElement, Attached>()
  let observer: MutationObserver | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const teardownAll = () => {
    attached.forEach((a) => a.teardown())
    attached.clear()
  }

  const refresh = () => {
    if (typeof document === 'undefined') return
    // Rebuilding beats viewer.update(): update() keeps the previous page's
    // images when the new page has none, and cannot re-run a stale filter.
    teardownAll()
    document
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => attached.set(el, attach(el, options)))
  }

  // A timer, not requestAnimationFrame: rAF never fires in a background tab,
  // which would leave a page loaded there without a viewer.
  const schedule = (delay = 0) => {
    if (timer !== undefined) return
    timer = setTimeout(() => {
      timer = undefined
      // Never rebuild a viewer the user currently has open, since it would close
      // on them. Checked per instance rather than via viewerjs' `viewer-open` body
      // class, which other instances set too and can be left behind.
      for (const a of attached.values()) if (a.isShown()) return schedule(200)
      refresh()
    }, delay)
  }

  const isStale = (records: MutationRecord[]): boolean => {
    for (const el of attached.keys()) if (!el.isConnected) return true
    return records.some((r) => {
      const target = r.target as Element
      if (target.closest?.(IGNORE)) return false
      const nodes = [...r.addedNodes, ...r.removedNodes]
      // A whole container appeared or disappeared.
      if (nodes.some((n) => isElement(n) && (n.matches(selector) || !!n.querySelector(selector))))
        return true
      // Images changed inside a container we already watch.
      return !!target.closest?.(selector) && nodes.some(isMediaNode)
    })
  }

  if (typeof document !== 'undefined') {
    observer = new MutationObserver((records) => {
      if (isStale(records)) schedule()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    // Hydration reuses the server-rendered DOM without mutating it, so the
    // observer stays silent on first load. Scan once the app has mounted.
    schedule()
  }

  return {
    refresh,
    destroy() {
      observer?.disconnect()
      observer = undefined
      clearTimeout(timer)
      timer = undefined
      teardownAll()
    }
  }
}
