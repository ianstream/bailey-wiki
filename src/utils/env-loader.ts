import fs from "node:fs/promises";
import path from "node:path";

export async function loadEnv(startDir: string): Promise<void> {
  const envPath = path.join(startDir, ".env");
  try {
    const content = await fs.readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length) {
        const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // .env not found — ok
  }
}
