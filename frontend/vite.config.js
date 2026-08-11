import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pinned port: this workspace runs several Vite dev servers at once, and the
// backend's CORS allowlist (FRONTEND_URL in backend/.env) needs a fixed
// origin to match against rather than whatever port happens to be free.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    strictPort: true,
  },
})
