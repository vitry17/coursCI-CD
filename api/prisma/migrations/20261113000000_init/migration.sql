-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('PATIENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('BOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "cancelled_by" AS ENUM ('PATIENT', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "role" "role" NOT NULL DEFAULT 'PATIENT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'BOOKED',
    "reason" VARCHAR(500),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" "cancelled_by",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closed_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closed_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "appointments_user_start_idx" ON "appointments"("user_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "closed_days_date_key" ON "closed_days"("date");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Business constraints intentionally maintained in SQL (Prisma 6).
CREATE UNIQUE INDEX appointments_slot_booked_uq ON appointments (start_at) WHERE status = 'BOOKED';
ALTER TABLE appointments ADD CONSTRAINT appointments_end_ck CHECK (end_at > start_at);
ALTER TABLE appointments ADD CONSTRAINT appointments_wednesday_ck
  CHECK (EXTRACT(DOW FROM start_at AT TIME ZONE 'Europe/Paris') = 3);
ALTER TABLE appointments ADD CONSTRAINT appointments_cancel_ck CHECK (
  (status = 'BOOKED' AND cancelled_at IS NULL AND cancelled_by IS NULL) OR
  (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
);
ALTER TABLE closed_days ADD CONSTRAINT closed_days_wednesday_ck CHECK (EXTRACT(DOW FROM date) = 3);