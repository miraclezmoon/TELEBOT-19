// server/index.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { initializeBot, getBot } from './bot';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ─────────────── Telegram webhook route (MUST match bot.ts) ─────────────── */
app.post('/api/telegram-webhook', (req, res) => {
  getBot()?.processUpdate(req.body);
  res.sendStatus(200);
});

/* ─────────────── CORS for preview deployments ─────────────── */
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

/* ─────────────── Simple API logger ─────────────── */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let captured: unknown;
  const orig = res.json.bind(res);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = (body: any, ...args: any[]) => {
    captured = body;
    return orig(body, ...args);
  };

  res.on('finish', () => {
    if (!path.startsWith('/api')) return;
    const ms = Date.now() - start;
    let line = `${req.method} ${path} ${res.statusCode} in ${ms}ms`;
    if (captured) line += ` :: ${JSON.stringify(captured)}`;
    if (line.length > 90) line = line.slice(0, 89) + '…';
    log(line);
  });

  next();
});

/* ─────────────── Bootstrap everything ─────────────── */
(async () => {
  const server = await registerRoutes(app);

  /* Start Telegram bot (unless disabled) */
  if (process.env.BOT_DISABLED !== 'true') {
    initializeBot().catch((e) =>
      console.error('Bot init error:', e?.message || e),
    );
  }

  /* graceful shutdown */
  const cleanup = async () => {
    console.log('Cleaning up bot…');
    getBot()?.removeAllListeners();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  /* global Express error handler */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
    throw err;
  });

  /* Front‑end (Vite dev vs static prod) */
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({ port, host: '0.0.0.0', reusePort: true }, () =>
    log(`serving on port ${port}`),
  );
})();
