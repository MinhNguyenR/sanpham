// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { // Mọi yêu cầu bắt đầu bằng '/api'
        target: 'http://localhost:5000', // Sẽ được chuyển hướng đến backend đang chạy ở cổng 5000
        changeOrigin: true, // Thay đổi origin của host thành target URL
        rewrite: (path) => path.replace(/^\/api/, '/api'), // Giữ nguyên '/api' trong đường dẫn
        // Nếu backend không có tiền tố '/api', bạn có thể rewrite thành:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});