'use client';

import Link from 'next/link';
import { useAdminCategories, type AdminCategory } from '@/hooks/useAdmin';

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useAdminCategories();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Skill categories are defined system-wide. Manage skills within each category.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load categories: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(categories ?? []).map((cat: AdminCategory) => (
              <div
                key={cat.name}
                className="rounded-lg border bg-card p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cat.skillCount} {cat.skillCount === 1 ? 'skill' : 'skills'}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cat.skillCount > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {cat.skillCount > 0 ? 'Active' : 'Empty'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <Link
                    href={`/skills?category=${encodeURIComponent(cat.name)}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View skills in {cat.name} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> Categories are system-defined. To add new categories or modify
              existing ones, update the{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">SKILL_CATEGORIES</code>{' '}
              constant in the shared package. To add skills to a category, use the{' '}
              <Link href="/skills" className="text-primary hover:underline">
                Skills Management
              </Link>{' '}
              page.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
