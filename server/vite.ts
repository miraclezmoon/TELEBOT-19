// vite.ts
import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, createLogger } from 'vite';
import viteConfig from '../vite.config';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteLogger = createLogger();

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Dev: attach Vite to Express in middleware mode.
 * Usage (dev only): await setupVite(app)
 */
export async function setupVite(app: Express): Promise<void> {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      allowedHosts: true,
    },
    appType: 'custom',
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // die fast on Vite config/runtime errors during dev
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);

  // SPA entry (index.html) via Vite transform
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(__dirname, '..', 'client', 'index.html');

      // Always re-read template in dev
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');

      // Bust HMR cache for the entry script (optional, but handy)
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const html = await vite.transformIndexHtml(url, template);
      res.status(200).setHeader('Content-Type', 'text/html').end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Prod: serve built SPA from /client/dist (fallback to /public).
 * Usage (prod only): serveStatic(app)
 */
export function serveStatic(app: Express): void {
  const candidates = [
    path.resolve(__dirname, '..', 'client', 'dist'),
    path.resolve(__dirname, 'public'),
  ];
  const distPath = candidates.find(fs.existsSync);

  if (!distPath) {
    throw new Error(
      `Could not find a build directory.\nLooked in:\n- ${candidates.join(
        '\n- '
      )}\nDid you run "npm run build" in /client?`
    );
  }

  // Long-cache hashed assets
  app.use(
    '/assets',
    express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true })
  );

  // Other static files
  app.use(express.static(distPath));

  // SPA fallback — but don't catch Telegram webhooks
  app.use('*', (req, res, next) => {
    const u = req.originalUrl;
    if (u === '/telegram/webhook' || u === '/api/telegram-webhook') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}
