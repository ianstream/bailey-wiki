import fs from "node:fs/promises";

export async function tryRead(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
