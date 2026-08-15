import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vitepress-plugin-viewerjs',
  description: 'Demo / manual test page',
  themeConfig: {
    nav: [
      { text: 'Demo', link: '/' },
      { text: 'No images', link: '/empty' }
    ]
  }
})
