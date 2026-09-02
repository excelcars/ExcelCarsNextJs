import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const sqlFile = join(process.cwd(), "prisma", "ensure_inquiry_status_constraint.sql");

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

  console.log("Ensuring inquiry status supports Open, FollowUp, and Closed...");
  await run(process.execPath, [prismaCli, "db", "execute", "--schema", schemaPath, "--file", sqlFile], { env });
}

const isEntrypoint = process.argv[1] && join(process.cwd(), process.argv[1].replace(/\//g, "\\")).endsWith("scripts\\ensure-inquiry-status-constraint.mjs");
if (isEntrypoint) {
  ensureInquiryStatusConstraint().catch((error) => {
    console.error(`\nUnable to ensure inquiry status constraint: ${error.message}`);
    process.exit(1);
  });
}
