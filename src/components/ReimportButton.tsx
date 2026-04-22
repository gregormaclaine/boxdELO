"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";

export default function ReimportButton({ username }: { username: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReimport() {
    setLoading(true);
    await fetch(`/api/${username}/import`, { method: "POST" });
    router.push(`/${username}/import`);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleReimport} disabled={loading}>
      {loading ? "Starting…" : "Check for new films"}
    </Button>
  );
}
