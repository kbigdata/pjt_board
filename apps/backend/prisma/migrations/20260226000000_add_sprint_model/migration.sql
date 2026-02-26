-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'SPRINT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'SPRINT_STARTED';
ALTER TYPE "ActivityAction" ADD VALUE 'SPRINT_COMPLETED';

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN "sprint_id" TEXT;

-- CreateIndex
CREATE INDEX "sprints_board_id_status_idx" ON "sprints"("board_id", "status");

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
