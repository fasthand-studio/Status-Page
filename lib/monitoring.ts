import type { SupabaseClient } from '@supabase/supabase-js';
import { performHttpCheck, type CheckOutcome } from './check';
import { buildAutoIncidentBody, buildAutoRecoveryBody, decideAutomation, type AutomationDecision } from './incidents';
import type { Monitor } from './types';

export interface MonitorRunResult {
  outcome: CheckOutcome;
  automation: AutomationDecision;
  incidentId?: string;
}

export async function runMonitorCheck(
  client: SupabaseClient,
  monitor: Monitor,
  options: { now?: Date } = {},
): Promise<MonitorRunResult> {
  const outcome = await performHttpCheck(
    {
      url: monitor.url,
      method: monitor.method,
      expectedStatusMin: monitor.expected_status_min,
      expectedStatusMax: monitor.expected_status_max,
      expectedText: monitor.expected_text,
      timeoutMs: monitor.timeout_ms,
    },
    { now: options.now },
  );

  const { error: insertError } = await client.from('check_results').insert({
    monitor_id: monitor.id,
    checked_at: outcome.checkedAt,
    ok: outcome.ok,
    status_code: outcome.statusCode,
    response_time_ms: outcome.responseTimeMs,
    error: outcome.error,
    body_excerpt: outcome.bodyExcerpt,
  });

  if (insertError) {
    throw new Error(`Could not store check result: ${insertError.message}`);
  }

  if (!monitor.enabled) {
    return { outcome, automation: { action: 'none' } };
  }

  const result = await evaluateAutomation(client, monitor, outcome);
  return { outcome, ...result };
}

async function evaluateAutomation(
  client: SupabaseClient,
  monitor: Monitor,
  outcome: CheckOutcome,
): Promise<{ automation: AutomationDecision; incidentId?: string }> {
  const limit = Math.max(monitor.failure_threshold, monitor.recovery_threshold) + 4;

  const [checksResult, openResult] = await Promise.all([
    client
      .from('check_results')
      .select('checked_at, ok')
      .eq('monitor_id', monitor.id)
      .order('checked_at', { ascending: false })
      .limit(limit),
    client.from('incidents').select('id, auto_detected').eq('monitor_id', monitor.id).is('resolved_at', null),
  ]);

  if (checksResult.error || openResult.error) {
    throw new Error(
      `Could not evaluate incidents: ${checksResult.error?.message ?? openResult.error?.message}`,
    );
  }

  const openIncidents = (openResult.data ?? []) as { id: string; auto_detected: boolean }[];
  const autoIncident = openIncidents.find((incident) => incident.auto_detected) ?? null;

  const decision = decideAutomation({
    recentChecks: (checksResult.data ?? []) as { checked_at: string; ok: boolean }[],
    openAutoIncidentId: autoIncident?.id ?? null,
    hasOtherOpenIncident: openIncidents.some((incident) => !incident.auto_detected),
    failureThreshold: monitor.failure_threshold,
    recoveryThreshold: monitor.recovery_threshold,
  });

  if (decision.action === 'open') {
    const body = buildAutoIncidentBody({
      monitorName: monitor.name,
      failureCount: decision.consecutiveFailures,
      error: outcome.error,
      statusCode: outcome.statusCode,
      checkedAt: outcome.checkedAt,
    });

    const { data, error } = await client
      .from('incidents')
      .insert({
        title: `${monitor.name} is not responding`,
        status: 'investigating',
        impact: monitor.incident_impact,
        started_at: outcome.checkedAt,
        auto_detected: true,
        monitor_id: monitor.id,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { automation: { action: 'none' } };
      }
      throw new Error(`Could not open incident: ${error.message}`);
    }

    const incidentId = data.id as string;

    const { error: updateError } = await client.from('incident_updates').insert({
      incident_id: incidentId,
      status: 'investigating',
      body,
      author: 'Automated monitoring',
    });
    if (updateError) {
      throw new Error(`Incident created but the opening update failed: ${updateError.message}`);
    }

    const { data: services, error: servicesError } = await client
      .from('services')
      .select('id')
      .eq('monitor_id', monitor.id);
    if (servicesError) {
      throw new Error(`Could not link services to incident: ${servicesError.message}`);
    }
    if (services && services.length > 0) {
      const { error: linkError } = await client.from('incident_services').insert(
        services.map((service) => ({ incident_id: incidentId, service_id: service.id as string })),
      );
      if (linkError) {
        throw new Error(`Could not link services to incident: ${linkError.message}`);
      }
    }

    return { automation: decision, incidentId };
  }

  if (decision.action === 'resolve') {
    const resolvedAt = new Date().toISOString();
    const { error } = await client
      .from('incidents')
      .update({ status: 'resolved', resolved_at: resolvedAt })
      .eq('id', decision.incidentId)
      .is('resolved_at', null);

    if (error) {
      throw new Error(`Could not resolve incident: ${error.message}`);
    }

    const body = buildAutoRecoveryBody({
      monitorName: monitor.name,
      successCount: decision.consecutiveSuccesses,
      checkedAt: outcome.checkedAt,
    });

    const { error: updateError } = await client.from('incident_updates').insert({
      incident_id: decision.incidentId,
      status: 'resolved',
      body,
      author: 'Automated monitoring',
    });
    if (updateError) {
      throw new Error(`Incident resolved but the closing update failed: ${updateError.message}`);
    }

    return { automation: decision, incidentId: decision.incidentId };
  }

  return { automation: decision };
}

export async function pruneOldChecks(client: SupabaseClient, days = 120): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await client
    .from('check_results')
    .delete({ count: 'exact' })
    .lt('checked_at', cutoff);
  if (error) throw new Error(`Could not prune old checks: ${error.message}`);
  return count ?? 0;
}
