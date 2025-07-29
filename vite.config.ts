import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces to allow ngrok to connect
    host: '0.0.0.0',

    // Add the ngrok host to allowedHosts
    // This must match the ngrok URL EXACTLY (without the https:// or http:// part)
    allowedHosts: [
      '906e5a34c47b.ngrok-free.app', // <-- THIS IS THE CORRECTED LINE
      'localhost',
      '127.0.0.1'
    ],

    // Hot Module Replacement (HMR) configuration for ngrok
    // This is crucial for live updates to work through the ngrok tunnel.
    hmr: {
      // The HMR host should also be the ngrok URL (without the https://)
      host: '906e5a34c47b.ngrok-free.app', // <-- THIS IS ALSO CORRECTED (removed https://)
      protocol: 'wss', // Use secure WebSocket for HMR over the HTTPS ngrok tunnel
      clientPort: 443 // Default HTTPS port
    },

    port: 5173 // Your application's development port
  }
});