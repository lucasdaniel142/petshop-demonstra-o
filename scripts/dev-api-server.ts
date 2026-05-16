/**
 * Servidor Express mínimo para emular `/api/*` no desenvolvimento local.
 * O Vite faz proxy de `http://localhost:3000/api/*` para esta porta (DEV_API_PORT).
 *
 * Variáveis: mesmas de produção (ex.: FIREBASE_SERVICE_ACCOUNT_KEY no .env.local).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const PORT = Number(process.env.DEV_API_PORT || 8787);

function runHandler(
  handler: (req: VercelRequest, res: VercelResponse) => any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  Promise.resolve(handler(req as unknown as VercelRequest, res as unknown as VercelResponse)).catch(
    next
  );
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Middleware de Log
  app.use((req, _res, next) => {
    console.log(`[dev-api] ${req.method} ${req.url}`);
    next();
  });

  // Handler Dinâmico para Checkout
  app.post('/api/checkout', async (req, res, next) => {
    try {
      const { default: handler } = await import('../api/checkout.ts');
      await runHandler(handler, req, res, next);
    } catch (err) {
      next(err);
    }
  });

  // Handler Dinâmico para Notificações
  app.all('/api/notify', async (req, res, next) => {
    try {
      const { default: handler } = await import('../api/notify.ts');
      await runHandler(handler, req, res, next);
    } catch (err) {
      next(err);
    }
  });

  // Middleware de Erro Global (HTML -> JSON fallback)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[dev-api] Erro não tratado:', err);
    res.status(500).json({ 
      error: `ERRO NO SERVIDOR: ${err.message || 'Erro desconhecido'}`,
      details: err.message,
      stack: err.stack
    });
  });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[dev-api] Escutando em http://127.0.0.1:${PORT} (checkout + notify)`);
  });
}

main().catch((err) => {
  console.error('[dev-api] Falha ao subir servidor:', err);
  process.exit(1);
});
