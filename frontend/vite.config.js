// vite.config.js
import path from "node:path"           // ← safer in ESM land than "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
