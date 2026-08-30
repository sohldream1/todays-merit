-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('salesforce', 'raisers_edge_nxt', 'gofundme_pro');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('disconnected', 'connected', 'error');

-- CreateEnum
CREATE TYPE "SyncEntityType" AS ENUM ('donor', 'donation', 'volunteer_hour');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'synced', 'failed');

-- CreateTable
CREATE TABLE "org_integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'disconnected',
    "credentials" TEXT,
    "external_org_label" TEXT,
    "connected_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_records" (
    "id" TEXT NOT NULL,
    "org_integration_id" TEXT NOT NULL,
    "entity_type" "SyncEntityType" NOT NULL,
    "local_id" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sync_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_integrations_organization_id_provider_key" ON "org_integrations"("organization_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "integration_sync_records_org_integration_id_entity_type_loc_key" ON "integration_sync_records"("org_integration_id", "entity_type", "local_id");

-- AddForeignKey
ALTER TABLE "org_integrations" ADD CONSTRAINT "org_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_records" ADD CONSTRAINT "integration_sync_records_org_integration_id_fkey" FOREIGN KEY ("org_integration_id") REFERENCES "org_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
