-- CreateTable
CREATE TABLE "kudos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "volunteer_hour_id" TEXT,
    "donation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kudos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kudos_user_id_volunteer_hour_id_key" ON "kudos"("user_id", "volunteer_hour_id");

-- CreateIndex
CREATE UNIQUE INDEX "kudos_user_id_donation_id_key" ON "kudos"("user_id", "donation_id");

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_volunteer_hour_id_fkey" FOREIGN KEY ("volunteer_hour_id") REFERENCES "volunteer_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
