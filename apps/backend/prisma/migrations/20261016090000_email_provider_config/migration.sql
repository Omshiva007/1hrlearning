CREATE TABLE "EmailProviderConfig" (
    "provider" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT '1hrLearning',
    "encryptedApiKey" TEXT,
    "credentialHint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailProviderConfig_pkey" PRIMARY KEY ("provider")
);

CREATE INDEX "EmailProviderConfig_isActive_idx" ON "EmailProviderConfig"("isActive");
