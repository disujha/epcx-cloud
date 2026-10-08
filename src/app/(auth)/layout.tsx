import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <Image
              src="/images/icon.png"
              alt="EPCX Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            EPCX<span className="text-accent-500">.cloud</span>
          </span>
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
