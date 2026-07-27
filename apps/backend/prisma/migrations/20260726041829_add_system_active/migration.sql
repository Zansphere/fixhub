-- AlterTable
ALTER TABLE "sub_service_areas" ADD COLUMN     "system_active" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "sub_service_areas_system_active_idx" ON "sub_service_areas"("system_active");
