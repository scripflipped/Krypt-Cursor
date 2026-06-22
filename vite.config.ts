import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import { builtinModules, createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

function restoreSystemCursorOnExit(): Plugin {
  return {
    name: 'krypt:dev-restore-cursor',
    apply: 'serve',
    configureServer() {
      if (process.platform !== 'win32') return;
      let restore: (() => void) | null = null;
      try {
        const koffi = require('koffi');
        const user32 = koffi.load('user32.dll');
        const spi = user32.func('bool SystemParametersInfoW(uint32 a, uint32 b, void* c, uint32 d)');
        restore = () => {
          try { spi(0x0057 , 0, null, 0); } catch {  }
        };
      } catch {
        return;
      }
      let done = false;
      const run = (): void => { if (!done) { done = true; restore?.(); } };
      process.on('exit', run);
      for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
        process.once(sig, () => { run(); process.exit(0); });
      }
    },
  };
}

const native = ['discord-rpc', 'uiohook-napi', 'koffi'];
const external = ['electron', ...native, ...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

const cjsBuild = (entry: string) => ({
  entry,
  vite: { build: { outDir: 'dist-electron', rollupOptions: { external } } },
});

export default defineConfig({
  plugins: [
    react(),
    restoreSystemCursorOnExit(),
    electron([
      cjsBuild('electron/main.ts'),
      { ...cjsBuild('electron/preload.ts'), onstart: ({ reload }) => reload() },
    ]),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        overlay: resolve(__dirname, 'overlay.html'),
      },
    },
  },
  server: { port: 5174 },
  clearScreen: false,
});
