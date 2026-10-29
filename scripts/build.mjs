import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('web', 'dist', { recursive: true });
await writeFile('dist/config.json', JSON.stringify({ mode: process.env.BRIEF_MODE === 'static' ? 'static' : 'live' }));
await writeFile('dist/.nojekyll', '');
console.log('Built static assets in dist/');
