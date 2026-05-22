'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-text-primary text-white">
      <div className="px-10 py-14">
        {/* Top Section */}
        <div className="mb-10 grid grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green text-xs font-bold text-green-light">
                OK
              </div>
              <span className="text-sm font-semibold">OKE</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">
              Where everyone is both a teacher and a learner.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Product
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  How it works
                </Link>
              </li>
              <li>
                <a href="#topics" className="transition-colors hover:text-white">
                  Topics
                </a>
              </li>
              <li>
                <Link
                  href="/discover"
                  className="transition-colors hover:text-white"
                >
                  Public sessions
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Platform
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  How points work
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Trust and safety
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Privacy policy
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Terms of service
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  Cookie policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              © 2026 Open Knowledge Exchange. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-gray-500">
              <a href="#" className="transition-colors hover:text-gray-300">
                Privacy
              </a>
              <a href="#" className="transition-colors hover:text-gray-300">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
