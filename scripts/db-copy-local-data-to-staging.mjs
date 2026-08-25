import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const localEnvFile = join(process.cwd(), ".env");
const stagingEnvFile = join(process.cwd(), ".env.staging.local");
const dumpDir = mkdtempSync(join(tmpdir(), "excelcars-staging-copy-"));
const dumpFile = join(dumpDir, "local-full.sql");

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
    const child = spawn(command, args, { stdio: "inherit", shell: false, ...options });

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

function parsePostgresUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    sslmode: url.searchParams.get("sslmode") || "",
    channelBinding: url.searchParams.get("channel_binding") || "",
  };
}

function ensureArg(name) {
  if (!process.argv.includes(name)) {
    throw new Error(
      `Refusing to copy local data to staging without ${name}. This script can overwrite staging content.`,
    );
  }
}

function cleanup() {
  if (existsSync(dumpDir)) {
    rmSync(dumpDir, { recursive: true, force: true });
  }
}

async function main() {
  ensureArg("--force");

  if (!existsSync(localEnvFile)) {
    throw new Error("Missing .env");
  }

  if (!existsSync(stagingEnvFile)) {
    throw new Error("Missing .env.staging.local");
  }

  const localEnv = parseEnvFile(localEnvFile);
  const stagingEnv = parseEnvFile(stagingEnvFile);

  if (!localEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env");
  }

  if (!stagingEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in .env.staging.local");
  }

  const staging = parsePostgresUrl(stagingEnv.DATABASE_URL);

  console.log("Dumping local schema and data from localhost:5432...");
  await run("docker", [
    "run",
    "--rm",
    "--network",
    "host",
    "-v",
    `${dumpDir}:/dump`,
    "-e",
    "PGPASSWORD=excelcars",
    "postgres:17-alpine",
    "pg_dump",
    "--host=localhost",
    "--port=5432",
    "--username=excelcars",
    "--dbname=excelcars",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--file=/dump/local-full.sql",
  ]);

  console.log("Restoring local schema and data into staging...");
  console.log(
    "This uses a full dump instead of a data-only import so foreign-key constraints are recreated after the data load.",
  );
  await run("docker", [
    "run",
    "--rm",
    "-v",
    `${dumpDir}:/dump`,
    "-e",
    `PGPASSWORD=${staging.password}`,
    "postgres:17-alpine",
    "psql",
    `postgresql://${encodeURIComponent(staging.username)}:${encodeURIComponent(staging.password)}@${staging.host}:${staging.port}/${staging.database}?sslmode=${staging.sslmode || "require"}${staging.channelBinding ? `&channel_binding=${staging.channelBinding}` : ""}`,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "/dump/local-full.sql",
  ]);

  console.log("Local schema and data restore into staging completed.");
}

main()
  .catch((error) => {
    console.error(`\nUnable to copy local data to staging: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    cleanup();
  });
