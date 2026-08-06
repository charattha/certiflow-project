-- Relabel the status flow (PENDING/COMPLETED/REJECTED) to reflect pickup of
-- the generated document (PENDING/WAITING_FOR_PICKUP/DONE).
-- COMPLETED requests are treated as ready for pickup; REJECTED requests are
-- re-routed to PENDING since there is no longer a generation step that can fail.

ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'WAITING_FOR_PICKUP', 'DONE');

ALTER TABLE "DocumentRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" TYPE "RequestStatus" USING (
  CASE "status"::text
    WHEN 'COMPLETED' THEN 'WAITING_FOR_PICKUP'
    WHEN 'REJECTED' THEN 'PENDING'
    ELSE 'PENDING'
  END
)::"RequestStatus";
ALTER TABLE "DocumentRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "RequestStatus_old";
