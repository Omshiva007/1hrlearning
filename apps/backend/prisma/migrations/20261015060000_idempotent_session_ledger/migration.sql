-- Prevent retried session lifecycle commands from recording the same economic effect twice.
-- PostgreSQL permits multiple NULL sessionId values, so unrelated admin and bonus entries remain unaffected.
CREATE UNIQUE INDEX "PointTransaction_userId_type_sessionId_key"
ON "PointTransaction"("userId", "type", "sessionId");
