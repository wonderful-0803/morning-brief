import { getBrief, BriefError } from '../lib/bestblogs.js';

export async function GET(request) {
  try {
    const date = new URL(request.url).searchParams.get('date') || undefined;
    const payload = await getBrief(date);
    return Response.json(payload, { headers: { 'Cache-Control': 'public, max-age=120, s-maxage=1800, stale-while-revalidate=300', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    return Response.json({ error: error instanceof BriefError ? error.message : '暂时无法同步早报，请稍后重试。' }, { status: error instanceof BriefError ? error.status : 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
