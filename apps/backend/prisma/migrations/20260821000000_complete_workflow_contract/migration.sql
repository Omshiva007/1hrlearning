CREATE TYPE "SessionType" AS ENUM ('TEACHING', 'QUERY_CLARIFICATION');
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FIRST_MATCH_FOUND';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POINTS_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONNECTION_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONNECTION_ACCEPTED';

ALTER TABLE "User" ADD COLUMN "lastOnboardingReminderAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "sessionType" "SessionType" NOT NULL DEFAULT 'TEACHING';
ALTER TABLE "Session" ADD COLUMN "pointsTransferred" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Connection" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "addresseeId" TEXT NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Connection_requesterId_addresseeId_key" ON "Connection"("requesterId", "addresseeId");
CREATE INDEX "Connection_requesterId_idx" ON "Connection"("requesterId");
CREATE INDEX "Connection_addresseeId_idx" ON "Connection"("addresseeId");
CREATE INDEX "Connection_status_idx" ON "Connection"("status");
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
