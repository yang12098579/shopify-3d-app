import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import crypto from "crypto";

const DRACO_ENABLED = true; // Toggle via env: process.env.DRACO_ENABLED !== "false"

export async function compressWithDraco(inputUrl: string): Promise<string | null> {
  if (!DRACO_ENABLED) return null;

  const tmpDir = join(tmpdir(), "vision3d-draco");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const hash = crypto.createHash("md5").update(inputUrl).digest("hex").substring(0, 8);
  const inputPath = join(tmpDir, `${hash}_input.glb`);
  const outputPath = join(tmpDir, `${hash}_compressed.glb`);

  try {
    // Download GLB
    const response = await fetch(inputUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(inputPath, buffer);

    // Draco compress
    execSync(
      `npx gltf-transform draco "${inputPath}" "${outputPath}"`,
      { timeout: 60000, stdio: "pipe" }
    );

    if (!existsSync(outputPath)) return null;
    const compressed = await import("fs").then(f => f.promises.readFile(outputPath));
    const originalSize = buffer.length;
    const compressedSize = compressed.length;
    console.log(
      `[Draco] Compressed ${(originalSize / 1024 / 1024).toFixed(1)}MB -> ${(compressedSize / 1024 / 1024).toFixed(1)}MB (${((1 - compressedSize / originalSize) * 100).toFixed(0)}% reduction)`
    );
    return outputPath;
  } catch (err) {
    console.error("[Draco] Compression failed:", err instanceof Error ? err.message : String(err));
    return null;
  } finally {
    // Cleanup
    try { if (existsSync(inputPath)) unlinkSync(inputPath); } catch {}
    // outputPath intentionally preserved - caller needs the file
  }
}
