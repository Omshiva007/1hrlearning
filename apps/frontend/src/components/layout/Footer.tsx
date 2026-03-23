import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-3">
              <span className="text-2xl">🎓</span>
              <span>1hrLearning</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              A free, non-commercial platform for one-to-one knowledge exchange. Share what you know.
              Learn something new in an hour.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/skills" className="hover:text-foreground transition-colors">Browse Skills</Link></li>
              <li><Link href="/register" className="hover:text-foreground transition-colors">Join Free</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} 1hrLearning. Open source, non-commercial.</p>
        </div>
      </div>
    </footer>
  );
}
