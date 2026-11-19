import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLINIC_DATA } from './src/data/clinicData.ts';
import { generateFrontDeskReply } from './src/server/assistant.ts';
import {
  addStaffReply,
  appendSessionMessage,
  createTicket,
  getSessionMessages,
  listTickets,
  updateTicketStatus,
} from './src/server/store.ts';
import type { TicketStatus } from './src/types/clinic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_STATUSES: TicketStatus[] = ['answered', 'needs human', 'urgent', 'closed'];

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/clinic', (_req: Request, res: Response) => {
    res.json(CLINIC_DATA);
  });

  app.get('/api/chat/:sessionId', (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }
    res.json({ messages: getSessionMessages(sessionId) });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!sessionId || !message) {
      res.status(400).json({ error: 'Both sessionId and message are required.' });
      return;
    }

    const patientMessage = appendSessionMessage(sessionId, {
      role: 'patient',
      text: message,
    });

    const result = await generateFrontDeskReply(message);

    const ticket = createTicket({
      sessionId,
      question: message,
      botReply: result.reply,
      status: result.status,
      fromFallback: result.fromFallback,
    });

    const botMessage = appendSessionMessage(sessionId, {
      role: 'bot',
      text: result.reply,
      fromFallback: result.fromFallback,
      ticketId: ticket.id,
      ticketStatus: ticket.status,
    });

    res.json({
      patientMessage,
      botMessage,
      ticket,
    });
  });

  app.get('/api/tickets', (_req: Request, res: Response) => {
    res.json({ tickets: listTickets() });
  });

  app.post('/api/tickets/:id/reply', (req: Request, res: Response) => {
    const ticketId = String(req.params.id || '').trim();
    const reply = typeof req.body?.reply === 'string' ? req.body.reply.trim() : '';

    if (!ticketId || !reply) {
      res.status(400).json({ error: 'Both ticket id and reply text are required.' });
      return;
    }

    const updated = addStaffReply(ticketId, reply);
    if (!updated) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    res.json({ ticket: updated });
  });

  app.patch('/api/tickets/:id/status', (req: Request, res: Response) => {
    const ticketId = String(req.params.id || '').trim();
    const status = req.body?.status as TicketStatus;

    if (!ticketId || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid ticket id or status.' });
      return;
    }

    const updated = updateTicketStatus(ticketId, status);
    if (!updated) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }

    res.json({ ticket: updated });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(500).send('Application build not found.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`FrontDesk AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
