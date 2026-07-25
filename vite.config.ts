import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/auth": "http://localhost:8000",
      "/records": "http://localhost:8000",
      "/tasks": "http://localhost:8000",
      "/agenda": "http://localhost:8000",
      "/settings": "http://localhost:8000",
      "/memories": "http://localhost:8000",
      "/agent-plans": "http://localhost:8000",
      "/agent-runs": "http://localhost:8000",
      "/events": "http://localhost:8000",
      "/sync": "http://localhost:8000",
      "/onboarding": "http://localhost:8000",
    },
  },
})
