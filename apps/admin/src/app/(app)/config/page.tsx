// Platform configuration is intentionally represented by the shared not-yet-implemented resource shell.
import { AdminResourcePage } from '@/components/AdminResourcePage';
export default function Page() { return <AdminResourcePage title="Platform Configuration" description="Review runtime platform controls and feature switches." endpoint="/admin/config" />; }
