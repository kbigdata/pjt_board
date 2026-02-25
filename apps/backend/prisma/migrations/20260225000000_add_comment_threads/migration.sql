-- AlterTable
ALTER TABLE "comments" ADD COLUMN "parent_comment_id" TEXT,
ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
