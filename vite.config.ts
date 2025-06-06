import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
              return 'mui';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('react-router-dom')) {
              return 'react-router-dom';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})
