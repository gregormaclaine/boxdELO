"use client";

import Link from "next/link";
import Button from "./ui/Button";

export default function ReimportButton({ username }: { username: string }) {
  return (
    <Link href={`/${username}/reimport`}>
      <Button variant="ghost" size="sm">Check for new films</Button>
    </Link>
  );
}
