import type { Request, Response } from 'express';
import { createApiApp } from './app.ts';

const app = createApiApp();

export default function handler(req: Request, res: Response) {
  const rawUrl = req.url || '/';
  if (rawUrl.startsWith('/api/index')) {
    const parsed = new URL(rawUrl, 'http://localhost');
    const subPath = parsed.searchParams.get('__api_path');
    if (subPath !== null) {
      parsed.searchParams.delete('__api_path');
      const qs = parsed.searchParams.toString();
      req.url = `/api/${subPath.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
    }
  }
  return app(req, res);
}
