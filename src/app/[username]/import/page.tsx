import ImportProgress from "@/components/ImportProgress";

interface ImportPageProps {
  params: Promise<{ username: string }>;
}

export default async function ImportPage({ params }: ImportPageProps) {
  const { username } = await params;

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-2 mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Importing your watchlist
        </h1>
        <p className="text-sm text-text-muted">
          Scanning <span className="text-text-primary">@{username}</span> on Letterboxd
        </p>
      </div>
      <ImportProgress username={username} />
    </div>
  );
}
