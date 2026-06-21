import { execFile } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export async function convertToWav(input: Buffer, ext = "m4a"): Promise<Buffer> {
  const id = randomUUID();
  const inPath = join(tmpdir(), `db-${id}.${ext}`);
  const outPath = join(tmpdir(), `db-${id}.wav`);

  await writeFile(inPath, input);
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        "ffmpeg",
        ["-i", inPath, "-ar", "16000", "-ac", "1", "-f", "wav", "-y", outPath],
        (err, _stdout, stderr) => {
          if (err) reject(new Error(`ffmpeg failed: ${stderr || err.message}`));
          else resolve();
        },
      );
    });
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}
