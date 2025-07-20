// server/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeBot, getBot } from "./bot";   // ← only these from bot.ts

/* ------------------------------------------------------------------ */
/*  Express app setup                                                 */
/* ------------------------------------------------------------------ */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ------------------------------------------------------------------ */
/*  Telegram webhook endpoint                                         */
/* ------------------------------------------------------------------ */
app.post("/telegram", (req, res) => {
  // Use the accessor so we never rely on an internal variable
  getBot()?.processUpdate(req.body);
  res.sendStatus(200);
});

/* ------------------------------------------------------------------ */
/*  CORS headers (e.g. for Replit preview)                            */
/* ------------------------------------------------------------------ */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ------------------------------------------------------------------ */
/*  Simple API‑response logger                                        */
/* ------------------------------------------------------------------ */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalJson = res.json.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = (body: any, ...args: any[]) => {
    capturedJsonResponse = body;
    return originalJson(body, ...args);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    const duration = Date.now() - start;
    let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse)
      line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    if (line.length > 80) line = line.slice(0, 79) + "…";
    log(line);
  });

  next();
});

/* ------------------------------------------------------------------ */
/*  Bootstrap everything                                              */
/* ------------------------------------------------------------------ */
(async () => {
  const server = await registerRoutes(app);

  // Start Telegram bot (unless disabled)
  if (process.env.BOT_DISABLED !== "true") {
    initializeBot().catch((err) =>
      console.error("Bot initialization error:", err.message)
    );
  }

  /* -------- graceful shutdown ------------------------------------ */
  const cleanup = async () => {
    console.log("Cleaning up bot instance…");
    const currentBot = getBot();
    if (currentBot) {
      try {
        currentBot.removeAllListeners();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  /* -------- global express error handler ------------------------- */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    throw err; // bubble up for logging
  });

  /* -------- serve front‑end -------------------------------------- */
  if (app.get("env") === "development") {
    await setupVite(app, server); // Vite dev middleware / HMR
  } else {
    serveStatic(app);             // static dist/ assets
  }

  /* -------- launch express --------------------------------------- */
  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
