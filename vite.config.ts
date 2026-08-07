import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  root: 'src/ui',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['../..'],
    },
  },
  plugins: [
    {
      name: 'serve-graph-json',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/graph.json') {
            const file = path.resolve(__dirname, '.spidermap/graph.json');
            if (fs.existsSync(file)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(fs.readFileSync(file));
              return;
            }
          }
          next();
        });
      }
    }
  ]
});
