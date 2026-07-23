import type { MetadataRoute } from 'next';
import { getPublicTournamentSitemapEntries } from '@/lib/cached-queries';

export const revalidate = 3600; // 1h — sitemap freshness doesn't need to be tighter

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const tournaments = await getPublicTournamentSitemapEntries();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${siteUrl}/help/organizer`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const tournamentEntries: MetadataRoute.Sitemap = tournaments.map((t) => ({
    url: `${siteUrl}/tournament/${t.id}`,
    lastModified: new Date(t.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...tournamentEntries];
}
