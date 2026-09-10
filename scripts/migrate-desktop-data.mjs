import { copyFile, mkdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, ".product-studio", "data.json");
const destinationDirectory = path.join(os.homedir(), "Library", "Application Support", "Product Studio");
const destination = path.join(destinationDirectory, "data.json");

try {
  await stat(source);
} catch {
  throw new Error(`No local Product Studio store was found at ${source}.`);
}

try {
  await stat(destination);
  throw new Error(`Desktop data already exists at ${destination}; migration was not run to avoid overwriting it.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

await mkdir(destinationDirectory, { recursive: true });
await copyFile(source, destination);
console.log(`Migrated Product Studio data to ${destination}`);
