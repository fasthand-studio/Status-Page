import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/supabase/config';
import { getPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl.replace(/\/+$/, '');
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/incidents`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/maintenance`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/history`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
  ];

  const client = getPublicClient();
  if (!client) return pages;

  const { data } = await client
    .from('incidents')
    .select('id, started_at, updated_at')
    .order('started_at', { ascending: false })
    .limit(500);

  const incidents: MetadataRoute.Sitemap = (data ?? []).map((incident) => ({
    url: `${base}/incidents/${incident.id}`,
    lastModified: new Date(incident.updated_at ?? incident.started_at),
    changeFrequency: 'daily',
    priority: 0.5,
  }));

  return [...pages, ...incidents];
}
