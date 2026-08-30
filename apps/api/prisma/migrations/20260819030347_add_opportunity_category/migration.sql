-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('volunteer', 'race', 'competition');

-- AlterTable
ALTER TABLE "volunteer_opportunities" ADD COLUMN     "category" "OpportunityCategory" NOT NULL DEFAULT 'volunteer';
