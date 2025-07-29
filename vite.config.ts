import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces to allow ngrok/network access
    host: '0.0.0.0', 

    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true, // Recommended for virtual hosts
      },
    },

    port: 5173 // Your application's development port
  }
});