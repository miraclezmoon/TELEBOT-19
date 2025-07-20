// server/index.ts
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { initializeBot, getBot } from './bot'; // only these from bot.ts

/* ─────────────────────────  Express init  ───────────────────────── */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ─────────────────────  Telegram webhook  ──────────────────────── */
/*  NOTE: path must match the URL you set in bot.ts (initializeBot)  */
app.post('/api/telegram-webhook', (req, res) => {
  getBot()?.processUpdate(req.body); // silently ignore if bot not ready
  res.sendStatus(200);
});

/* ───────────────────────────  CORS  ────────────────────────────── */
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

/* ───────────────────  Compact API logger  ──────────────────────── */
app.use((req, res, next) => {
  const t0 = Date.now();
  const { path } = req;
  let bodyToLog: unknown;

  const json = res.json.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = (payload: any, ...args: any[]) => {
    bodyToLog = payload;
    return json(payload, ...args);
  };

  res.on('finish', () => {
    if (!path.startsWith('/api')) return;
    const ms = Date.now() - t0;
    let line = `${req.method} ${path} ${res.statusCode} – ${ms} ms`;
    if (bodyToLog) line += ` :: ${JSON.stringify(bodyToLog)}`;
    if (line.length > 90) line = line.slice(0, 89) + '…';
    log(line);
  });

  next();
});

/* ───────────────────────  Bootstrap  ───────────────────────────── */
(async () => {
  const server = await registerRoutes(app);

  /* -------- Telegram bot ---------- */
  if (process.env.BOT_DISABLED !== 'true') {
    initializeBot().catch((e) =>
      console.error('Bot initialisation error:', e.message),
    );
  }

  /* -------- Graceful shutdown ----- */
  const tidy = async () => {
    console.log('🛑  Shutting down…');
    getBot()?.removeAllListeners();
    process.exit(0);
  };
  process.on('SIGINT', tidy);
  process.on('SIGTERM', tidy);

  /* -------- Global error handler -- */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
    throw err; // still surface it for logs
  });

  /* -------- Front‑end (Vite) ------ */
  if (app.get('env') === 'development') {
    await setupVite(app, server); // dev + HMR
  } else {
    serveStatic(app); // serve built assets from /dist
  }

  /* -------- Start server ---------- */
  const port = Number(process.env.PORT) || 5000;
  server.listen({ port, host: '0.0.0.0', reusePort: true }, () =>
    log(`🚀  Server listening on ${port}`),
  );
})();
