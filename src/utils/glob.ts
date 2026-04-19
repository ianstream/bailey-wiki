export function matchesGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "§§")
        .replace(/\*/g, "[^/]*")
        .replace(/§§/g, ".*")
        + "$"
    );
    return regex.test(filePath);
  });
}
