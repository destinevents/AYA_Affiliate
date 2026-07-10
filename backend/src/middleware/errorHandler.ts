import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({ error: message });
}
