import type { Metadata } from 'next';

const SITE_NAME = '1hrLearning';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1hrlearning.com';
const SITE_DESCRIPTION =
  'Connect with experts, share your knowledge, and learn something new in an hour. Free non-commercial skill exchange platform.';

export function buildMetadata(override: Partial<Metadata> = {}): Metadata {
  const title = override.title
    ? `${String(override.title)} | ${SITE_NAME}`
    : SITE_NAME;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: override.description ?? SITE_DESCRIPTION,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: String(title),
      description: (override.description ?? SITE_DESCRIPTION) as string,
      url: SITE_URL,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SITE_NAME }],
      ...((override.openGraph as Record<string, unknown>) ?? {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: String(title),
      description: (override.description ?? SITE_DESCRIPTION) as string,
      images: ['/og-image.png'],
      ...((override.twitter as Record<string, unknown>) ?? {}),
    },
    alternates: {
      canonical: SITE_URL,
      ...(override.alternates ?? {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
      ...(override.robots as Record<string, unknown>),
    },
    ...override,
  };
}

export function buildProfileMetadata(user: {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
}): Metadata {
  return buildMetadata({
    title: `${user.displayName} (@${user.username})`,
    description: user.bio ?? `${user.displayName}'s profile on ${SITE_NAME}`,
    openGraph: {
      type: 'profile',
      images: user.avatarUrl ? [user.avatarUrl] : undefined,
    } as Metadata['openGraph'],
    alternates: {
      canonical: `${SITE_URL}/profile/${user.username}`,
    },
  });
}

export function buildSkillMetadata(skill: {
  name: string;
  description: string | null;
  category: string;
  userCount: number;
}): Metadata {
  return buildMetadata({
    title: `Learn ${skill.name}`,
    description:
      skill.description ??
      `Find teachers and learners for ${skill.name} — ${skill.category} category. ${skill.userCount} users on 1hrLearning.`,
  });
}
