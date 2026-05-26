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
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-card">
      <div className="flex items-center justify-between px-10 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green text-xs font-bold text-green-light">
            OK
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            OKE
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8">
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
                onClick={() => router.push('/auth/login')}
              >
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/auth/register')}
              >
                Get started free
              </Button>
            </>
          )}
          {user && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary">
                  {user.displayName || user.email}
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
