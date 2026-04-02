import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import recipeHandler from './api/recipe.js';
import similarHandler from './api/similar.js';
import imageHandler from './api/image.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'api-dev-server',
        configureServer(server) {
          server.middlewares.use('/api', (req, res, next) => {
            // Add Express-like helpers that Vercel handlers expect
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };

            let raw = '';
            req.on('data', (chunk) => { raw += chunk; });
            req.on('end', async () => {
              try { req.body = raw ? JSON.parse(raw) : {}; }
              catch { req.body = {}; }

              if (req.url === '/recipe')  return recipeHandler(req, res);
              if (req.url === '/similar') return similarHandler(req, res);
              if (req.url === '/image')   return imageHandler(req, res);
              next();
            });
          });
        },
      },
    ],
  };
});
