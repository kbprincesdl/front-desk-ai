import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLINIC_DATA } from './src/data/clinicData.ts';
import { generateFrontDeskReply } from './src/server/assistant.ts';
import {
  addCustomerFeedback,
  addDoctor,
  addStaffReply,
  appendSessionMessage,
  createAppointment,
  createTicket,
  deleteDoctor,
  getAdminAnalytics,
  getSessionMessages,
  listAppointments,
  listCustomerFeedbacks,
  listDoctors,
  listTickets,
  listVisits,
  recordVisit,
  setMessageFeedback,
  updateAppointmentDecision,
  updateDoctor,
  updateTicketStatus,
} from './src/server/store.ts';
import type {
  AppointmentStatus,
  FeedbackValue,
  LanguageCode,
  TicketStatus,
} from './src/types/clinic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_STATUSES: TicketStatus[] = ['answered', 'needs human', 'urgent', 'closed'];
const VALID_APPT_STATUSES: AppointmentStatus[] = [
  'Pending',
  'Confirmed',
  'Rescheduled',
  'Rejected',
  'Visited',
];

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/clinic', (_req: Request, res: Response) => {
    res.json({
      ...CLINIC_DATA,
      doctors: listDoctors(),
    });
  });

  // --- Doctors Directory CRUD ---
  app.get('/api/doctors', (_req: Request, res: Response) => {
    res.json({ doctors: listDoctors() });
  });

  app.post('/api/doctors', (req: Request, res: Response) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    const days = typeof req.body?.days === 'string' ? req.body.days.trim() : '';
    const activeDays = Array.isArray(req.body?.activeDays)
      ? req.body.activeDays.filter((d: unknown) => typeof d === 'string')
      : undefined;

    if (!name || !role || (!days && (!activeDays || activeDays.length === 0))) {
      res.status(400).json({ error: 'Doctor name, speciality/role, and working days are required.' });
      return;
    }

    const doctor = addDoctor({ name, role, days, activeDays });
    res.status(201).json({ doctor });
  });

  app.put('/api/doctors/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '').trim();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    const days = typeof req.body?.days === 'string' ? req.body.days.trim() : '';
    const activeDays = Array.isArray(req.body?.activeDays)
      ? req.body.activeDays.filter((d: unknown) => typeof d === 'string')
      : undefined;

    if (!id || !name || !role || (!days && (!activeDays || activeDays.length === 0))) {
      res.status(400).json({ error: 'Doctor id, name, role, and working days are required.' });
      return;
    }

    const updated = updateDoctor(id, { name, role, days, activeDays });
    if (!updated) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }
    res.json({ doctor: updated });
  });

  app.delete('/api/doctors/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'Doctor id is required.' });
      return;
    }
    const ok = deleteDoctor(id);
    if (!ok) {
      res.status(404).json({ error: 'Doctor not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // --- Chat ---
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
    const language =
      req.body?.language === 'hi' || req.body?.language === 'te' || req.body?.language === 'en'
        ? (req.body.language as LanguageCode)
        : undefined;

    if (!sessionId || !message) {
      res.status(400).json({ error: 'Both sessionId and message are required.' });
      return;
    }

    const patientMessage = appendSessionMessage(sessionId, {
      role: 'patient',
      text: message,
      language,
    });

    const result = await generateFrontDeskReply(message, language);

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
      language: result.language,
      suggestedFollowups: result.suggestedFollowups,
      ticketId: ticket.id,
      ticketStatus: ticket.status,
    });

    res.json({
      patientMessage,
      botMessage,
      ticket,
    });
  });

  app.patch('/api/chat/:sessionId/messages/:messageId/feedback', (req: Request, res: Response) => {
    const sessionId = String(req.params.sessionId || '').trim();
    const messageId = String(req.params.messageId || '').trim();
    const feedback = req.body?.feedback as FeedbackValue;

    if (!sessionId || !messageId || (feedback !== 'up' && feedback !== 'down' && feedback !== null)) {
      res.status(400).json({ error: 'Invalid feedback payload.' });
      return;
    }

    const updated = setMessageFeedback(sessionId, messageId, feedback);
    if (!updated) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    res.json({ message: updated });
  });

  // --- Tickets ---
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

  // --- Appointments ---
  app.get('/api/appointments', (_req: Request, res: Response) => {
    res.json({ appointments: listAppointments() });
  });

  app.post('/api/appointments', (req: Request, res: Response) => {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const doctorName = typeof req.body?.doctorName === 'string' ? req.body.doctorName.trim() : '';
    const dateISO = typeof req.body?.dateISO === 'string' ? req.body.dateISO.trim() : '';
    const dateLabel = typeof req.body?.dateLabel === 'string' ? req.body.dateLabel.trim() : '';
    const timeSlot = typeof req.body?.timeSlot === 'string' ? req.body.timeSlot.trim() : '';
    const patientName = typeof req.body?.patientName === 'string' ? req.body.patientName.trim() : '';
    const patientPhone = typeof req.body?.patientPhone === 'string' ? req.body.patientPhone.trim() : '';

    if (
      !sessionId ||
      !reason ||
      !doctorName ||
      !dateISO ||
      !dateLabel ||
      !timeSlot ||
      !patientName ||
      !patientPhone
    ) {
      res.status(400).json({ error: 'All appointment booking fields are required.' });
      return;
    }

    const appointment = createAppointment({
      sessionId,
      reason,
      doctorName,
      dateISO,
      dateLabel,
      timeSlot,
      patientName,
      patientPhone,
    });

    res.json({ appointment });
  });

  app.patch('/api/appointments/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || '').trim();
    const status = req.body?.status as AppointmentStatus;
    const staffNote = typeof req.body?.staffNote === 'string' ? req.body.staffNote : undefined;

    if (!id || !VALID_APPT_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Invalid appointment id or status.' });
      return;
    }

    const updated = updateAppointmentDecision(id, status, staffNote);
    if (!updated) {
      res.status(404).json({ error: 'Appointment request not found.' });
      return;
    }

    res.json({ appointment: updated });
  });

  // --- Daily Patient Visits & Admin Analytics ---
  app.get('/api/visits', (_req: Request, res: Response) => {
    res.json({ visits: listVisits() });
  });

  app.post('/api/visits', (req: Request, res: Response) => {
    const doctorId = typeof req.body?.doctorId === 'string' ? req.body.doctorId.trim() : undefined;
    const doctorName = typeof req.body?.doctorName === 'string' ? req.body.doctorName.trim() : '';
    const patientName = typeof req.body?.patientName === 'string' ? req.body.patientName.trim() : '';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : undefined;
    const dateISO = typeof req.body?.dateISO === 'string' ? req.body.dateISO.trim() : undefined;

    if (!doctorName || !patientName) {
      res.status(400).json({ error: 'Doctor name and patient name are required.' });
      return;
    }

    const visit = recordVisit({
      doctorId,
      doctorName,
      patientName,
      reason,
      dateISO,
      source: 'walk_in',
    });
    res.status(201).json({ visit });
  });

  // --- Customer Feedback Showcase ---
  app.get('/api/feedback', (_req: Request, res: Response) => {
    const analytics = getAdminAnalytics();
    res.json({
      feedbacks: listCustomerFeedbacks(),
      feedbackStats: analytics.feedbackStats,
    });
  });

  app.post('/api/feedback', (req: Request, res: Response) => {
    const patientName = typeof req.body?.patientName === 'string' ? req.body.patientName.trim() : '';
    const doctorName = typeof req.body?.doctorName === 'string' ? req.body.doctorName.trim() : undefined;
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

    if (!patientName || !comment || Number.isNaN(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Name, rating (1-5), and feedback comment are required.' });
      return;
    }

    const feedback = addCustomerFeedback({ patientName, doctorName, rating, comment });
    res.status(201).json({ feedback });
  });

  app.get('/api/analytics', (_req: Request, res: Response) => {
    res.json(getAdminAnalytics());
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
