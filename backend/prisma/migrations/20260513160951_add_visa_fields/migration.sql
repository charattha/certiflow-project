/*
  Warnings:

  - You are about to drop the column `employment_date` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `ServiceCharge` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `ServiceCharge` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `ServiceCharge` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `ServiceCharge` table. All the data in the column will be lost.
  - Added the required column `years` to the `ServiceCharge` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `month` on the `ServiceCharge` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ServiceCharge" DROP CONSTRAINT "ServiceCharge_employee_id_fkey";

-- AlterTable
ALTER TABLE "DocumentRequest" ADD COLUMN     "is_salary_certificate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_visa_certificate" BOOLEAN DEFAULT false,
ADD COLUMN     "on_duty_date" DATE,
ADD COLUMN     "purpose_country" TEXT;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "employment_date",
ALTER COLUMN "salary" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ServiceCharge" DROP COLUMN "created_at",
DROP COLUMN "employee_id",
DROP COLUMN "updated_at",
DROP COLUMN "year",
ADD COLUMN     "years" DATE NOT NULL,
DROP COLUMN "month",
ADD COLUMN     "month" DATE NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE TEXT;
