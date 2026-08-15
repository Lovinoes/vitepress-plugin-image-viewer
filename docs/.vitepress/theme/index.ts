import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import 'viewerjs/dist/viewer.css'
import useImageViewer, { VImageViewer } from '../../../src/index.js'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VImageViewer', VImageViewer)
  },
  setup() {
    useImageViewer()
  }
} satisfies Theme
