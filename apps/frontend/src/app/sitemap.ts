import type { MetadataRoute } from 'next';
import { fetchPaginated } from '@/lib/api';
import type { Skill } from '@1hrlearning/shared';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1hrlearning.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/skills`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/discover`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  let skillRoutes: MetadataRoute.Sitemap = [];
  try {
    const skills = await fetchPaginated<Skill>('/skills', { limit: 100 });
    skillRoutes = skills.data.map((skill) => ({
      url: `${BASE_URL}/skills/${skill.id}`,
      lastModified: new Date(skill.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // continue with static routes only
  }

  return [...staticRoutes, ...skillRoutes];
}
