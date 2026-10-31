/**
 * Guards for the ticket design system.
 *
 * Each row is a pattern that made the interface look templated and was removed
 * on purpose. The scan runs over source files, so a pattern coming back fails
 * here with the file and line instead of slipping through review.
 */

type Dirent = { name: string; isDirectory(): boolean };
type Fs = {
  existsSync(path: string): boolean;
  statSync(path: string): { isFile(): boolean };
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
};
type Path = {
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
};

declare const require: (id: string) => unknown;
declare const __dirname: string;

const fs = require('fs') as Fs;
const path = require('path') as Path;

type Guard = { name: string; pattern: RegExp; roots: string[] };

const GUARDS: Guard[] = [
  {
    name: 'no Inter bold or light',
    pattern: /Inter_(700Bold|300Light)|fonts\.(bold|light)\b/,
    roots: ['app', 'src'],
  },
  {
    name: 'no Pressable style functions (NativeWind drops them on device)',
    pattern: /style=\{\(\{ pressed/,
    roots: ['app', 'src/components'],
  },
  { name: 'no ReceiptCard', pattern: /ReceiptCard/, roots: ['app', 'src'] },
  {
    name: 'no emoji in UI',
    pattern: /\p{Extended_Pictographic}/u,
    roots: ['app/receipt', 'src/components/receipt'],
  },
];

const ROOT = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [absolute];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__' || entry.name === 'node_modules') return [];
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.(ts|tsx)$/.test(entry.name) ? [path.join(ROOT, child)] : [];
  });
}

function matches(guard: Guard): string[] {
  return guard.roots.flatMap(sourceFiles).flatMap((file) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        guard.pattern.test(line) ? [`${path.relative(ROOT, file)}:${index + 1}`] : []
      )
  );
}

describe('design guards', () => {
  it.each(GUARDS.map((guard) => [guard.name, guard] as const))('%s', (_name, guard) => {
    expect(matches(guard)).toEqual([]);
  });
});
