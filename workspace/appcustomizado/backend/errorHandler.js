/**
 * Centralized error handler preventing confidential data or stack leakages in production.
 */
export function globalErrorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || err.status || 500;

  // Log detalhado interno no servidor
  console.error(`[Backend Error] [${req.method} ${req.url}]:`, {
    name: err.name,
    message: err.message,
    stack: isProd ? undefined : err.stack,
  });

  // Resposta higienizada ao cliente
  res.status(statusCode).json({
    success: false,
    error: err.name || 'INTERNAL_SERVER_ERROR',
    message: isProd && statusCode === 500
      ? 'Ocorreu um erro interno no servidor. Contate o suporte.'
      : err.message || 'Erro interno.',
    ...(isProd ? {} : { stack: err.stack }),
  });
}
