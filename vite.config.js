import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// A single config serves both purposes:
//   npm run dev    -> normal Vite dev server (HMR)
//   npm run build  -> vite-plugin-singlefile inlines ALL JS + CSS into one
//                     self-contained dist/index.html (no external assets), so the
//                     app keeps its "open one file, no server" delivery property.
// If a plain multi-file production build is ever needed, temporarily remove the
// viteSingleFile() plugin below. The single-file bundle is the intended default.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // Belt-and-suspenders for full inlining (the plugin sets most of these too).
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100_000_000,
  },
});
