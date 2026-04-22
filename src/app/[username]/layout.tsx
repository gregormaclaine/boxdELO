import Link from "next/link";

interface UserLayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}

export default async function UserLayout({ children, params }: UserLayoutProps) {
  const { username } = await params;

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
            boxdELO
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted">
              @{username}
            </span>
            <Link
              href={`/${username}/rank`}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Rank
            </Link>
            <Link
              href={`/${username}/results`}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Results
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-col flex-1">
        {children}
      </main>
    </div>
  );
}
