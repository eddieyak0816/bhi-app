import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  base: '/bhi-app/'  // Change 'bhi-app' to your GitHub repo name if different
});
