// On Windows, npm/npx/pnpm/yarn are .cmd scripts — execa needs the suffix
// or shell:true. We resolve the right binary name per OS here.

const IS_WIN = process.platform === "win32";

const WIN_CMD_TOOLS = new Set(["npm", "npx", "pnpm", "yarn"]);

export function resolveBin(name: string): string {
  if (IS_WIN && WIN_CMD_TOOLS.has(name)) return `${name}.cmd`;
  return name;
}

export const IS_WINDOWS = IS_WIN;
