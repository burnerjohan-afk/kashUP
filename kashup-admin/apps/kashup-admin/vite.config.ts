import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tsconfigPaths()],
    server: {
      port: 5173,
      // Écoute sur toutes les interfaces (localhost + LAN). L’URL "Network" affichée par Vite
      // est détectée au démarrage ; en cas de changement d’IP (ex. 192.168.1.19), redémarrer le serveur.
      host: '0.0.0.0',
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
    build: {
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./vitest.setup.ts'],
      coverage: {
        reporter: ['text', 'lcov'],
        provider: 'v8',
      },
    },
  };
});

