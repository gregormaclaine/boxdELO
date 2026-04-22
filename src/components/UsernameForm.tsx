"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";

const USERNAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

export default function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();

    if (!USERNAME_RE.test(trimmed)) {
      setError("Letterboxd usernames can only contain letters, numbers, underscores, and hyphens.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }

      const data = await res.json();

      if (data.user.import_status === "COMPLETED" || data.user.import_status === "IN_PROGRESS") {
        router.push(`/${trimmed}/rank`);
      } else {
        router.push(`/${trimmed}/import`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(null);
          }}
          placeholder="your-username"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={[
            "flex-1 bg-bg-surface border rounded-lg px-4 py-3",
            "text-sm text-text-primary placeholder:text-text-muted/60",
            "focus:outline-none focus:ring-1 focus:ring-accent",
            "transition-shadow duration-150",
            error ? "border-danger/60" : "border-border",
          ].join(" ")}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !username.trim()} size="md">
          {loading ? <Spinner size="sm" /> : "Go"}
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
