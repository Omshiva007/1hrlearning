// Advertising controls are intentionally represented by the shared not-yet-implemented resource shell.
import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Ads" description="Review first-party recommendation campaigns and placements." endpoint="/admin/ads?limit=100" />; }
