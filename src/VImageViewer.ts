import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { openImageViewer } from './core.js'
import type { ViewerOptions } from './core.js'

/**
 * A button that opens one image in the viewer. Unlike the container viewer it
 * is self-contained, so it works anywhere, including outside `.vp-doc`.
 */
export const VImageViewer = defineComponent({
  name: 'VImageViewer',
  props: {
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    /** Render as an inline element instead of a block. */
    inline: { type: Boolean, default: false },
    options: { type: Object as PropType<ViewerOptions>, default: undefined }
  },
  setup(props) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: 'v-image-viewer',
          style: {
            display: props.inline ? 'inline-block' : 'block',
            margin: props.inline ? '0' : '10px 0',
            // Comfortably past the ~44px touch target guideline.
            minHeight: '44px',
            padding: '10px 16px',
            borderRadius: '4px',
            cursor: 'zoom-in',
            background: 'var(--vp-c-brand-3, #ff6348)',
            color: 'var(--vp-c-white, #fff)'
          },
          onClick: () => openImageViewer(props.src, props.alt, props.options)
        },
        props.alt || 'View image'
      )
  }
})

export default VImageViewer
