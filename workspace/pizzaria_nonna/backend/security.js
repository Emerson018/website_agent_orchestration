import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/**
 * Configure production-grade security guardrails for any provisioned tenant backend.
 *
 * @param {import('express').Express} app - Express application instance
 * @param {Object} options - Custom security configuration overrides
 */
export function setupSecurityGuardrails(app, options = {}) {
  // 1. Helmet: Secure HTTP response headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: ["'self'", 'https:', 'wss:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Strict CORS policy
  const allowedOrigins = options.allowedOrigins || [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permit requests without origin (like mobile apps, curl, server-to-server) or in whitelist
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`Origem não permitida pela política CORS: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
    })
  );

  // 3. Strict Rate Limiting (Prevents Brute-force & Denial-of-Service)
  const apiLimiter = rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutos
    max: options.maxRequests || 300, // máx 300 requisições por janela
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Limite de requisições excedido. Tente novamente mais tarde.',
    },
  });

  app.use('/api/', apiLimiter);

  // 4. Request hygiene & Parameter Pollution prevention
  app.use((req, res, next) => {
    // Remove null bytes from URL strings to prevent path traversal
    if (req.url && req.url.indexOf('\0') !== -1) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Caractere nulo detectado na URL.' });
    }
    next();
  });
}
