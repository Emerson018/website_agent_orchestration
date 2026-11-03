import { ZodError } from 'zod';

/**
 * Express middleware factory to validate incoming request schemas using Zod.
 *
 * @param {Object} schemas - Validation schemas for request parts
 * @param {import('zod').ZodType} [schemas.body] - Schema for req.body
 * @param {import('zod').ZodType} [schemas.query] - Schema for req.query
 * @param {import('zod').ZodType} [schemas.params] - Schema for req.params
 */
export function validateRequest(schemas = {}) {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message,
          codigo: i.code,
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Dados enviados na requisição não atendem às regras de validação.',
          detalhes: issues,
        });
      }
      next(err);
    }
  };
}
