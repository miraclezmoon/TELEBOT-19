import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { initializeBot, getBot } from './bot';

const app = express();

app.use(express.json());
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
  res.json = (payload: any, ...args: any[]) => {
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
  await registerRoutes(app); // Register normal API routes

  // ✅ Only now, register webhook route
  app.post('/api/telegram-webhook', (req, res) => {
    console.log('🚀 Telegram webhook HIT! Body:', JSON.stringify(req.body));
    getBot()?.processUpdate(req.body);
    res.sendStatus(200);
  });

  // ✅ Now serve frontend last — so it doesn't override any /api routes
  if (app.get('env') === 'development') {
    await setupVite(app);
  } else {
    serveStatic(app); // Serve React AFTER everything else
  }

  if (process.env.BOT_DISABLED !== 'true') {
    initializeBot().catch((e) =>
      console.error('Bot initialization error:', e.message),
    );
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
    throw err;
  });

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    log(`🚀 Server listening on port ${port}`);
  });
})();
