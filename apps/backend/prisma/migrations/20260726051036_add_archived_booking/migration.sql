-- CreateTable
CREATE TABLE "archive_bookings" (
    "id" UUID NOT NULL,
    "booking_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "technician_id" UUID,
    "sub_service_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_slot" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "revised_amount" DECIMAL(10,2),
    "price_revision_note" TEXT,
    "customer_consent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" "CancellationActor",
    "cancel_reason" TEXT,
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "original_created_at" TIMESTAMP(3) NOT NULL,
    "original_updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "archive_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "archive_bookings_booking_number_key" ON "archive_bookings"("booking_number");

-- CreateIndex
CREATE INDEX "archive_bookings_customer_id_idx" ON "archive_bookings"("customer_id");

-- CreateIndex
CREATE INDEX "archive_bookings_booking_number_idx" ON "archive_bookings"("booking_number");
