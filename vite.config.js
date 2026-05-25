import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages のリポジトリサブパスに合わせて変更する
  // 例: https://username.github.io/lifegame-rogue-lite/ なら '/lifegame-rogue-lite/'
  base: '/lifegame-rogue-lite/',
  build: {
    // ES Module をそのまま配信（バンドルしない）
    rollupOptions: {
      input: 'index.html'
    }
  }
});
