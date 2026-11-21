import 'dotenv/config';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { CLINIC_DATA } from '../data/clinicData.ts';
import { generateFrontDeskReply, synthesizeIndianSpeech } from './assistant.ts';
import {
  authenticateUser,
  createOrUpdateUserAccount,
  getAuthStatus,
  listPublicUsers,
  removeUserAccount,
  requireAuth,
  setupInitialCredentials,
  signAuthToken,
  type AuthenticatedRequest,
} from './auth.ts';
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
} from './store.ts';
import type {
  AppointmentStatus,
  FeedbackValue,
  LanguageCode,
  TicketStatus,
  UserRole,
} from '../types/clinic.ts';

const VALID_STATUSES: TicketStatus[] = ['answered', 'needs human', 'urgent', 'closed'];
const VALID_APPT_STATUSES: AppointmentStatus[] = [
  'Pending',
  'Confirmed',
  'Rescheduled',
  'Rejected',
  'Visited',
];

export function createApiApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // --- Portal Authentication & Role Management ---
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    res.json(getAuthStatus());
  });

  app.post('/api/auth/setup', (req: Request, res: Response) => {
    const adminUsername =
      typeof req.body?.adminUsername === 'string' ? req.body.adminUsername : 'admin';
    const adminDisplayName =
      typeof req.body?.adminDisplayName === 'string' ? req.body.adminDisplayName : 'Clinic Admin';
    const adminPassword =
      typeof req.body?.adminPassword === 'string' ? req.body.adminPassword : '';
    const staffUsername =
      typeof req.body?.staffUsername === 'string' ? req.body.staffUsername : 'staff';
    const staffDisplayName =
      typeof req.body?.staffDisplayName === 'string' ? req.body.staffDisplayName : 'Front Desk Staff';
    const staffPassword =
      typeof req.body?.staffPassword === 'string' ? req.body.staffPassword : '';

    const result = setupInitialCredentials({
      adminUsername,
      adminDisplayName,
      adminPassword,
      staffUsername,
      staffDisplayName,
      staffPassword,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const token = signAuthToken(result.user);
    res.status(201).json({ token, user: result.user });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const expectedRole =
      req.body?.expectedRole === 'admin' || req.body?.expectedRole === 'staff'
        ? (req.body.expectedRole as UserRole)
        : undefined;

    const result = authenticateUser({ username, password, expectedRole });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    const token = signAuthToken(result.user);
    res.json({ token, user: result.user });
  });

  app.get('/api/auth/me', requireAuth(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.authUser });
  });

  app.get('/api/auth/users', requireAuth(['admin']), (_req: Request, res: Response) => {
    res.json({ users: listPublicUsers() });
  });

  app.post('/api/auth/users', requireAuth(['admin']), (req: Request, res: Response) => {
    const username = typeof req.body?.username === 'string' ? req.body.username : '';
    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'staff';

    const result = createOrUpdateUserAccount({ username, displayName, role, password });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(201).json({ user: result.user });
  });

  app.delete('/api/auth/users/:id', requireAuth(['admin']), (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'User id is required.' });
      return;
    }
    const result = removeUserAccount(id, req.authUser?.id ?? '');
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  // --- Public Clinic Info & Directory Read ---
  app.get('/api/clinic', (_req: Request, res: Response) => {
    res.json({
      ...CLINIC_DATA,
      doctors: listDoctors(),
    });
  });

  app.get('/api/doctors', (_req: Request, res: Response) => {
    res.json({ doctors: listDoctors() });
  });

  // --- Admin-only Doctors Directory CRUD ---
  app.post('/api/doctors', requireAuth(['admin']), (req: Request, res: Response) => {
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

  app.put('/api/doctors/:id', requireAuth(['admin']), (req: Request, res: Response) => {
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

  app.delete('/api/doctors/:id', requireAuth(['admin']), (req: Request, res: Response) => {
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

  // --- Patient Chat & Indian Voice TTS ---
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

  app.post('/api/tts', async (req: Request, res: Response) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const language: LanguageCode =
      req.body?.language === 'hi' || req.body?.language === 'te' || req.body?.language === 'en'
        ? (req.body.language as LanguageCode)
        : 'en';

    if (!text) {
      res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }

    const result = await synthesizeIndianSpeech(text, language);
    if (!result) {
      res.status(503).json({
        error: 'Server AI voice unavailable; using browser voice.',
        fallbackToBrowser: true,
      });
      return;
    }

    res.json(result);
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

  // --- Staff & Admin Tickets ---
  app.get('/api/tickets', requireAuth(['staff', 'admin']), (_req: Request, res: Response) => {
    res.json({ tickets: listTickets() });
  });

  app.post('/api/tickets/:id/reply', requireAuth(['staff', 'admin']), (req: Request, res: Response) => {
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

  app.patch('/api/tickets/:id/status', requireAuth(['staff', 'admin']), (req: Request, res: Response) => {
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

  // --- Appointments (Patient Create is Public; Staff/Admin Manage) ---
  app.get('/api/appointments', requireAuth(['staff', 'admin']), (_req: Request, res: Response) => {
    res.json({ appointments: listAppointments() });
  });

  app.post('/api/appointments', (req: Request, res: Response) => {
    const rawSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    const sessionId = rawSessionId || 'web-guest';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const doctorName = typeof req.body?.doctorName === 'string' ? req.body.doctorName.trim() : '';
    const dateISO = typeof req.body?.dateISO === 'string' ? req.body.dateISO.trim() : '';
    const dateLabel = typeof req.body?.dateLabel === 'string' ? req.body.dateLabel.trim() : '';
    const timeSlot = typeof req.body?.timeSlot === 'string' ? req.body.timeSlot.trim() : '';
    const patientName = typeof req.body?.patientName === 'string' ? req.body.patientName.trim() : '';
    const patientPhone = typeof req.body?.patientPhone === 'string' ? req.body.patientPhone.trim() : '';

    if (
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

    res.status(201).json({ appointment });
  });

  app.patch('/api/appointments/:id', requireAuth(['staff', 'admin']), (req: Request, res: Response) => {
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
  app.get('/api/visits', requireAuth(['staff', 'admin']), (_req: Request, res: Response) => {
    res.json({ visits: listVisits() });
  });

  app.post('/api/visits', requireAuth(['staff', 'admin']), (req: Request, res: Response) => {
    const doctorId = typeof req.body?.doctorId === 'string' ? req.body.doctorId.trim() : undefined;
    let doctorName = typeof req.body?.doctorName === 'string' ? req.body.doctorName.trim() : '';
    if (!doctorName && doctorId) {
      doctorName = listDoctors().find((d) => d.id === doctorId)?.name ?? '';
    }
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

  // --- Customer Feedback Showcase (Public) ---
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

  // --- Admin-only Analytics ---
  app.get('/api/analytics', requireAuth(['admin']), (_req: Request, res: Response) => {
    res.json(getAdminAnalytics());
  });

  return app;
}
