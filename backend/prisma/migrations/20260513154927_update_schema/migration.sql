/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `docLang` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `docType` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `templateFields` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `actorId` on the `SystemAuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `actorRole` on the `SystemAuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SystemAuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `SystemAuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `failedLoginAttempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lockoutUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mustChangePassword` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[request_id]` on the table `DocumentRequest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_id]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doc_lang` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doc_type` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `request_id` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actor_id` to the `SystemAuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actor_role` to the `SystemAuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "Prefix" AS ENUM ('Mr.', 'Ms.', 'Mrs.');

-- DropForeignKey
ALTER TABLE "DocumentRequest" DROP CONSTRAINT "DocumentRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_userId_fkey";

-- DropIndex
DROP INDEX "DocumentRequest_requestId_key";

-- DropIndex
DROP INDEX "Employee_employeeId_key";

-- DropIndex
DROP INDEX "Employee_userId_key";

-- AlterTable
ALTER TABLE "DocumentRequest" DROP COLUMN "createdAt",
DROP COLUMN "docLang",
DROP COLUMN "docType",
DROP COLUMN "employeeId",
DROP COLUMN "expiresAt",
DROP COLUMN "fileUrl",
DROP COLUMN "requestId",
DROP COLUMN "templateFields",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doc_lang" TEXT NOT NULL,
ADD COLUMN     "doc_type" TEXT NOT NULL,
ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "file_url" TEXT,
ADD COLUMN     "request_id" TEXT NOT NULL,
ADD COLUMN     "service_charge_id" TEXT,
ADD COLUMN     "template_fields" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "createdAt",
DROP COLUMN "employeeId",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "employment_date" TIMESTAMP(3),
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "prefix" "Prefix",
ADD COLUMN     "salary" DECIMAL(10,2),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SystemAuditLog" DROP COLUMN "actorId",
DROP COLUMN "actorRole",
DROP COLUMN "createdAt",
DROP COLUMN "targetId",
ADD COLUMN     "actor_id" TEXT NOT NULL,
ADD COLUMN     "actor_role" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "target_id" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockoutUntil",
DROP COLUMN "mustChangePassword",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockout_until" TIMESTAMP(3),
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "ServiceCharge" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequest_request_id_key" ON "DocumentRequest"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_id_key" ON "Employee"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_user_id_key" ON "Employee"("user_id");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_service_charge_id_fkey" FOREIGN KEY ("service_charge_id") REFERENCES "ServiceCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCharge" ADD CONSTRAINT "ServiceCharge_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
