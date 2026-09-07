import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Sessions" description="Review all learning sessions and their current state." endpoint="/admin/sessions?limit=100" />; }
