import { redirect } from 'next/navigation';

// Redirect to step 1 (profile)
export default function OnboardingPage() {
  redirect('/onboarding/profile');
}
