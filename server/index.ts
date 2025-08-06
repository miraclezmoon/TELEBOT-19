import dotenv from 'dotenv';
dotenv.config(); // 👈 Load .env variables immediately

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

/* ───────────────────── Telegram Webhook ───────────────────── */
app.post('/api/telegram-webhook', (req, res) => {
  console.log('🚀 Telegram webhook HIT! Body:', JSON.stringify(req.body));
  getBot()?.processUpdate(req.body);
  res.sendStatus(200);
});

/* ─────────────────────────── CORS ─────────────────────────── */
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

/* ────────────────────── API Logger ────────────────────────── */
app.use((req, res, next) => {
  const t0 = Date.now();
  const { path } = req;
  let bodyToLog: unknown;

  const json = res.json.bind(res);
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

/* ────────────────────── BOOTSTRAP ────────────────────────── */
(async () => {
  await registerRoutes(app);

  /* -------- Bootstrap -------- */
(async () => {
  await registerRoutes(app);

  // ✅ Register Telegram webhook LAST — after routes, before static
  app.post('/api/telegram-webhook', (req, res) => {
    console.log('🚀 Telegram webhook HIT! Body:', JSON.stringify(req.body));
    getBot()?.processUpdate(req.body);
    res.sendStatus(200);
  });

  if (process.env.BOT_DISABLED !== 'true') {
    initializeBot().catch((e) =>
      console.error('Bot initialization error:', e.message),
    );
  }

  if (app.get('env') === 'development') {
    await setupVite(app);
  } else {
    serveStatic(app); // ← must be LAST
  }

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    log(`🚀 Server listening on port ${port}`);
  });
})();

