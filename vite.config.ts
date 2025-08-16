
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// =================================================================================
// IMPORTANT: INSTRUCTIONS FOR USING NGROK WITH REAL-TIME UPDATES
// =================================================================================
// The free version of ngrok provides a new, random URL every time you start it.
// To make real-time updates work for users outside your network (e.g., on mobile),
// you MUST update the placeholder URL in this file with your current ngrok URL.
//
// 1. Start ngrok: `ngrok http 5173`
// 2. Copy the ngrok hostname (e.g., "random-word-123.ngrok-free.app")
// 3. Paste it into the TWO placeholder spots below (`allowedHosts` and `hmr.host`).
// 4. Save this file.
// 5. Restart your Vite server (the one running `npm run dev` or `npm start`).
// =================================================================================

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all network interfaces to allow ngrok/network access
    host: '0.0.0.0',

    // Add the ngrok host to allowedHosts
    allowedHosts: [
      '367026bf7890.ngrok-free.app', // <-- PASTE YOUR NGROK HOSTNAME HERE
      'localhost',
      '127.0.0.1'
    ],
    
    // Hot Module Replacement (HMR) configuration for ngrok
    hmr: {
      // The HMR host should also be the ngrok URL
      host: '367026bf7890.ngrok-free.app', // <-- PASTE YOUR NGROK HOSTNAME HERE, TOO
      protocol: 'wss', // Use secure WebSocket for HMR over the HTTPS ngrok tunnel
      clientPort: 443 // Default HTTPS port
    },

    // Proxy API requests to the backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true, // Recommended for virtual hosts
        secure: false, // Important for proxying from HTTPS (ngrok) to HTTP (local)
      },
      // Add proxy for WebSocket connections
      '/socket.io': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true, // Ensures origin header is updated, improving proxy reliability
      },
    },

    port: 5173 // Your application's development port
  }
});