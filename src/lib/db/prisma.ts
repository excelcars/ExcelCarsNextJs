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

function getPrismaClient() {
  const existingPrisma = globalForPrisma.prisma;

  if (existingPrisma && hasRequiredDelegates(existingPrisma)) {
    return existingPrisma;
  }

  const nextPrisma = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextPrisma;
  }

  return nextPrisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = getPrismaClient();
}
