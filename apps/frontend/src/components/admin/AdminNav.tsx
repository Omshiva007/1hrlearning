'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/skills', label: 'Skills', icon: '🛠️' },
  { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r bg-card min-h-screen p-4">
      <div className="mb-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
          <span className="text-2xl">🔐</span>
          <span>Admin Panel</span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Master Data Management</p>
      </div>

      <nav className="space-y-1">
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

      <div className="mt-8 pt-8 border-t">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <span>↩️</span>
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
