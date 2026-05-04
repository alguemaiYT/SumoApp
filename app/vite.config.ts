import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../www',
    emptyOutDir: true,
    minify: false
  },
  server: {
    port: 5173,
    host: true
  }
})
