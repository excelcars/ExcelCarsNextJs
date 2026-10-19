import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient();
}

function hasRequiredDelegates(client: PrismaClient) {
  return typeof (client as PrismaClient & { vehicleEmailLink?: unknown }).vehicleEmailLink !== "undefined";
}

const existingPrisma = globalForPrisma.prisma;

export const prisma =
  existingPrisma && hasRequiredDelegates(existingPrisma)
    ? existingPrisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
