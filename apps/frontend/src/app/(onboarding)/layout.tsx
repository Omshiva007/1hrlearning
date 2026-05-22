import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Simple header */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🎓</div>
            <div>
              <h1 className="font-semibold">1hrLearning</h1>
              <p className="text-xs text-muted-foreground">Let&apos;s get you started</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
