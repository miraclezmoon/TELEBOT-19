// index.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { initializeBot } from './bot';

const app = express();

// Behind Railway/Render/etc.
app.set('trust proxy', 1);

// Parse bodies (Telegram needs JSON parsed)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

/* ───────────── CORS HEADERS ───────────── */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* ───────────── API LOGGER ───────────── */
app.use((req, res, next) => {
  const t0 = Date.now();
  const { path } = req;
  let bodyToLog: unknown;

  const json = res.json.bind(res);
  (res as any).json = (payload: any, ...args: any[]) => {
    bodyToLog = payload;
    return json(payload, ...args);
  };

  res.on('finish', () => {
    if (!path.startsWith('/api')) return;
    const ms = Date.now() - t0;
    let line = `${req.method} ${path} ${res.statusCode} – ${ms}ms`;
    if (bodyToLog) line += ` :: ${JSON.stringify(bodyToLog)}`;
    if (line.length > 90) line = line.slice(0, 89) + '…';
    log(line);
  });

  next();
});

/* ───────────── Server Bootstrap ───────────── */
(async () => {
  // Registers all routes, including /healthz and /telegram/webhook
  registerRoutes(app);

  // Serve frontend last so it doesn't shadow /api or webhook routes
  if (app.get('env') === 'development') {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
  });

  const port = Number(process.env.PORT) || 5000;
  const host = '0.0.0.0';

  app.listen(port, host, async () => {
    log(`🚀 Server listening on port ${port}`);

    // Initialize the Telegram bot AFTER server is up, so webhook URL is reachable
    if (process.env.BOT_DISABLED !== 'true') {
      try {
        await initializeBot();
      } catch (e: any) {
        console.error('Bot initialization error:', e?.message || e);
      }
    } else {
      log('⚠️ Bot disabled via BOT_DISABLED=true');
    }
  });
})().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
