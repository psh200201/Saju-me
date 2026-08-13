import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function geminiEnvPlugin(apiKey) {
  const virtualId = 'virtual:gemini-env'
  const resolvedId = '\0' + virtualId

  return {
    name: 'gemini-env',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id === resolvedId) {
        return `export const GEMINI_API_KEY = ${JSON.stringify(apiKey)}`
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.VITE_GEMINI_API_KEY || ''

  if (!apiKey) {
    console.warn('[vite] VITE_GEMINI_API_KEY not found in .env')
  } else {
    console.log('[vite] VITE_GEMINI_API_KEY loaded (length=' + apiKey.length + ')')
  }

  return {
    plugins: [react(), geminiEnvPlugin(apiKey)],
    publicDir: 'public',
  }
})
