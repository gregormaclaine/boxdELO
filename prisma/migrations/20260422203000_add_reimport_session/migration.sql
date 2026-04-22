-- CreateEnum
CREATE TYPE "ReimportStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "reimport_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ReimportStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "scraped_films" JSONB NOT NULL DEFAULT '[]',
    "pages_scraped" INTEGER NOT NULL DEFAULT 0,
    "total_pages" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimport_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reimport_sessions_user_id_key" ON "reimport_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "reimport_sessions" ADD CONSTRAINT "reimport_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
