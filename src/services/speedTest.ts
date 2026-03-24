import { ConfigItem, DeepTestResult } from './maccms';

const TEST_KEYWORDS = ["柯南", "斗破苍穹", "火影", "宝可梦", "瑞克和莫蒂"];

// Weights inspired by yingsu
const WEIGHTS = {
  searchTime: 0.10,
  detailTime: 0.05,
  streamTime: 0.50,
  successRate: 0.20,
  resultCount: 0.15
};

export async function runDeepTest(source: ConfigItem): Promise<DeepTestResult> {
  let successCount = 0;
  let totalSearchTime = 0;
  let totalDetailTime = 0;
  let totalStreamTime = 0;
  let totalResultCount = 0;
  let validStreamTests = 0;
  
  const testCount = 2; // Test 2 random keywords to save time in browser
  const keywordsToTest = [...TEST_KEYWORDS].sort(() => 0.5 - Math.random()).slice(0, testCount);

  for (const keyword of keywordsToTest) {
    try {
      // 1. Search Test
      const searchStart = performance.now();
      const searchUrl = new URL(source.url);
      searchUrl.searchParams.set('ac', 'detail');
      searchUrl.searchParams.set('wd', keyword);
      
      const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(10000) });
      const searchData = await searchRes.json();
      const searchTime = performance.now() - searchStart;
      
      if (!searchData.list || searchData.list.length === 0) {
        continue; // No results, but not a failure of the API itself
      }
      
      totalSearchTime += searchTime;
      totalResultCount += searchData.list.length;
      
      // 2. Detail Test (using the first result)
      const firstVideo = searchData.list[0];
      const detailStart = performance.now();
      const detailUrl = new URL(source.url);
      detailUrl.searchParams.set('ac', 'detail');
      detailUrl.searchParams.set('ids', firstVideo.vod_id.toString());
      
      const detailRes = await fetch(detailUrl.toString(), { signal: AbortSignal.timeout(10000) });
      const detailData = await detailRes.json();
      const detailTime = performance.now() - detailStart;
      
      totalDetailTime += detailTime;
      
      // 3. Stream Test
      if (detailData.list && detailData.list[0] && detailData.list[0].vod_play_url) {
        const playUrls = detailData.list[0].vod_play_url.split('$$$')[0].split('#');
        if (playUrls.length > 0) {
          const firstPlayUrl = playUrls[0].split('$')[1];
          if (firstPlayUrl && firstPlayUrl.startsWith('http')) {
            const streamStart = performance.now();
            try {
              // We use no-cors because m3u8 files are often on different domains without CORS headers
              // We just want to measure the time it takes to get a response (or fail)
              await fetch(firstPlayUrl, { mode: 'no-cors', signal: AbortSignal.timeout(10000) });
              const streamTime = performance.now() - streamStart;
              totalStreamTime += streamTime;
              validStreamTests++;
            } catch (e) {
              // Stream fetch failed
            }
          }
        }
      }
      
      successCount++;
    } catch (e) {
      // Request failed
    }
  }

  const successRate = (successCount / testCount) * 100;
  
  if (successCount === 0) {
    return {
      searchTime: 0, detailTime: 0, streamTime: 0, successRate: 0, resultCount: 0, score: 0, lastTested: Date.now()
    };
  }

  const avgSearchTime = totalSearchTime / successCount;
  const avgDetailTime = totalDetailTime / successCount;
  const avgStreamTime = validStreamTests > 0 ? totalStreamTime / validStreamTests : 5000; // Penalty if no stream
  const avgResultCount = totalResultCount / successCount;

  // Calculate Score (0-100)
  // Lower time is better. 
  // Max expected times: search 3000ms, detail 2000ms, stream 5000ms
  const searchScore = Math.max(0, 100 - (avgSearchTime / 3000) * 100);
  const detailScore = Math.max(0, 100 - (avgDetailTime / 2000) * 100);
  const streamScore = Math.max(0, 100 - (avgStreamTime / 5000) * 100);
  const resultScore = Math.min(100, (avgResultCount / 20) * 100); // 20 results is good

  const finalScore = 
    (searchScore * WEIGHTS.searchTime) +
    (detailScore * WEIGHTS.detailTime) +
    (streamScore * WEIGHTS.streamTime) +
    (successRate * WEIGHTS.successRate) +
    (resultScore * WEIGHTS.resultCount);

  return {
    searchTime: Math.round(avgSearchTime),
    detailTime: Math.round(avgDetailTime),
    streamTime: Math.round(avgStreamTime),
    successRate: Math.round(successRate),
    resultCount: Math.round(avgResultCount),
    score: Math.round(finalScore),
    lastTested: Date.now()
  };
}
