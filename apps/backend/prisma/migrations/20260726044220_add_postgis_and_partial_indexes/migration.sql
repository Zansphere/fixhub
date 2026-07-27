-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "location" geometry(Point, 4326);

-- AlterTable
ALTER TABLE "technicians" ADD COLUMN     "location" geometry(Point, 4326);

-- Custom SQL for Partial Indexes
CREATE UNIQUE INDEX "users_phone_active_key" ON "users"("phone") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "users_email_active_key" ON "users"("email") WHERE "deleted_at" IS NULL;

-- Custom SQL for Geometry Triggers
CREATE OR REPLACE FUNCTION update_geometry_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326);
  ELSE
    NEW.location = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to addresses
CREATE TRIGGER sync_address_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON "addresses"
FOR EACH ROW
EXECUTE FUNCTION update_geometry_location();

-- Apply trigger to technicians
CREATE TRIGGER sync_technician_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON "technicians"
FOR EACH ROW
EXECUTE FUNCTION update_geometry_location();

-- Backfill existing data
UPDATE "addresses" SET latitude = latitude WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
UPDATE "technicians" SET latitude = latitude WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
