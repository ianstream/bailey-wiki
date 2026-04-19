import path from 'node:path';

export function parseImports(content: string, ext: string): string[] {
  const imports = new Set<string>();

  if (ext === '.kt' || ext === '.java') {
    const importRegex = /^import\s+([\w.]+)/gm;
    for (const match of content.matchAll(importRegex)) {
      const parts = match[1].split('.');
      imports.add(parts[parts.length - 1]);
    }
  } else if (['.ts', '.tsx', '.js'].includes(ext)) {
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(importRegex)) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue;
      const base = path.basename(importPath).replace(/\.[^.]+$/, '');
      if (base && base !== 'index') imports.add(base);
    }
    const typeRegex = /import\s+(?:type\s+)?(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    for (const match of content.matchAll(typeRegex)) {
      const importPath = match[1];
      if (!importPath.startsWith('.')) continue;
      const base = path.basename(importPath).replace(/\.[^.]+$/, '');
      if (base && base !== 'index') imports.add(base);
    }
  }

  return [...imports];
}
