import { z } from 'zod';
import type { IncidentImpact, IncidentStatus, MaintenanceStatus } from './types';

export const INCIDENT_STATUSES = [
  'investigating',
  'identified',
  'monitoring',
  'resolved',
] as const;

export const INCIDENT_IMPACTS = ['none', 'minor', 'major', 'critical'] as const;

export const MAINTENANCE_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

export const INCIDENT_IMPACT_LABELS: Record<IncidentImpact, string> = {
  none: 'No impact',
  minor: 'Minor impact',
  major: 'Major impact',
  critical: 'Critical impact',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

// Inputs are labelled UTC. A datetime-local value has no zone, so it is
// appended explicitly instead of letting the server's zone decide.
export function parseUtcInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed)
    ? trimmed
    : `${trimmed}${trimmed.length === 16 ? ':00' : ''}Z`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

const utcDateTime = z
  .string()
  .trim()
  .min(1, 'Choose a date and time.')
  .refine((value) => parseUtcInput(value) !== null, 'Enter a valid date and time.');

const title = z
  .string()
  .trim()
  .min(3, 'Use a title of at least 3 characters.')
  .max(140, 'Keep the title under 140 characters.');

const markdownBody = z
  .string()
  .trim()
  .min(1, 'Write the update in Markdown.')
  .max(20000, 'Keep the update under 20,000 characters.');

export const incidentCreateSchema = z.object({
  title,
  status: z.enum(INCIDENT_STATUSES),
  impact: z.enum(INCIDENT_IMPACTS),
  started_at: utcDateTime,
  body: markdownBody,
});

export const incidentEditSchema = z.object({
  title,
  impact: z.enum(INCIDENT_IMPACTS),
  started_at: utcDateTime,
});

export const incidentUpdateSchema = z.object({
  status: z.enum(INCIDENT_STATUSES),
  body: markdownBody,
});

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Give the group a name of at least 2 characters.')
    .max(80, 'Keep the name under 80 characters.'),
  slug: z
    .string()
    .trim()
    .max(60, 'Keep the slug under 60 characters.')
    .refine(
      (value) => value === '' || SLUG_PATTERN.test(value),
      'Use lowercase letters, numbers, and single hyphens.',
    ),
  description: z.string().trim().max(400, 'Keep the description under 400 characters.'),
  sort_order: z.coerce.number().int().min(-9999).max(9999),
});

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Give the service a name of at least 2 characters.')
    .max(80, 'Keep the name under 80 characters.'),
  slug: z
    .string()
    .trim()
    .max(60, 'Keep the slug under 60 characters.')
    .refine(
      (value) => value === '' || SLUG_PATTERN.test(value),
      'Use lowercase letters, numbers, and single hyphens.',
    ),
  group_id: z.string().uuid('Choose a service group.'),
  monitor_id: z.string().uuid().or(z.literal('')),
  description: z.string().trim().max(400, 'Keep the description under 400 characters.'),
  sort_order: z.coerce.number().int().min(-9999).max(9999),
});

export const monitorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Give the monitor a name of at least 2 characters.')
      .max(80, 'Keep the name under 80 characters.'),
    url: z
      .string()
      .trim()
      .min(1, 'Enter the health-check URL.')
      .refine(isHttpUrl, 'Use a full http:// or https:// URL.'),
    method: z.enum(['GET', 'HEAD']),
    expected_status_min: z.coerce
      .number()
      .int()
      .min(100, 'Use an HTTP status between 100 and 599.')
      .max(599, 'Use an HTTP status between 100 and 599.'),
    expected_status_max: z.coerce
      .number()
      .int()
      .min(100, 'Use an HTTP status between 100 and 599.')
      .max(599, 'Use an HTTP status between 100 and 599.'),
    expected_text: z.string().trim().max(500, 'Keep the expected phrase under 500 characters.'),
    timeout_ms: z.coerce.number().int().min(1000).max(60000),
    check_interval_seconds: z.coerce.number().int().min(60).max(86400),
    failure_threshold: z.coerce.number().int().min(1).max(12),
    recovery_threshold: z.coerce.number().int().min(1).max(12),
    incident_impact: z.enum(INCIDENT_IMPACTS),
  })
  .refine((value) => value.expected_status_min <= value.expected_status_max, {
    message: 'The minimum status must not be higher than the maximum.',
    path: ['expected_status_max'],
  });

export const maintenanceSchema = z
  .object({
    title,
    body: z.string().trim().max(20000, 'Keep the notice under 20,000 characters.'),
    status: z.enum(MAINTENANCE_STATUSES),
    scheduled_start: utcDateTime,
    scheduled_end: utcDateTime,
  })
  .refine(
    (value) => {
      const start = parseUtcInput(value.scheduled_start);
      const end = parseUtcInput(value.scheduled_end);
      return !start || !end || end.getTime() > start.getTime();
    },
    { message: 'The end time must be after the start time.', path: ['scheduled_end'] },
  );

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}

export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export function uuidList(formData: FormData, key = 'service_ids'): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string' && z.string().uuid().safeParse(value).success);
}
