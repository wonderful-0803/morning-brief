const BASE = 'https://api.bestblogs.dev/openapi/v2';
const TTL = 30 * 60 * 1000;
const cache = new Map();
const pending = new Map();

export class BriefError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

async function cached(key, fn) {
  const previous = cache.get(key);
  if (previous && previous.until > Date.now()) return previous.value;
  if (pending.has(key)) return pending.get(key);
  const promise = fn().then(value => {
    cache.set(key, { value, until: Date.now() + TTL });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

async function api(path, body) {
  const key = process.env.BESTBLOGS_API_KEY;
  if (!key) throw new BriefError('早报同步尚未配置，请联系网站维护者。', 503);
  const response = await fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-API-KEY': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const message = response.status === 429 ? '今日同步额度已用完，请稍后再试。'
      : response.status === 401 ? '早报同步凭证已失效，请联系网站维护者。'
      : response.status === 403 ? '当前 BestBlogs 账号无法读取个性化早报，请检查 Pro 订阅。'
      : 'BestBlogs 暂时没有返回早报，请稍后重试。';
    throw new BriefError(message, response.status === 404 ? 404 : 502);
  }
  const result = await response.json();
  if (result.success !== true) throw new BriefError('BestBlogs 同步暂时不可用，请稍后重试。');
  return result.data;
}

export function todayInShanghai() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export async function history() {
  return cached('history:' + todayInShanghai(), async () => {
    const result = await api('/me/briefs/history?page=1&pageSize=30');
    return (Array.isArray(result) ? result : result?.dataList || []).filter(x => x.briefDate && ['COMPLETED', 'PUBLISHED'].includes(x.status));
  });
}

export function normalizeBrief(brief, metadata = []) {
  const byId = new Map(metadata.map(item => [item.id, item]));
  return {
    date: brief.briefDate,
    intro: (brief.editorIntro || '').replace(/^早上好[，,][^，,。]+[，,]这是为你精选的今日早报[。.]?\s*/, ''),
    keywords: brief.keywords || [],
    title: (brief.podcastTitle || '').replace(/^.+?的今日精选\s*[·｜|]\s*/, ''),
    audioUrl: brief.audioUrl || null,
    duration: brief.durationInSeconds || null,
    items: (brief.contentItems || []).map(item => {
      const meta = byId.get(item.resourceId) || {};
      return {
        id: item.resourceId,
        title: item.title || meta.title || '未命名内容',
        summary: meta.oneSentenceSummary || meta.summary || item.summary || '',
        fullSummary: meta.summary || item.summary || '',
        source: item.sourceName || meta.sourceName || '',
        type: meta.resourceType || item.contentType || 'ARTICLE',
        category: meta.categoryDesc || '',
        language: item.language || meta.language || '',
        score: meta.score ?? item.totalScore ?? item.score ?? null,
        readTime: meta.readTime || null,
        cover: meta.cover || item.cover || '',
        url: meta.url || item.url || '',
        readUrl: meta.readUrl || item.readUrl || '',
        tags: meta.tags || [],
        deepRead: Boolean(item.deepRead),
        featured: Boolean(item.featured),
        points: (meta.mainPoints || []).map(x => ({ title: x.point || x.title || '', text: x.explanation || x.content || '' })),
      };
    }),
  };
}

export async function getBrief(date) {
  const today = todayInShanghai();
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today)) throw new BriefError('请选择有效的早报日期。', 400);
  return cached('brief:' + (date || today), async () => {
    const records = await history();
    let brief;
    if (!date || date === today) {
      brief = await api('/me/briefs/today');
      if (!brief?.contentItems?.length || !['COMPLETED', 'PUBLISHED'].includes(brief.status)) brief = records[0];
    } else brief = records.find(x => x.briefDate === date);
    if (!brief) throw new BriefError('这个日期还没有早报。', 404);
    if (!brief.contentItems?.length) throw new BriefError('这份历史早报暂时无法读取内容。', 404);
    const ids = brief.contentItems.map(item => item.resourceId).filter(Boolean);
    const result = await cached('meta:' + brief.briefDate, () => api('/resources/batch-meta', { ids, language: 'zh_CN' }));
    const metadata = Array.isArray(result) ? result : result?.dataList || [];
    return {
      brief: normalizeBrief(brief, metadata),
      dates: [...new Set([brief.briefDate, ...records.map(x => x.briefDate)])].sort().reverse(),
      syncedAt: new Date().toISOString(),
    };
  });
}
