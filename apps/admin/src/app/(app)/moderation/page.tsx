// Moderation is intentionally represented by the shared not-yet-implemented resource shell.
import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Moderation" description="Inspect reported profiles, testimonials, and sessions." endpoint="/admin/moderation/flags?limit=100" />; }
