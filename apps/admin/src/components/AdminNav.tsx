'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/skills', label: 'Skills', icon: '🛠️' },
  { href: '/categories', label: 'Categories', icon: '🏷️' },
  { href: '/users', label: 'Users', icon: '👥' },
];

export function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  return (
    <aside className="w-64 shrink-0 border-r bg-card min-h-screen p-4 flex flex-col">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-lg text-primary"
        >
          <span className="text-2xl">🔐</span>
          <span>Admin Panel</span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">1hrLearning Management</p>
      </div>

      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t space-y-3">
        {user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
