import { rm } from "node:fs/promises";
import { join } from "node:path";

const target = join(process.cwd(), ".next");

try {
  await rm(target, { recursive: true, force: true });
  console.log("Removed .next cache directory.");
} catch (error) {
  console.warn("Could not remove .next cache directory:", error?.message ?? error);
}
