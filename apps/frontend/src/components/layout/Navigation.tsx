'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  };

  return (
    // An opaque sticky surface prevents the section being scrolled from visually merging with navigation controls.
    <nav className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green text-xs font-bold text-green-light">
            OK
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            OKE
          </span>
        </Link>

        {/* Marketing anchors are supplementary on phones; hiding them keeps account actions reachable. */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            How it works
          </a>
          <a
            href="#topics"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Topics
          </a>
          {user && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Dashboard
              </Link>
              <Link
                href="/discover"
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Discover
              </Link>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isLoading && !user && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/login')}
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/auth/register')}
              >
                <span className="sm:hidden">Get started</span>
                <span className="hidden sm:inline">Get started free</span>
              </Button>
            </>
          )}
          {user && (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm text-text-primary">
                  {user.name || user.email}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
