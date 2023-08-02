-- CreateTable
CREATE TABLE "TogglSyncRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "togglEntityId" BIGINT NOT NULL,

    CONSTRAINT "TogglSyncRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TogglSyncRecord_workspaceId_category_togglEntityId_key" ON "TogglSyncRecord"("workspaceId", "category", "togglEntityId");

-- AddForeignKey
ALTER TABLE "TogglSyncRecord" ADD CONSTRAINT "TogglSyncRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
