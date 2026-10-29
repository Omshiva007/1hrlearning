import { notFound } from 'next/navigation';

const pages: Record<string, { title: string; paragraphs: string[] }> = {
  about: { title: 'About 1hrLearning', paragraphs: ['1hrLearning is a non-commercial knowledge exchange where every participant can teach and learn.', 'Sessions are arranged directly between people and use platform points, never payments between users.'] },
  points: { title: 'How points work', paragraphs: ['Learners spend points when a confirmed session completes. Sharers earn those points for teaching.', 'Points are locked on confirmation, returned on eligible cancellation, and settled only once after completion.'] },
  safety: { title: 'Trust and safety', paragraphs: ['Meeting links are visible only to confirmed participants. Privacy and discovery controls remain under each user’s control.', 'Use the reporting tools for inappropriate profiles, testimonials, or sessions. Administrators review every open report.'] },
  privacy: { title: 'Privacy policy', paragraphs: ['We use account, profile, skill, availability, and session information to operate matching and learning workflows.', 'Profiles respect discovery settings, and meeting details remain restricted to eligible participants.'] },
  terms: { title: 'Terms of service', paragraphs: ['Use 1hrLearning respectfully, provide accurate profile information, and do not misuse sessions or platform points.', 'Accounts may be restricted when safety, integrity, or community rules are violated.'] },
  cookies: { title: 'Cookie policy', paragraphs: ['Essential cookies and session storage keep authentication and security workflows working.', 'The application does not require advertising-tracking cookies to participate in learning sessions.'] },
};

export default async function InformationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return <main className="container mx-auto max-w-3xl px-4 py-16"><h1 className="mb-6 text-4xl font-bold">{page.title}</h1><div className="space-y-4 text-muted-foreground">{page.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></main>;
}
