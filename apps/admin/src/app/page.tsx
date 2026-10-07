// The admin root has no independent content and always resolves to the operational dashboard.
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
