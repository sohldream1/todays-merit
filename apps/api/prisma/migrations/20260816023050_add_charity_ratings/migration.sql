-- CreateEnum
CREATE TYPE "GuideStarSealLevel" AS ENUM ('platinum', 'gold', 'silver', 'bronze', 'none');

-- CreateTable
CREATE TABLE "charity_ratings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "charity_navigator_stars" INTEGER,
    "charity_navigator_score" DECIMAL(5,2),
    "charity_navigator_url" TEXT,
    "charity_navigator_fetched_at" TIMESTAMP(3),
    "guide_star_seal_level" "GuideStarSealLevel",
    "guide_star_url" TEXT,
    "guide_star_fetched_at" TIMESTAMP(3),
    "is_mock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "charity_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charity_ratings_organization_id_key" ON "charity_ratings"("organization_id");

-- AddForeignKey
ALTER TABLE "charity_ratings" ADD CONSTRAINT "charity_ratings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
