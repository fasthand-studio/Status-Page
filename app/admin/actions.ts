'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminContext, type AdminContext } from '@/lib/auth';
import { failed, type ActionState } from '@/lib/action-state';
import { runMonitorCheck } from '@/lib/monitoring';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServiceClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Monitor } from '@/lib/types';
import {
  firstIssue,
  formText,
  incidentCreateSchema,
  incidentEditSchema,
  incidentUpdateSchema,
  isUuid,
  maintenanceSchema,
  monitorSchema,
  parseUtcInput,
  serviceSchema,
  slugify,
  uuidList,
} from '@/lib/validation';

type AdminSession = Extract<AdminContext, { status: 'admin' }>;

async function requireActionAdmin(): Promise<{ ok: true; session: AdminSession } | { ok: false; state: ActionState }> {
  const context = await getAdminContext();
  if (context.status === 'admin') return { ok: true, session: context };
  if (context.status === 'unconfigured') {
    return { ok: false, state: failed('Supabase is not configured yet. Add the environment variables first.') };
  }
  return { ok: false, state: failed('Your admin session expired. Sign in again at /admin/login.') };
}

function dbMessage(
  error: { code?: string; message: string },
  fallback: string,
): string {
  if (error.code === '23505') {
    return 'That value is already in use. Slugs and monitor URLs must be unique.';
  }
  if (error.code === '23503') {
    return 'A linked record no longer exists. Refresh the page and try again.';
  }
  if (error.code === '42501') {
    return 'The database refused this write. Confirm your account is still on the admin allowlist.';
  }
  return `${fallback} (${error.message})`;
}

function revalidateStatusPages() {
  for (const path of ['/', '/services', '/incidents', '/history', '/maintenance']) {
    revalidatePath(path);
  }
  revalidatePath('/incidents/[id]', 'page');
  revalidatePath('/admin');
}

function revalidateIncident(incidentId: string) {
  revalidateStatusPages();
  revalidatePath('/admin/incidents');
  revalidatePath(`/admin/incidents/${incidentId}`);
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function createIncidentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const parsed = incidentCreateSchema.safeParse({
    title: formText(formData, 'title'),
    status: formText(formData, 'status'),
    impact: formText(formData, 'impact'),
    started_at: formText(formData, 'started_at'),
    body: formText(formData, 'body'),
  });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const startedAt = parseUtcInput(parsed.data.started_at);
  if (!startedAt) return failed('Enter a valid start time.');

  const resolvedAt = parsed.data.status === 'resolved' ? new Date().toISOString() : null;

  const { data, error } = await auth.session.supabase
    .from('incidents')
    .insert({
      title: parsed.data.title,
      status: parsed.data.status,
      impact: parsed.data.impact,
      started_at: startedAt.toISOString(),
      resolved_at: resolvedAt,
      auto_detected: false,
      created_by: auth.session.userId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return failed(dbMessage(error ?? { message: 'no row returned' }, 'Could not create the incident.'));
  }

  const incidentId = data.id as string;

  const { error: updateError } = await auth.session.supabase.from('incident_updates').insert({
    incident_id: incidentId,
    status: parsed.data.status,
    body: parsed.data.body,
    author: 'FastHand Team',
    created_by: auth.session.userId,
  });

  if (updateError) {
    await auth.session.supabase.from('incidents').delete().eq('id', incidentId);
    return failed(dbMessage(updateError, 'Could not save the first update, so the incident was removed.'));
  }

  const serviceIds = uuidList(formData);
  if (serviceIds.length > 0) {
    const { error: linkError } = await auth.session.supabase.from('incident_services').insert(
      serviceIds.map((serviceId) => ({ incident_id: incidentId, service_id: serviceId })),
    );
    if (linkError) {
      await auth.session.supabase.from('incidents').delete().eq('id', incidentId);
      return failed(dbMessage(linkError, 'Could not link services, so the incident was removed.'));
    }
  }

  revalidateIncident(incidentId);
  redirect(`/admin/incidents/${incidentId}?created=1`);
}

export async function updateIncidentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const incidentId = formText(formData, 'incident_id');
  if (!isUuid(incidentId)) return failed('That incident link is not valid.');

  const parsed = incidentEditSchema.safeParse({
    title: formText(formData, 'title'),
    impact: formText(formData, 'impact'),
    started_at: formText(formData, 'started_at'),
  });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const startedAt = parseUtcInput(parsed.data.started_at);
  if (!startedAt) return failed('Enter a valid start time.');

  const { error } = await auth.session.supabase
    .from('incidents')
    .update({
      title: parsed.data.title,
      impact: parsed.data.impact,
      started_at: startedAt.toISOString(),
    })
    .eq('id', incidentId);

  if (error) return failed(dbMessage(error, 'Could not save the incident details.'));

  const serviceIds = uuidList(formData);

  const { error: clearError } = await auth.session.supabase
    .from('incident_services')
    .delete()
    .eq('incident_id', incidentId);
  if (clearError) return failed(dbMessage(clearError, 'Details saved, but affected services could not be updated.'));

  if (serviceIds.length > 0) {
    const { error: linkError } = await auth.session.supabase.from('incident_services').insert(
      serviceIds.map((serviceId) => ({ incident_id: incidentId, service_id: serviceId })),
    );
    if (linkError) return failed(dbMessage(linkError, 'Details saved, but affected services could not be linked.'));
  }

  revalidateIncident(incidentId);
  redirect(`/admin/incidents/${incidentId}?saved=1`);
}

export async function postIncidentUpdateAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const incidentId = formText(formData, 'incident_id');
  if (!isUuid(incidentId)) return failed('That incident link is not valid.');

  const parsed = incidentUpdateSchema.safeParse({
    status: formText(formData, 'status'),
    body: formText(formData, 'body'),
  });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const { data: current, error: readError } = await auth.session.supabase
    .from('incidents')
    .select('id, status, resolved_at')
    .eq('id', incidentId)
    .maybeSingle();

  if (readError) return failed(dbMessage(readError, 'Could not read the incident.'));
  if (!current) return failed('That incident no longer exists.');

  const resolvedAt =
    parsed.data.status === 'resolved'
      ? (current.resolved_at as string | null) ?? new Date().toISOString()
      : null;

  const { error } = await auth.session.supabase
    .from('incidents')
    .update({ status: parsed.data.status, resolved_at: resolvedAt })
    .eq('id', incidentId);

  if (error) return failed(dbMessage(error, 'Could not change the incident status.'));

  const { error: updateError } = await auth.session.supabase.from('incident_updates').insert({
    incident_id: incidentId,
    status: parsed.data.status,
    body: parsed.data.body,
    author: 'FastHand Team',
    created_by: auth.session.userId,
  });

  if (updateError) {
    await auth.session.supabase
      .from('incidents')
      .update({ status: current.status, resolved_at: current.resolved_at })
      .eq('id', incidentId);
    return failed(dbMessage(updateError, 'Could not save the update, so the status change was rolled back.'));
  }

  revalidateIncident(incidentId);
  redirect(`/admin/incidents/${incidentId}?posted=1`);
}

export async function deleteIncidentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const incidentId = formText(formData, 'incident_id');
  if (!isUuid(incidentId)) return failed('That incident link is not valid.');

  const { data, error } = await auth.session.supabase
    .from('incidents')
    .delete()
    .eq('id', incidentId)
    .select('id');

  if (error) return failed(dbMessage(error, 'Could not delete the incident.'));
  if (!data || data.length === 0) return failed('That incident no longer exists.');

  revalidateIncident(incidentId);
  redirect('/admin/incidents?deleted=1');
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formText(formData, 'name'),
    slug: formText(formData, 'slug'),
    group_id: formText(formData, 'group_id'),
    monitor_id: formText(formData, 'monitor_id'),
    description: formText(formData, 'description'),
    sort_order: formText(formData, 'sort_order') || '0',
  });
}

export async function createServiceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const slug = parsed.data.slug ? parsed.data.slug : slugify(parsed.data.name);
  if (!slug) return failed('Could not build a slug from that name. Enter one manually.');

  const { data, error } = await auth.session.supabase
    .from('services')
    .insert({
      name: parsed.data.name,
      slug,
      group_id: parsed.data.group_id,
      monitor_id: parsed.data.monitor_id || null,
      description: parsed.data.description || null,
      is_public: formData.get('is_public') === 'on',
      sort_order: parsed.data.sort_order,
    })
    .select('id')
    .single();

  if (error || !data) return failed(dbMessage(error ?? { message: 'no row returned' }, 'Could not create the service.'));

  revalidateStatusPages();
  revalidatePath('/admin/services');
  redirect(`/admin/services/${data.id}?created=1`);
}

export async function updateServiceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const serviceId = formText(formData, 'service_id');
  if (!isUuid(serviceId)) return failed('That service link is not valid.');

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const slug = parsed.data.slug ? parsed.data.slug : slugify(parsed.data.name);
  if (!slug) return failed('Could not build a slug from that name. Enter one manually.');

  const { error } = await auth.session.supabase
    .from('services')
    .update({
      name: parsed.data.name,
      slug,
      group_id: parsed.data.group_id,
      monitor_id: parsed.data.monitor_id || null,
      description: parsed.data.description || null,
      is_public: formData.get('is_public') === 'on',
      sort_order: parsed.data.sort_order,
    })
    .eq('id', serviceId);

  if (error) return failed(dbMessage(error, 'Could not save the service.'));

  revalidateStatusPages();
  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${serviceId}`);
  redirect(`/admin/services/${serviceId}?saved=1`);
}

export async function deleteServiceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const serviceId = formText(formData, 'service_id');
  if (!isUuid(serviceId)) return failed('That service link is not valid.');

  const { data, error } = await auth.session.supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .select('id');

  if (error) return failed(dbMessage(error, 'Could not delete the service.'));
  if (!data || data.length === 0) return failed('That service no longer exists.');

  revalidateStatusPages();
  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${serviceId}`);
  redirect('/admin/services?deleted=1');
}

// ---------------------------------------------------------------------------
// Monitors
// ---------------------------------------------------------------------------

function parseMonitorForm(formData: FormData) {
  return monitorSchema.safeParse({
    name: formText(formData, 'name'),
    url: formText(formData, 'url'),
    method: formText(formData, 'method'),
    expected_status_min: formText(formData, 'expected_status_min'),
    expected_status_max: formText(formData, 'expected_status_max'),
    expected_text: formText(formData, 'expected_text'),
    timeout_ms: formText(formData, 'timeout_ms'),
    check_interval_seconds: formText(formData, 'check_interval_seconds'),
    failure_threshold: formText(formData, 'failure_threshold'),
    recovery_threshold: formText(formData, 'recovery_threshold'),
    incident_impact: formText(formData, 'incident_impact'),
  });
}

function monitorRecord(parsed: NonNullable<ReturnType<typeof parseMonitorForm>['data']>, formData: FormData) {
  return {
    name: parsed.name,
    url: parsed.url,
    method: parsed.method,
    expected_status_min: parsed.expected_status_min,
    expected_status_max: parsed.expected_status_max,
    expected_text: parsed.expected_text || null,
    timeout_ms: parsed.timeout_ms,
    check_interval_seconds: parsed.check_interval_seconds,
    failure_threshold: parsed.failure_threshold,
    recovery_threshold: parsed.recovery_threshold,
    incident_impact: parsed.incident_impact,
    enabled: formData.get('enabled') === 'on',
  };
}

export async function createMonitorAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const parsed = parseMonitorForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const { data, error } = await auth.session.supabase
    .from('monitors')
    .insert(monitorRecord(parsed.data, formData))
    .select('id')
    .single();

  if (error || !data) return failed(dbMessage(error ?? { message: 'no row returned' }, 'Could not create the monitor.'));

  revalidateStatusPages();
  revalidatePath('/admin/monitors');
  redirect(`/admin/monitors/${data.id}?created=1`);
}

export async function updateMonitorAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const monitorId = formText(formData, 'monitor_id');
  if (!isUuid(monitorId)) return failed('That monitor link is not valid.');

  const parsed = parseMonitorForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const { error } = await auth.session.supabase
    .from('monitors')
    .update(monitorRecord(parsed.data, formData))
    .eq('id', monitorId);

  if (error) return failed(dbMessage(error, 'Could not save the monitor.'));

  revalidateStatusPages();
  revalidatePath('/admin/monitors');
  revalidatePath(`/admin/monitors/${monitorId}`);
  redirect(`/admin/monitors/${monitorId}?saved=1`);
}

export async function toggleMonitorAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const monitorId = formText(formData, 'monitor_id');
  if (!isUuid(monitorId)) return failed('That monitor link is not valid.');

  const { data: monitor, error: readError } = await auth.session.supabase
    .from('monitors')
    .select('id, name, enabled')
    .eq('id', monitorId)
    .maybeSingle();

  if (readError) return failed(dbMessage(readError, 'Could not read the monitor.'));
  if (!monitor) return failed('That monitor no longer exists.');

  const nextEnabled = !monitor.enabled;
  const { error } = await auth.session.supabase
    .from('monitors')
    .update({ enabled: nextEnabled })
    .eq('id', monitorId);

  if (error) return failed(dbMessage(error, 'Could not change the monitor state.'));

  revalidateStatusPages();
  revalidatePath('/admin/monitors');
  revalidatePath(`/admin/monitors/${monitorId}`);

  return {
    error: null,
    success: nextEnabled ? `${monitor.name} resumed.` : `${monitor.name} paused. Services keep their last evidence until checks resume.`,
  };
}

export async function runMonitorNowAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const monitorId = formText(formData, 'monitor_id');
  if (!isUuid(monitorId)) return failed('That monitor link is not valid.');

  let outcomeOk: boolean | null = null;
  let failure: string | null = null;

  try {
    const client = createServiceClient();
    const { data, error } = await client.from('monitors').select('*').eq('id', monitorId).maybeSingle();
    if (error) {
      failure = dbMessage(error, 'Could not read the monitor.');
    } else if (!data) {
      failure = 'That monitor no longer exists.';
    } else {
      const result = await runMonitorCheck(client, data as Monitor);
      outcomeOk = result.outcome.ok;
    }
  } catch (caught) {
    failure = caught instanceof Error ? caught.message : 'The check could not run.';
  }

  if (failure) return failed(failure);

  revalidateStatusPages();
  revalidatePath('/admin/monitors');
  revalidatePath(`/admin/monitors/${monitorId}`);
  redirect(`/admin/monitors/${monitorId}?ran=${outcomeOk ? 'ok' : 'fail'}`);
}

export async function deleteMonitorAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const monitorId = formText(formData, 'monitor_id');
  if (!isUuid(monitorId)) return failed('That monitor link is not valid.');

  const { data, error } = await auth.session.supabase
    .from('monitors')
    .delete()
    .eq('id', monitorId)
    .select('id');

  if (error) return failed(dbMessage(error, 'Could not delete the monitor.'));
  if (!data || data.length === 0) return failed('That monitor no longer exists.');

  revalidateStatusPages();
  revalidatePath('/admin/monitors');
  revalidatePath(`/admin/monitors/${monitorId}`);
  redirect('/admin/monitors?deleted=1');
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

function parseMaintenanceForm(formData: FormData) {
  return maintenanceSchema.safeParse({
    title: formText(formData, 'title'),
    body: formText(formData, 'body'),
    status: formText(formData, 'status'),
    scheduled_start: formText(formData, 'scheduled_start'),
    scheduled_end: formText(formData, 'scheduled_end'),
  });
}

export async function createMaintenanceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const parsed = parseMaintenanceForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const start = parseUtcInput(parsed.data.scheduled_start);
  const end = parseUtcInput(parsed.data.scheduled_end);
  if (!start || !end) return failed('Enter a valid start and end time.');

  const { data, error } = await auth.session.supabase
    .from('maintenance_windows')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      status: parsed.data.status,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      created_by: auth.session.userId,
    })
    .select('id')
    .single();

  if (error || !data) return failed(dbMessage(error ?? { message: 'no row returned' }, 'Could not create the maintenance window.'));

  const maintenanceId = data.id as string;
  const serviceIds = uuidList(formData);
  if (serviceIds.length > 0) {
    const { error: linkError } = await auth.session.supabase.from('maintenance_services').insert(
      serviceIds.map((serviceId) => ({ maintenance_id: maintenanceId, service_id: serviceId })),
    );
    if (linkError) {
      await auth.session.supabase.from('maintenance_windows').delete().eq('id', maintenanceId);
      return failed(dbMessage(linkError, 'Could not link services, so the window was removed.'));
    }
  }

  revalidateStatusPages();
  revalidatePath('/admin/maintenance');
  redirect(`/admin/maintenance/${maintenanceId}?created=1`);
}

export async function updateMaintenanceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const maintenanceId = formText(formData, 'maintenance_id');
  if (!isUuid(maintenanceId)) return failed('That maintenance link is not valid.');

  const parsed = parseMaintenanceForm(formData);
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const start = parseUtcInput(parsed.data.scheduled_start);
  const end = parseUtcInput(parsed.data.scheduled_end);
  if (!start || !end) return failed('Enter a valid start and end time.');

  const { error } = await auth.session.supabase
    .from('maintenance_windows')
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      status: parsed.data.status,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
    })
    .eq('id', maintenanceId);

  if (error) return failed(dbMessage(error, 'Could not save the maintenance window.'));

  const serviceIds = uuidList(formData);

  const { error: clearError } = await auth.session.supabase
    .from('maintenance_services')
    .delete()
    .eq('maintenance_id', maintenanceId);
  if (clearError) return failed(dbMessage(clearError, 'Saved, but affected services could not be updated.'));

  if (serviceIds.length > 0) {
    const { error: linkError } = await auth.session.supabase.from('maintenance_services').insert(
      serviceIds.map((serviceId) => ({ maintenance_id: maintenanceId, service_id: serviceId })),
    );
    if (linkError) return failed(dbMessage(linkError, 'Saved, but affected services could not be linked.'));
  }

  revalidateStatusPages();
  revalidatePath('/admin/maintenance');
  revalidatePath(`/admin/maintenance/${maintenanceId}`);
  redirect(`/admin/maintenance/${maintenanceId}?saved=1`);
}

export async function deleteMaintenanceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireActionAdmin();
  if (!auth.ok) return auth.state;

  const maintenanceId = formText(formData, 'maintenance_id');
  if (!isUuid(maintenanceId)) return failed('That maintenance link is not valid.');

  const { data, error } = await auth.session.supabase
    .from('maintenance_windows')
    .delete()
    .eq('id', maintenanceId)
    .select('id');

  if (error) return failed(dbMessage(error, 'Could not delete the maintenance window.'));
  if (!data || data.length === 0) return failed('That maintenance window no longer exists.');

  revalidateStatusPages();
  revalidatePath('/admin/maintenance');
  revalidatePath(`/admin/maintenance/${maintenanceId}`);
  redirect('/admin/maintenance?deleted=1');
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect('/admin/login');
}
