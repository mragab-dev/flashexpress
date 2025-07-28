import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vite does not expose process.env to the client by default for security reasons.
    // This 'define' config makes the environment variable available in the client-side code,
    // consistent with the app's original expectation.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
