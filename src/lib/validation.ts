import { z } from 'zod';

export const safetyReportSchema = z.object({
  siteId: z.string().min(1, 'Choose a site or department.'),
  category: z.string().trim().min(2).max(60),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().trim().min(12, 'Add at least 12 characters so the team can act.').max(2000),
});

export const grievanceSchema = z.object({
  category: z.string().trim().min(2).max(60),
  message: z.string().trim().min(12, 'Add at least 12 characters.').max(2000),
  anonymous: z.boolean(),
});

export const shiftSchema = z.object({
  workerId: z.string().min(1),
  siteId: z.string().min(1),
  title: z.string().trim().min(2).max(80),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), { message: 'End time must be after start time.' })
  .refine((value) => Date.parse(value.endAt) - Date.parse(value.startAt) <= 24 * 60 * 60 * 1000, { message: 'A scheduled shift cannot exceed 24 hours.' });
