import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrief, todayInShanghai } from '../lib/bestblogs.js';
import { GET } from '../api/brief.js';

test('shared response contains article data and excludes account credentials and internal ranking', () => {
  const result=normalizeBrief({ briefDate:'2026-10-29',ownerNickName:'Example',shareToken:'private',editorIntro:'早上好，Example，这是为你精选的今日早报。 今日导读',contentItems:[{resourceId:'a',title:'Article',weightedScore:150,selectionReason:'private profile',deepRead:true}] },[{id:'a',summary:'Summary',url:'https://example.com',score:91}]);
  assert.equal(result.intro,'今日导读');
  assert.equal(result.items[0].summary,'Summary');
  assert.equal(result.items[0].score,91);
  assert.equal(result.items[0].url,'https://example.com');
  assert.equal(result.items[0].deepRead,true);
  assert.doesNotMatch(JSON.stringify(result),/private|Example|weightedScore|selectionReason|shareToken/);
});

test('invalid dates fail without an upstream request', async () => {
  const response=await GET(new Request('https://brief.example/api/brief?date=not-a-date'));
  assert.equal(response.status,400);
  assert.equal(response.headers.get('cache-control'),'no-store');
});

test('simultaneous visitors share one upstream sync and the browser never gets the API key', async () => {
  const originalFetch=globalThis.fetch;
  process.env.BESTBLOGS_API_KEY='test-only-secret';
  let calls=0;
  const date=todayInShanghai();
  const brief={ briefDate:date,status:'COMPLETED',contentItems:[{resourceId:'a',title:'Article'}] };
  globalThis.fetch=async(url,options)=>{
    calls++;
    assert.equal(options.headers['X-API-KEY'],'test-only-secret');
    const data=url.includes('/history')?[brief]:url.includes('/batch-meta')?[{id:'a',url:'https://example.com',summary:'Summary'}]:brief;
    return Response.json({success:true,data});
  };
  try {
    const responses=await Promise.all([GET(new Request('https://brief.example/api/brief')),GET(new Request('https://brief.example/api/brief'))]);
    for(const response of responses){assert.equal(response.status,200);assert.doesNotMatch(await response.text(),/test-only-secret|X-API-KEY/);}
    assert.equal(calls,3);
    await GET(new Request('https://brief.example/api/brief'));
    assert.equal(calls,3);
  } finally { globalThis.fetch=originalFetch; delete process.env.BESTBLOGS_API_KEY; }
});
