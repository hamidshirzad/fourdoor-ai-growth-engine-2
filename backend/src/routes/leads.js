import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';
import {
  bookLead,
  bulkDeleteLeads,
  bulkUpdateLeadStatus,
  createLead,
  createOutreachDraft,
  getUserLeads,
  handleInboundMessage,
  importLeadsFromCsv,
  markOutreachSent,
  qualifyExistingLead
} from '../services/leadService.js';
import {
  getUserOutreachTemplates,
  createOutreachTemplate,
  updateOutreachTemplate,
  deleteOutreachTemplate,
  applyTemplateToLead
} from '../services/templateService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const leadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  message: z.string().optional(),
  businessType: z.string().optional(),
  budget: z.string().optional(),
  needs: z.string().optional()
}).refine((value) => value.email || value.message, { message: 'email or message required' });

router.post('/create', authenticateToken, validate(leadSchema), asyncHandler(async (req, res) => {
  const lead = await createLead(req.userId, req.body);
  res.status(201).json({ success: true, lead });
}));

router.get('/list', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await getUserLeads(req.userId, req.query.limit || 100));
}));

router.post('/qualify', authenticateToken, validate(z.object({
  leadId: z.string().uuid(),
  answers: z.record(z.string()).default({})
})), asyncHandler(async (req, res) => {
  const lead = await qualifyExistingLead(req.userId, req.body.leadId, req.body.answers);
  res.json({ success: true, lead });
}));

router.post('/engage', authenticateToken, validate(z.object({
  leadId: z.string().uuid().optional(),
  platform: z.string().optional(),
  sender: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  message: z.string().min(1),
  context: z.string().optional()
})), asyncHandler(async (req, res) => {
  res.json(await handleInboundMessage(req.userId, req.body));
}));

router.post('/bulk-upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const { created, failed } = await importLeadsFromCsv(req.userId, req.file.buffer);
  res.status(201).json({ success: true, count: created.length, leads: created, failed });
}));

router.post('/outreach/draft', authenticateToken, validate(z.object({
  leadId: z.string().uuid(),
  context: z.string().optional()
})), asyncHandler(async (req, res) => {
  const draft = await createOutreachDraft(req.userId, req.body.leadId, req.body.context || '');
  res.status(201).json({ success: true, draft });
}));

router.post('/outreach/:id/sent', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, outreach: await markOutreachSent(req.userId, req.params.id) });
}));

router.post('/book', authenticateToken, validate(z.object({
  leadId: z.string().uuid(),
  calendlyEventUri: z.string().optional()
})), asyncHandler(async (req, res) => {
  const booking = await bookLead(req.userId, req.body.leadId, req.body.calendlyEventUri || null);
  res.status(201).json({ success: true, booking });
}));

router.post('/batch-update-status', authenticateToken, validate(z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  status: z.enum(['new', 'contacted', 'qualified', 'converted'])
})), asyncHandler(async (req, res) => {
  const result = await bulkUpdateLeadStatus(req.userId, req.body.leadIds, req.body.status);
  res.json({ success: true, updatedCount: result.updatedCount });
}));

router.post('/batch-delete', authenticateToken, validate(z.object({
  leadIds: z.array(z.string().uuid()).min(1)
})), asyncHandler(async (req, res) => {
  const result = await bulkDeleteLeads(req.userId, req.body.leadIds);
  res.json({ success: true, deletedCount: result.deletedCount });
}));

// Email Outreach Templates Routes
router.get('/templates', authenticateToken, asyncHandler(async (req, res) => {
  const templates = await getUserOutreachTemplates(req.userId);
  res.json({ success: true, templates });
}));

router.post('/templates', authenticateToken, validate(z.object({
  name: z.string().min(1).max(255),
  category: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1)
})), asyncHandler(async (req, res) => {
  const template = await createOutreachTemplate(req.userId, req.body);
  res.status(201).json({ success: true, template });
}));

router.put('/templates/:id', authenticateToken, validate(z.object({
  name: z.string().min(1).max(255),
  category: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1)
})), asyncHandler(async (req, res) => {
  const template = await updateOutreachTemplate(req.userId, req.params.id, req.body);
  res.json({ success: true, template });
}));

router.delete('/templates/:id', authenticateToken, asyncHandler(async (req, res) => {
  const result = await deleteOutreachTemplate(req.userId, req.params.id);
  res.json(result);
}));

router.post('/templates/apply', authenticateToken, validate(z.object({
  templateId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  extraVars: z.record(z.string()).optional()
})), asyncHandler(async (req, res) => {
  const applied = await applyTemplateToLead(req.userId, req.body.templateId, req.body.leadId || null, req.body.extraVars || {});
  res.json({ success: true, outreach: applied });
}));

export default router;
