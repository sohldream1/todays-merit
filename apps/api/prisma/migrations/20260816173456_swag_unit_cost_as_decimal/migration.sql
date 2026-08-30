/*
  Warnings:

  - You are about to drop the column `unit_cost_cents` on the `swag_products` table. All the data in the column will be lost.
  - Added the required column `unit_cost` to the `swag_products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "swag_products" DROP COLUMN "unit_cost_cents",
ADD COLUMN     "unit_cost" DECIMAL(10,2) NOT NULL;
