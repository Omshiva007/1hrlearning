export interface PersonSchema {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  url: string;
  image?: string;
  description?: string;
  knowsAbout?: string[];
  numberOfFollowers?: number;
}

export interface CourseSchema {
  '@context': 'https://schema.org';
  '@type': 'Course';
  name: string;
  description?: string;
  url: string;
  provider: {
    '@type': 'Organization';
    name: string;
    url: string;
  };
  audience?: {
    '@type': 'Audience';
    audienceType: string;
  };
}

export interface WebSiteSchema {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1hrlearning.com';

/**
 * Safely serializes structured data for injection into a <script type="application/ld+json"> tag.
 * JSON.stringify alone does not escape "</script>" sequences, which could allow a malicious
 * value (e.g. in a user's displayName or bio) to break out of the script block and inject HTML.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function buildPersonSchema(user: {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  teachingSkills?: Array<{ skill: { name: string } }>;
}): PersonSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.displayName,
    url: `${SITE_URL}/profile/${user.username}`,
    ...(user.avatarUrl ? { image: user.avatarUrl } : {}),
    ...(user.bio ? { description: user.bio } : {}),
    knowsAbout: user.teachingSkills?.map((s) => s.skill.name) ?? [],
  };
}

export function buildCourseSchema(skill: {
  name: string;
  description: string | null;
  slug: string;
}): CourseSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: skill.name,
    url: `${SITE_URL}/skills/${skill.slug}`,
    ...(skill.description ? { description: skill.description } : {}),
    provider: {
      '@type': 'Organization',
      name: '1hrLearning',
      url: SITE_URL,
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Learners',
    },
  };
}

export function buildWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '1hrLearning',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/skills?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
