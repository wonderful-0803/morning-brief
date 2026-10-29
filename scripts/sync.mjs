import { writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { getBrief, history } from '../lib/bestblogs.js';
const folder = 'web/data';
await mkdir(folder, { recursive: true });
const latest = await getBrief();
await writeFile(`${folder}/${latest.brief.date}.json`, JSON.stringify(latest));
for (const brief of await history()) {
  if (brief.briefDate === latest.brief.date) continue;
  const file = `${folder}/${brief.briefDate}.json`;
  try { await access(file); continue; } catch {}
  try {
    const payload = await getBrief(brief.briefDate);
    await writeFile(file, JSON.stringify(payload));
    console.log(`Archived ${brief.briefDate}: ${payload.brief.items.length} items.`);
  } catch (error) { console.warn(`Skipped archive ${brief.briefDate}: ${error.message}`); }
}
const dates = (await readdir(folder)).filter(x => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).map(x => x.slice(0, 10)).sort().reverse();
latest.dates = dates;
await writeFile('web/briefs.json', JSON.stringify(latest));
console.log(`Synced ${latest.brief.date}: ${latest.brief.items.length} items; ${dates.length} editions. No credentials included.`);
