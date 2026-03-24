import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminProtected } from '@/components/admin/AdminProtected';

export const metadata: Metadata = {
  title: 'Admin | 1hrLearning',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProtected>
      <div className="flex min-h-screen bg-background">
        <AdminNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </AdminProtected>
  );
}
