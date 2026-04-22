import UsernameForm from "@/components/UsernameForm";

export default function LandingPage() {
  return (
    <main className="flex flex-col flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Movie Ranker
          </h1>
          <p className="text-text-muted text-base leading-relaxed">
            Enter your Letterboxd username to import your watched films and build
            a ranked ordering through head-to-head matchups.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest">
            Letterboxd username
          </label>
          <UsernameForm />
        </div>

        <div className="flex flex-col gap-2 text-xs text-text-muted border-t border-border pt-6">
          <p>
            <span className="text-text-primary font-medium">How it works:</span>{" "}
            We scrape your public Letterboxd profile to get your watch history, then
            use the TMDB API to fetch posters.
          </p>
          <p>
            Pick the better film in each matchup and the ranking builds itself. Come
            back any time — your progress is saved.
          </p>
        </div>
      </div>
    </main>
  );
}
