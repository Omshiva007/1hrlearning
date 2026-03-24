'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export function Header() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <span className="text-2xl">🎓</span>
          <span>1hrLearning</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/skills" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Browse Skills
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/sessions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Sessions
              </Link>
              {user?.role === 'ADMIN' && (
                <a
                  href={process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001'}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔐 Admin
                </a>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  🔔
                </Button>
              </Link>
              <Link href={`/profile/${user.username ?? ''}`}>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage src={user.image ?? ''} alt={user.name ?? ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(user.name ?? 'U')}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
