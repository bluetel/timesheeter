/*
  Warnings:

  - Added the required column `number` to the `TicketForTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TicketForTask" ADD COLUMN     "number" INTEGER NOT NULL;
