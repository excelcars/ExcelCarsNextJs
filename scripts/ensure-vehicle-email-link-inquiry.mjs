import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const prismaCli = join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
const addInquiryLinkSql = join(process.cwd(), "prisma", "add_vehicle_email_links_inquiry_id.sql");

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

async function executeSqlFile(filePath, env = process.env) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing SQL file: ${filePath}`);
  }

  await run(process.execPath, [prismaCli, "db", "execute", "--schema", schemaPath, "--file", filePath], {
    env,
  });
}

export async function ensureVehicleEmailLinkInquiry(env = process.env) {
  if (!existsSync(prismaCli)) {
    throw new Error("Prisma CLI is missing. Run npm install first.");
  }

  console.log("Ensuring tracked vehicle email links can be tied back to inquiries...");
  await executeSqlFile(addInquiryLinkSql, env);
}

const isEntrypoint = process.argv[1] && join(process.cwd(), process.argv[1].replace(/\//g, "\\")).endsWith("scripts\\ensure-vehicle-email-link-inquiry.mjs");

if (isEntrypoint) {
  ensureVehicleEmailLinkInquiry().catch((error) => {
    console.error(`\nUnable to ensure vehicle email link inquiry relation: ${error.message}`);
    process.exit(1);
  });
}
