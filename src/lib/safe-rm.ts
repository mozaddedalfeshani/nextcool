import { rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface RmResult {
  path: string;
  existed: boolean;
  bytesBefore: number;
  dryRun: boolean;
}

export async function safeRm(
  target: string,
  opts: { dryRun?: boolean; cwd?: string } = {}
): Promise<RmResult> {
  const cwd = opts.cwd ?? process.cwd();
  const abs = resolve(cwd, target);

  let bytesBefore = 0;
  let existed = false;

  try {
    const s = await stat(abs);
    existed = true;
    bytesBefore = s.isDirectory() ? await dirSize(abs) : s.size;
  } catch {
    // path doesn't exist
  }

  if (existed && !opts.dryRun) {
    await rm(abs, { recursive: true, force: true });
  }

  return { path: abs, existed, bytesBefore, dryRun: opts.dryRun ?? false };
}

async function dirSize(dir: string): Promise<number> {
  try {
    const { default: fastFolderSize } = await import("fast-folder-size");
    return await new Promise<number>((res, rej) =>
      fastFolderSize(dir, (err: unknown, size?: number) =>
        err ? rej(err) : res(size ?? 0)
      )
    );
  } catch {
    return 0;
  }
}

export function joinCwd(rel: string, cwd = process.cwd()): string {
  return join(cwd, rel);
}
