import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { ensureInquiryNumberUnique } from "./ensure-inquiry-number-unique.mjs";
import { ensureVehicleEmailLinkInquiry } from "./ensure-vehicle-email-link-inquiry.mjs";
import { ensureInquiryStatusConstraint } from "./ensure-inquiry-status-constraint.mjs";

const envFile = join(process.cwd(), ".env.staging.local");
const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");

function parseEnvFile(filePath) {
  const parsed = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} ${signal ? `was stopped by ${signal}` : `exited with code ${code}`}`,
        ),
      );
    });
  });
}

async function main() {
  if (!existsSync(envFile)) {
    throw new Error("Missing .env.staging.local");
  }

  if (!existsSync(prismaCli)) {
    throw new Error("Prisma CLI is missing. Run npm install first.");
  }

  const stagingEnv = parseEnvFile(envFile);
  const databaseUrl = stagingEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in .env.staging.local");
  }

  if (!databaseUrl.includes("neon.tech") && !databaseUrl.includes("sslmode=")) {
    console.warn("Warning: staging DATABASE_URL does not look like the expected hosted staging database.");
  }

  console.log("Using .env.staging.local for Prisma db push...");
  const env = {
    ...process.env,
    ...stagingEnv,
  };
  await run(process.execPath, [prismaCli, "db", "push", ...process.argv.slice(2)], { env });
  await ensureInquiryNumberUnique(env);
  await ensureVehicleEmailLinkInquiry(env);
  await ensureInquiryStatusConstraint(env);
}

main().catch((error) => {
  console.error(`\nUnable to push Prisma schema to staging: ${error.message}`);
  process.exit(1);
});
