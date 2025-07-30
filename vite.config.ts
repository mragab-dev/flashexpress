import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces to allow ngrok/network access
    host: '0.0.0.0',

    // Add the ngrok host to allowedHosts
    // This must match the ngrok URL EXACTLY (without the https:// or http:// part)
    allowedHosts: [
      '32857d42ea28.ngrok-free.app', // <-- Your current ngrok host
      'localhost',
      '127.0.0.1'
    ],
    //ngrok http 5173
    // Hot Module Replacement (HMR) configuration for ngrok
    // This is crucial for live updates to work through the ngrok tunnel.
    hmr: {
      // The HMR host should be the ngrok URL (without the https://)
      host: '32857d42ea28.ngrok-free.app', // <-- Your current ngrok host
      protocol: 'wss', // Use secure WebSocket for HMR over the HTTPS ngrok tunnel
      clientPort: 443 // Default HTTPS port
    },

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