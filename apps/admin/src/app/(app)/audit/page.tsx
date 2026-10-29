// Audit history remains read-only so evidence cannot be altered from the operator interface.
import { OperationalAdminPage } from '@/components/OperationalAdminPage';
export default function Page() { return <OperationalAdminPage mode="audit" />; }
