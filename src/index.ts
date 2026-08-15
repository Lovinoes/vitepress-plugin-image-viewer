import { getCurrentScope, onScopeDispose } from 'vue'
import { createImageViewer } from './core.js'
import type { ImageViewerHandle, ImageViewerOptions, ViewerOptions } from './core.js'

export {
  createImageViewer,
  openImageViewer,
  imageUrl,
  isViewableImage,
  isViewableSvg
} from './core.js'
export type { ImageViewerHandle, ImageViewerOptions, ViewerOptions } from './core.js'
export { VImageViewer, default as vImageViewer } from './VImageViewer.js'

/**
 * Enable the image viewer for the whole site. Call it from the `setup()` of
 * your VitePress theme. Remember to `import 'viewerjs/dist/viewer.css'` there
 * as well.
 */
export function useImageViewer(options?: ImageViewerOptions): ImageViewerHandle
/** @deprecated The route argument is no longer needed. Call `useImageViewer(options)`. */
export function useImageViewer(
  route: unknown,
  selector?: string,
  viewerOptions?: ViewerOptions
): ImageViewerHandle
export function useImageViewer(
  a?: ImageViewerOptions | unknown,
  b?: string,
  c?: ViewerOptions
): ImageViewerHandle {
  const isLegacyRoute = !!a && typeof a === 'object' && 'path' in a
  const options: ImageViewerOptions = isLegacyRoute
    ? { selector: b, viewer: c }
    : ((a as ImageViewerOptions) ?? {})

  const handle = createImageViewer(options)
  if (getCurrentScope()) onScopeDispose(handle.destroy)
  return handle
}

export default useImageViewer
