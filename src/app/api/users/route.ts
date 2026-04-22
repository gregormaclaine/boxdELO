import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CreateUserResponse } from "@/types/api";

const USERNAME_RE = /^[a-zA-Z0-9_-]{1,50}$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username: string = (body.username ?? "").trim().toLowerCase();

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid username format" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { letterboxd_username: username },
  });

  if (existing) {
    const res: CreateUserResponse = {
      user: {
        id: existing.id,
        letterboxd_username: existing.letterboxd_username,
        import_status: existing.import_status,
        total_films: existing.total_films,
      },
      isNew: false,
    };
    return NextResponse.json(res);
  }

  const user = await prisma.user.create({
    data: { letterboxd_username: username },
  });

  const res: CreateUserResponse = {
    user: {
      id: user.id,
      letterboxd_username: user.letterboxd_username,
      import_status: user.import_status,
      total_films: user.total_films,
    },
    isNew: true,
  };
  return NextResponse.json(res, { status: 201 });
}
