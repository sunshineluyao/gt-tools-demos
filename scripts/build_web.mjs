import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web');
const destination = path.join(root, 'dist');

const required = ['index.html', 'styles.css', 'logic.js', 'auction-logic.js', 'app.js'];
for (const name of required) {
  await readFile(path.join(source, name), 'utf8');
}

const html = await readFile(path.join(source, 'index.html'), 'utf8');
for (const marker of ['Strategic Thinking', 'Auctions and Digital Markets', 'Interdisciplinary Contribution', 'Three Research Personas']) {
  if (!html.includes(marker)) throw new Error(`Missing tutorial marker: ${marker}`);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log(`Built dependency-free site: ${path.relative(root, destination)}/`);
