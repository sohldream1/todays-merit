-- CreateEnum
CREATE TYPE "SwagOrderStatus" AS ENUM ('pending', 'submitted', 'shipped', 'delivered', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "SwagTriggerType" AS ENUM ('manual', 'badge_awarded', 'tier_reached');

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'swag_com';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shipping_address_line1" TEXT,
ADD COLUMN     "shipping_address_line2" TEXT,
ADD COLUMN     "shipping_city" TEXT,
ADD COLUMN     "shipping_country" TEXT,
ADD COLUMN     "shipping_name" TEXT,
ADD COLUMN     "shipping_postal_code" TEXT,
ADD COLUMN     "shipping_state" TEXT;

-- CreateTable
CREATE TABLE "swag_products" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "external_product_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "category" TEXT,
    "sizes" TEXT[],
    "unit_cost_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swag_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swag_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "swag_product_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "size" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "SwagOrderStatus" NOT NULL DEFAULT 'pending',
    "trigger_type" "SwagTriggerType" NOT NULL DEFAULT 'manual',
    "trigger_rule_id" TEXT,
    "ship_to_name" TEXT NOT NULL,
    "ship_to_address_line1" TEXT NOT NULL,
    "ship_to_address_line2" TEXT,
    "ship_to_city" TEXT NOT NULL,
    "ship_to_state" TEXT,
    "ship_to_postal_code" TEXT NOT NULL,
    "ship_to_country" TEXT NOT NULL,
    "requested_by_user_id" TEXT,
    "external_order_id" TEXT,
    "tracking_number" TEXT,
    "tracking_url" TEXT,
    "last_error" TEXT,
    "submitted_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swag_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swag_auto_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "swag_product_id" TEXT NOT NULL,
    "trigger_type" "SwagTriggerType" NOT NULL,
    "badge_id" TEXT,
    "tier_id" TEXT,
    "size" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swag_auto_rules_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "swag_products" ADD CONSTRAINT "swag_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_orders" ADD CONSTRAINT "swag_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_orders" ADD CONSTRAINT "swag_orders_swag_product_id_fkey" FOREIGN KEY ("swag_product_id") REFERENCES "swag_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_orders" ADD CONSTRAINT "swag_orders_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_orders" ADD CONSTRAINT "swag_orders_trigger_rule_id_fkey" FOREIGN KEY ("trigger_rule_id") REFERENCES "swag_auto_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_auto_rules" ADD CONSTRAINT "swag_auto_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_auto_rules" ADD CONSTRAINT "swag_auto_rules_swag_product_id_fkey" FOREIGN KEY ("swag_product_id") REFERENCES "swag_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_auto_rules" ADD CONSTRAINT "swag_auto_rules_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swag_auto_rules" ADD CONSTRAINT "swag_auto_rules_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
