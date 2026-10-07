// Point administration is intentionally represented by the shared not-yet-implemented resource shell.
import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Point Economy" description="Monitor point supply, transfers, and economy health." endpoint="/admin/points/economy" />; }
