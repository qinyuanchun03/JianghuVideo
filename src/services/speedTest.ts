import { ConfigItem, DeepTestResult } from './maccms';

const TEST_KEYWORDS = ["柯南", "斗破苍穹", "火影", "宝可梦", "瑞克和莫蒂", "海贼王", "进击的巨人"];

// 测速配置
const CONFIG = {
  timeout: 8000, // 8秒超时
  retries: 1,    // 失败重试次数
  testCount: 3,  // 每次测试3个关键词
};

// 权重配置 (可根据需要调整)
const WEIGHTS = {
  searchTime: 0.15,
  detailTime: 0.10,
  streamTime: 0.40,
  successRate: 0.25,
  resultCount: 0.10
};

// 辅助函数：带重试的 fetch
async function fetchWithRetry(url: string, options: RequestInit, retries = CONFIG.retries): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (e) {
    if (retries > 0) return fetchWithRetry(url, options, retries - 1);
    throw e;
  }
}

export async function runDeepTest(source: ConfigItem): Promise<DeepTestResult> {
  let successCount = 0;
  let totalSearchTime = 0;
  let totalDetailTime = 0;
  let totalStreamTime = 0;
  let totalResultCount = 0;
  let validStreamTests = 0;
  
  const keywordsToTest = [...TEST_KEYWORDS].sort(() => 0.5 - Math.random()).slice(0, CONFIG.testCount);

  for (const keyword of keywordsToTest) {
    try {
      // 1. Search Test
      const searchStart = performance.now();
      const searchUrl = new URL(source.url);
      searchUrl.searchParams.set('ac', 'detail');
      searchUrl.searchParams.set('wd', keyword);
      
      const searchRes = await fetchWithRetry(searchUrl.toString(), { signal: AbortSignal.timeout(CONFIG.timeout) });
      const searchData = await searchRes.json();
      const searchTime = performance.now() - searchStart;
      
      if (!searchData.list || searchData.list.length === 0) continue;
      
      totalSearchTime += searchTime;
      totalResultCount += searchData.list.length;
      
      // 2. Detail Test
      const firstVideo = searchData.list[0];
      const detailStart = performance.now();
      const detailUrl = new URL(source.url);
      detailUrl.searchParams.set('ac', 'detail');
      detailUrl.searchParams.set('ids', firstVideo.vod_id.toString());
      
      const detailRes = await fetchWithRetry(detailUrl.toString(), { signal: AbortSignal.timeout(CONFIG.timeout) });
      const detailData = await detailRes.json();
      const detailTime = performance.now() - detailStart;
      
      totalDetailTime += detailTime;
      
      // 3. Stream Test (更严格的校验)
      if (detailData.list?.[0]?.vod_play_url) {
        // 尝试获取第一个可用的播放地址
        const playUrlStr = detailData.list[0].vod_play_url;
        const playUrls = playUrlStr.split('$$$');
        
        for (const group of playUrls) {
          const urls = group.split('#');
          if (urls.length > 0) {
            const firstPlayUrl = urls[0].split('$')[1];
            if (firstPlayUrl?.startsWith('http')) {
              const streamStart = performance.now();
              try {
                // HEAD 请求校验地址有效性
                await fetch(firstPlayUrl, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(CONFIG.timeout) });
                totalStreamTime += (performance.now() - streamStart);
                validStreamTests++;
                break; // 找到一个有效地址即可
              } catch (e) {
                // 继续尝试下一个
              }
            }
          }
        }
      }
      
      successCount++;
    } catch (e) {
      console.warn(`[DeepTest] Source ${source.name} failed for keyword ${keyword}:`, e);
    }
  }

  // 计算评分
  const successRate = (successCount / keywordsToTest.length) * 100;
  
  if (successCount === 0) {
    return { searchTime: 0, detailTime: 0, streamTime: 0, successRate: 0, resultCount: 0, score: 0, lastTested: Date.now() };
  }

  const avgSearchTime = totalSearchTime / successCount;
  const avgDetailTime = totalDetailTime / successCount;
  const avgStreamTime = validStreamTests > 0 ? totalStreamTime / validStreamTests : 8000;
  const avgResultCount = totalResultCount / successCount;

  // 评分算法：归一化并加权
  const searchScore = Math.max(0, 100 - (avgSearchTime / 4000) * 100);
  const detailScore = Math.max(0, 100 - (avgDetailTime / 3000) * 100);
  const streamScore = Math.max(0, 100 - (avgStreamTime / 6000) * 100);
  const resultScore = Math.min(100, (avgResultCount / 10) * 100); // 10个结果即满分

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
