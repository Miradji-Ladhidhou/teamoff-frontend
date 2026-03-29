import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function legacyResetPasswordRedirect() {
  return {
    name: 'legacy-reset-password-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''

        if (!url.startsWith('/reset-password/')) {
          next()
          return
        }

        const pathWithoutQuery = url.split('?')[0]
        const legacyPrefix = '/reset-password/'
        const token = pathWithoutQuery.slice(legacyPrefix.length)

        if (!token) {
          next()
          return
        }

        const redirectTo = `/reset-password?token=${encodeURIComponent(token)}`
        res.statusCode = 302
        res.setHeader('Location', redirectTo)
        res.end()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), legacyResetPasswordRedirect()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:5500',
        changeOrigin: true
      }
    }
  }
})