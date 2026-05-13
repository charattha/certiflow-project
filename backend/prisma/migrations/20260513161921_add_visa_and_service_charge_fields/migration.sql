/*
  Warnings:

  - You are about to drop the column `is_salary_certificate` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `is_visa_certificate` on the `DocumentRequest` table. All the data in the column will be lost.
  - You are about to drop the column `purpose_country` on the `DocumentRequest` table. All the data in the column will be lost.
  - The `salary` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `years` on the `ServiceCharge` table. All the data in the column will be lost.
  - Added the required column `arrival_date` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departure_date` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_travel_date` to the `DocumentRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_id` to the `ServiceCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ServiceCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ServiceCharge` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `amount` on the `ServiceCharge` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `month` on the `ServiceCharge` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "DocumentRequest" DROP COLUMN "is_salary_certificate",
DROP COLUMN "is_visa_certificate",
DROP COLUMN "purpose_country",
ADD COLUMN     "arrival_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "country_prefer_travel" TEXT,
ADD COLUMN     "departure_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "last_travel_date" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "on_duty_date" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employment_date" TIMESTAMP(3),
DROP COLUMN "salary",
ADD COLUMN     "salary" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ServiceCharge" DROP COLUMN "years",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "employee_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL,
DROP COLUMN "amount",
ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL,
DROP COLUMN "month",
ADD COLUMN     "month" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ServiceCharge" ADD CONSTRAINT "ServiceCharge_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
