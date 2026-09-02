import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const sqlFile = join(process.cwd(), "prisma", "ensure_inquiry_status_constraint.sql");
const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));

if (envFileArg) {
  const envFile = join(process.cwd(), envFileArg.slice("--env-file=".length));
  if (!existsSync(envFile)) throw new Error(`Missing environment file: ${envFile}`);

  // Explicit environment selection must replace the local DATABASE_URL inherited by the CLI.
  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

if (envFileArg?.includes(".env.production") && (!process.argv.includes("--force") || !process.argv.includes("--confirm-production"))) {
  throw new Error("Refusing to change production without --force --confirm-production.");
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(" ")} ${signal ? `was stopped by ${signal}` : `exited with code ${code}`}`));
    });
  });
}

export async function ensureInquiryStatusConstraint(env = process.env) {
  if (!existsSync(prismaCli)) throw new Error("Prisma CLI is missing. Run npm install first.");
  if (!existsSync(sqlFile)) throw new Error(`Missing SQL file: ${sqlFile}`);

  const databaseHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : "unknown database host";
  console.log(`Ensuring inquiry status supports Open, FollowUp, and Closed on ${databaseHost}...`);
  await run(process.execPath, [prismaCli, "db", "execute", "--schema", schemaPath, "--file", sqlFile], { env });
}

const isEntrypoint = process.argv[1] && join(process.cwd(), process.argv[1].replace(/\//g, "\\")).endsWith("scripts\\ensure-inquiry-status-constraint.mjs");
if (isEntrypoint) {
  ensureInquiryStatusConstraint().catch((error) => {
    console.error(`\nUnable to ensure inquiry status constraint: ${error.message}`);
    process.exit(1);
  });
}
