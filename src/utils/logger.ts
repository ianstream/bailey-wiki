const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export const log = (msg: string): void =>
  void process.stderr.write(`${C.green("[bailey-wiki]")} ${msg}\n`);
export const warn = (msg: string): void =>
  void console.log(`${C.yellow("[warn]")} ${msg}`);
export const err = (msg: string): void =>
  void console.error(`${C.red("[error]")} ${msg}`);
export { C };
