import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Audit Log" description="Review administrative actions and their before/after values." endpoint="/admin/audit-log?limit=100" />; }
