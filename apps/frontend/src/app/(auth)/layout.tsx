// Authentication pages use a focused layout that omits the authenticated application chrome.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
