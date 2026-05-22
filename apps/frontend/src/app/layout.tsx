import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { buildMetadata } from '@/lib/metadata';
import { buildWebSiteSchema, safeJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = buildMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteSchema = buildWebSiteSchema();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
