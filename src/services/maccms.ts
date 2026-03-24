import { MacCMSResponse, PlaySource, MacCMSVideo } from '../types';
import { storage } from '../utils/storage';

// Simple Rate Limiter for CORS requests
class RateLimiter {
  private queue: (() => void)[] = [];
  private activeCount = 0;
  private lastRequestTime = 0;
  private readonly minInterval = 200; // 200ms between requests
  private readonly maxConcurrent = 3; // Max 3 concurrent requests

  async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      const now = Date.now();
      const waitTime = Math.max(0, this.lastRequestTime + this.minInterval - now);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.activeCount++;
      this.lastRequestTime = Date.now();
      return;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.activeCount--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        setTimeout(async () => {
          const now = Date.now();
          const waitTime = Math.max(0, this.lastRequestTime + this.minInterval - now);
          if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
          
          this.activeCount++;
          this.lastRequestTime = Date.now();
          next();
        }, 0);
      }
    }
  }
}

const limiter = new RateLimiter();

export interface DeepTestResult {
  searchTime: number;
  detailTime: number;
  streamTime: number;
  successRate: number;
  resultCount: number;
  score: number;
  lastTested: number;
}

export interface ConfigItem {
  id: string;
  name: string;
  url: string;
  deepTestResult?: DeepTestResult;
}

const DEFAULT_SOURCES: ConfigItem[] = [
  { id: 'dbzy', name: '🎬豆瓣资源', url: 'https://caiji.dbzy5.com/api.php/provide/vod/at/json' },
  { id: 'wolongzywcom', name: '🎬卧龙资源', url: 'https://wolongzyw.com/api.php/provide/vod/at/json' },
  { id: 'iqiyizyapi', name: '🎬-爱奇艺-', url: 'https://iqiyizyapi.com/api.php/provide/vod/at/json' },
  { id: 'tyyszy', name: '🎬天涯影视', url: 'https://tyyszy.com/api.php/provide/vod/at/json' },
  { id: 'mtzyme', name: '🎬茅台资源', url: 'https://caiji.maotaizy.cc/api.php/provide/vod/at/json' },
  { id: 'ikunzycom', name: '🎬iKun资源', url: 'https://ikunzyapi.com/api.php/provide/vod/at/json' },
  { id: 'dyttzyapicom', name: '🎬电影天堂', url: 'http://caiji.dyttzyapi.com/api.php/provide/vod/at/json' },
  { id: 'wwwmaoyanzycom', name: '🎬猫眼资源', url: 'https://api.maoyanapi.top/api.php/provide/vod/at/json' },
  { id: 'cjlzcaijicom', name: '🎬量子资源', url: 'https://cj.lzcaiji.com/api.php/provide/vod/at/json' },
  { id: '360zycom', name: '🎬360 资源', url: 'https://360zy.com/api.php/provide/vod/at/json' },
  { id: 'jszyapicom', name: '🎬极速资源', url: 'https://jszyapi.com/api.php/provide/vod/at/json' },
  { id: 'wwwmoduzynet', name: '🎬魔都资源', url: 'https://www.mdzyapi.com/api.php/provide/vod/at/json' },
  { id: 'ffzyapicom', name: '🎬非凡资源', url: 'https://api.ffzyapi.com/api.php/provide/vod/at/json' },
  { id: 'bfzytv', name: '🎬暴风资源', url: 'https://bfzyapi.com/api.php/provide/vod/at/json' },
  { id: 'zuidaxyz', name: '🎬最大资源', url: 'https://api.zuidapi.com/api.php/provide/vod/at/json' },
  { id: 'wujinzyme', name: '🎬无尽资源', url: 'https://api.wujinapi.me/api.php/provide/vod/at/json' },
  { id: 'xinlangapicom', name: '🎬新浪资源', url: 'https://api.xinlangapi.com/xinlangapi.php/provide/vod/at/json' },
  { id: 'apiwwzytv', name: '🎬旺旺资源', url: 'https://api.wwzy.tv/api.php/provide/vod/at/json' },
  { id: 'wwwsubozycom', name: '🎬速播资源', url: 'https://subocaiji.com/api.php/provide/vod/at/json' },
  { id: 'jinyingzycom', name: '🎬金鹰点播', url: 'https://jinyingzy.com/api.php/provide/vod/at/json' },
  { id: 'p2100net', name: '🎬飘零资源', url: 'https://p2100.net/api.php/provide/vod/at/json' },
  { id: 'apiukuapi88com', name: '🎬U酷影视', url: 'https://api.ukuapi88.com/api.php/provide/vod/at/json' },
  { id: 'apiguangsuapicom', name: '🎬光速资源', url: 'https://api.guangsuapi.com/api.php/provide/vod/at/json' },
  { id: 'wwwhongniuzycom', name: '🎬红牛资源', url: 'https://www.hongniuzy2.com/api.php/provide/vod/at/json' },
  { id: 'caijimoduapicc', name: '🎬魔都动漫', url: 'https://caiji.moduapi.cc/api.php/provide/vod/at/json' },
  { id: 'wwwryzywcom', name: '🎬如意资源', url: 'https://cj.rycjapi.com/api.php/provide/vod/at/json' },
  { id: 'wwwhaohuazycom', name: '🎬豪华资源', url: 'https://hhzyapi.com/api.php/provide/vod/at/json' },
  { id: 'bdzy1com', name: '🎬百度云zy', url: 'https://api.apibdzy.com/api.php/provide/vod/at/json' },
  { id: 'lovedannet', name: '🎬艾旦影视', url: 'https://lovedan.net/api.php/provide/vod/at/json' },
  { id: '91mdme', name: '🔞麻豆视频', url: 'https://91md.me/api.php/provide/vod/at/json' },
  { id: '91jpzywcom', name: '🔞91-精品-', url: 'https://91jpzyw.com/api.php/provide/vod/at/json' },
  { id: 'lbapibycom', name: '🔞--AIvin-', url: 'http://lbapiby.com/api.php/provide/vod/at/json' },
  { id: 'apibwzym3u8com', name: '🔞百万资源', url: 'https://api.bwzyz.com/api.php/provide/vod/at/json' },
  { id: 'apisouavzyvip', name: '🔞souavZY', url: 'https://api.souavzy.vip/api.php/provide/vod/at/json' },
  { id: '155zy2com', name: '🔞155-资源', url: 'https://155api.com/api.php/provide/vod/at/json' },
  { id: 'apiyutu.com', name: '🔞玉兔资源', url: 'https://apiyutu.com/api.php/provide/vod/at/json' },
  { id: 'fhapi9com', name: '🔞番号资源', url: 'http://fhapi9.com/api.php/provide/vod/at/json' },
  { id: 'wwwjingpinxcom', name: '🔞精品资源', url: 'https://www.jingpinx.com/api.php/provide/vod/at/json' },
  { id: 'apilsbzy1com', name: '🔞-老色逼-', url: 'https://apilsbzy1.com/api.php/provide/vod/at/json' },
  { id: 'thzy8me', name: '🔞桃花资源', url: 'https://thzy1.me/api.php/provide/vod/at/json' },
  { id: 'wwwyyzywcjcom', name: '🔞优优资源', url: 'https://www.yyzywcj.com/api.php/provide/vod/at/json' },
  { id: 'xiaojizylive', name: '🔞小鸡资源', url: 'https://api.xiaojizy.live/provide/vod/at/json' },
  { id: 'hsckzyxyz', name: '🔞黄色仓库', url: 'https://hsckzy.xyz/api.php/provide/vod/at/json' },
  { id: 'apidanaizicom', name: '🔞-大奶子-', url: 'https://apidanaizi.com/api.php/provide/vod/at/json' },
  { id: 'jkunzyapicom', name: '🔞jkun资源', url: 'https://jkunzyapi.com/api.php/provide/vod/at/json' },
  { id: 'lbapi9com', name: '🔞乐播资源', url: 'https://lbapi9.com/api.php/provide/vod/at/json' },
  { id: 'Naixxzycom', name: '🔞奶香资源', url: 'https://Naixxzy.com/api.php/provide/vod/at/json' },
  { id: 'slapibf', name: '🔞森林资源', url: 'https://beiyong.slapibf.com/api.php/provide/vod/at/json' },
  { id: 'apilj', name: '🔞辣椒资源', url: 'https://apilj.com/api.php/provide/vod/at/json' },
  { id: 'shayuapi', name: '🔞鲨鱼资源', url: 'https://shayuapi.com/api.php/provide/vod/at/json' },
  { id: 'xzytv', name: '🔞-幸资源-', url: 'https://xzybb2.com/api.php/provide/vod/at/json' },
  { id: 'doudouzy', name: '🔞豆豆资源', url: 'https://api.douapi.cc/api.php/provide/vod/at/json' },
  { id: 'didizycom', name: '🔞滴滴资源', url: 'https://api.ddapi.cc/api.php/provide/vod/at/json' },
  { id: 'heiliaozy', name: '🔞黑料资源', url: 'https://www.heiliaozyapi.com/api.php/provide/vod/at/json' },
  { id: 'testSource', name: '空内容测试源', url: 'https://www.example.com/api.php/provide/vod/at/json' }
];

const LITE_SOURCES: ConfigItem[] = DEFAULT_SOURCES.slice(0, 10);
// Add testSource if it exists
const testSource = DEFAULT_SOURCES.find(s => s.id === 'testSource');
if (testSource) LITE_SOURCES.push(testSource);

const DEFAULT_CORS: ConfigItem[] = [
  { id: 'default', name: '内置代理 (推荐)', url: 'https://video-api.250221.xyz/?url=' },
  { id: 'none', name: '直连 (无代理)', url: '' }
];

const DEFAULT_PLAYERS: ConfigItem[] = [
  { id: 'default', name: 'iKun 播放器 (默认)', url: 'https://www.ikundmjx.com/?url=' },
  { id: 'dbzy99', name: 'DBZY99 播放器', url: 'https://dbzy99.com:699/?url=' },
  { id: 'dplayer', name: '内置 DPlayer/HLS', url: '' }
];

export const getSources = (): ConfigItem[] => {
  const saved = storage.get('maccms_sources');
  // Return empty array if no custom sources saved, so Settings starts clean
  return Array.isArray(saved) ? saved : [];
};

export const getEffectiveSources = (): ConfigItem[] => {
  const sources = getSources();
  const useFull = storage.get('maccms_use_full_sources') === true;
  const baseSources = (Array.isArray(sources) && sources.length > 0) ? sources : (useFull ? DEFAULT_SOURCES : LITE_SOURCES);
  
  // Migration: Fix mangled URLs that have &at=json without a ?
  return baseSources.map(s => {
    if (s.url.includes('&at=json') && !s.url.includes('?')) {
      return { ...s, url: s.url.replace('&at=json', '/at/json') };
    }
    // Also fix double query markers if any
    if (s.url.includes('?at=json?')) {
      return { ...s, url: s.url.replace('?at=json?', '?at=json&') };
    }
    return s;
  });
};

export const setSources = (sources: ConfigItem[]) => {
  storage.set('maccms_sources', sources);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};
export const getActiveSourceId = () => storage.get('maccms_active_source_id') || 'default';
export const setActiveSourceId = (id: string) => {
  storage.set('maccms_active_source_id', id);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};

export const getApiUrl = (sourceId?: string) => {
  const sources = getEffectiveSources();
  if (sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (source) return source.url;
  }
  const active = sources.find(s => s.id === getActiveSourceId()) || sources[0];
  return active ? active.url : DEFAULT_SOURCES[0].url;
};

export const getCorsProxies = (): ConfigItem[] => {
  const saved = storage.get('maccms_cors_proxies');
  if (!Array.isArray(saved)) return DEFAULT_CORS;
  
  try {
    const proxies: ConfigItem[] = saved;
    // Migration: remove failing Takao proxy and update default if needed
    return proxies
      .filter(p => p.id !== 'takao')
      .map(p => {
        if (p.id === 'default' && (p.url.includes('takaosakuma.dpdns.org') || p.url === '/api/proxy?url=' || !p.url)) {
          return DEFAULT_CORS[0];
        }
        return p;
      });
  } catch (e) {
    return DEFAULT_CORS;
  }
};
export const setCorsProxies = (proxies: ConfigItem[]) => {
  storage.set('maccms_cors_proxies', proxies);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};
export const getActiveCorsId = () => storage.get('maccms_active_cors_id') || 'default';
export const setActiveCorsId = (id: string) => {
  storage.set('maccms_active_cors_id', id);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};

export const getCorsProxyUrl = () => {
  const legacy = storage.get('cors_proxy_url');
  if (legacy !== null && !storage.get('maccms_cors_proxies')) return legacy;
  const proxies = getCorsProxies();
  const active = proxies.find(p => p.id === getActiveCorsId()) || proxies[0];
  return active ? active.url : '';
};

export const getPlayers = (): ConfigItem[] => {
  const saved = storage.get('maccms_players');
  if (!Array.isArray(saved)) return DEFAULT_PLAYERS;
  
  // Migration: Swap default and ikun URLs so default is ikun
  const players = saved.map(p => {
    if (p.id === 'default' && (p.url === '' || !p.url)) {
      return { ...p, name: 'iKun 播放器 (默认)', url: 'https://www.ikundmjx.com/?url=' };
    }
    if (p.id === 'ikun' && p.url === 'https://www.ikundmjx.com/?url=') {
      return { ...p, id: 'dplayer', name: '内置 DPlayer/HLS', url: '' };
    }
    return p;
  });

  // Inject dbzy99 if missing
  if (!players.find(p => p.id === 'dbzy99')) {
    const dbzy99 = DEFAULT_PLAYERS.find(p => p.id === 'dbzy99');
    if (dbzy99) {
      players.splice(1, 0, dbzy99);
    }
  }

  return players;
};
export const setPlayers = (players: ConfigItem[]) => {
  storage.set('maccms_players', players);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};
export const getActivePlayerId = () => storage.get('maccms_active_player_id') || 'default';
export const setActivePlayerId = (id: string) => {
  storage.set('maccms_active_player_id', id);
  window.dispatchEvent(new Event('maccms_settings_changed'));
};

export const getCustomPlayerUrl = () => {
  const legacy = storage.get('custom_player_url');
  if (legacy !== null && !storage.get('maccms_players')) return legacy || null;
  const players = getPlayers();
  const active = players.find(p => p.id === getActivePlayerId()) || players[0];
  return (active && active.url) ? active.url : null;
};

export async function fetchMacCMS(params: Record<string, string | number>, sourceId?: string, signal?: AbortSignal): Promise<MacCMSResponse> {
  await limiter.acquire();
  try {
    return await _fetchMacCMS(params, sourceId, signal);
  } finally {
    limiter.release();
  }
}

async function _fetchMacCMS(params: Record<string, string | number>, sourceId?: string, signal?: AbortSignal): Promise<MacCMSResponse> {
  let baseUrl = getApiUrl(sourceId);
  if (!baseUrl) {
    throw new Error('未配置 API 接口地址');
  }

  // Force JSON format if the user entered an XML URL
  if (baseUrl.includes('/at/xml')) {
    baseUrl = baseUrl.replace('/at/xml', '/at/json');
  }

  // Extract actual API URL if it's wrapped in a proxy (prevents Cloudflare self-fetch loops)
  let actualApiUrl = baseUrl;
  let builtInProxy = '';
  if (baseUrl.includes('?url=')) {
    const parts = baseUrl.split('?url=');
    builtInProxy = parts[0] + '?url=';
    actualApiUrl = decodeURIComponent(parts[1]);
  }

  const targetUrl = new URL(actualApiUrl);
  Object.entries(params).forEach(([key, value]) => {
    targetUrl.searchParams.append(key, String(value));
  });

  // 使用用户提供的 CORS 代理
  const corsProxy = getCorsProxyUrl();
  
  // If a global CORS proxy is set, use it. Otherwise, fallback to the built-in proxy if it existed.
  const proxyToUse = corsProxy || builtInProxy;
  
  let proxyUrl = targetUrl.toString();
  const fallbackProxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  const getFullProxyUrl = (proxy: string, target: string) => {
    if (!proxy) return target;
    // For relative local proxy, we can use it directly or make it absolute
    // Some browsers/environments prefer absolute URLs in certain contexts
    if (proxy.startsWith('/')) {
      const absoluteProxy = `${window.location.origin}${proxy}`;
      return `${absoluteProxy}${encodeURIComponent(target)}`;
    }
    return `${proxy}${encodeURIComponent(target)}`;
  };

  const startTime = performance.now();
  let response;
  let lastError: any;
  const maxRetries = 1; // Try each proxy once

  const tryFetch = async (currentProxy: string) => {
    const finalUrl = getFullProxyUrl(currentProxy, targetUrl.toString());
    return await fetch(finalUrl, { 
      signal,
      headers: {
        'Accept': 'application/json'
      }
    });
  };

  // 1. Try primary proxy (local or user-set)
  try {
    response = await tryFetch(proxyToUse);
    if (!response.ok && response.status >= 500) throw new Error(`Server Error ${response.status}`);
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    console.warn('Primary proxy failed, trying fallbacks...', e);
    
    // 2. Try fallback proxies
    for (const fallback of fallbackProxies) {
      try {
        response = await tryFetch(fallback);
        if (response.ok) break;
      } catch (fe: any) {
        if (fe.name === 'AbortError') throw fe;
        console.warn(`Fallback ${fallback} failed`, fe);
      }
    }
  }

  const endTime = performance.now();
  const clientSidePing = Math.round(endTime - startTime);

  if (!response || !response.ok) {
    const status = response?.status || 'unknown';
    let errorMessage = `网络连接失败 (${status}): 请检查网络或尝试切换代理`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore JSON parse error on error response
    }
    throw new Error(errorMessage);
  }

  // Extract upstream timing if available from our proxy
  const upstreamTimeHeader = response.headers.get('X-Upstream-Time');
  const upstreamPing = upstreamTimeHeader ? parseInt(upstreamTimeHeader, 10) : null;
  
  // Use upstream ping if available (more accurate for site speed), otherwise fallback to client-side
  const finalPing = upstreamPing !== null ? upstreamPing : clientSidePing;

  let data;
  try {
    data = await response.json();
    data._ping = finalPing;
  } catch (e) {
    throw new Error('接口返回的数据格式不正确，请确保接口支持 JSON 格式输出 (例如在地址末尾加上 /at/json)');
  }

  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function pingSource(source: ConfigItem, signal?: AbortSignal): Promise<number> {
  try {
    // Just fetch categories as a lightweight ping
    const res = await fetchMacCMS({ ac: 'list' }, source.id, signal);
    return res._ping || 9999;
  } catch (e) {
    return 9999;
  }
}

export async function findBestSource(): Promise<ConfigItem | null> {
  const sources = getEffectiveSources();
  const results = await Promise.all(sources.map(async (s) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const ping = await pingSource(s, controller.signal);
    clearTimeout(timeoutId);
    return { source: s, ping };
  }));

  const validResults = results.filter(r => r.ping < 9999).sort((a, b) => a.ping - b.ping);
  return validResults.length > 0 ? validResults[0].source : null;
}

export async function getCategories(sourceId?: string): Promise<MacCMSResponse['class']> {
  const data = await fetchMacCMS({ ac: 'list' }, sourceId);
  return data.class;
}

export async function getVideos(page = 1, type_id?: number, wd?: string, sourceId?: string): Promise<MacCMSResponse> {
  const params: Record<string, string | number> = { ac: 'detail', pg: page };
  if (type_id) params.t = type_id;
  if (wd) params.wd = wd;
  const data = await fetchMacCMS(params, sourceId);
  
  // Inject source info
  const currentSourceId = sourceId || getActiveSourceId();
  const sourceName = getEffectiveSources().find(s => s.id === currentSourceId)?.name || '未知源';
  
  if (data.list) {
    data.list = data.list.map(v => ({
      ...v,
      source_id: currentSourceId,
      source_name: sourceName
    }));
  }
  
  return data;
}

export async function getVideoDetail(id: number, sourceId?: string): Promise<MacCMSResponse['list'][0]> {
  const data = await fetchMacCMS({ ac: 'detail', ids: id }, sourceId);
  if (!data.list || data.list.length === 0) {
    throw new Error('未找到该影片');
  }
  
  const currentSourceId = sourceId || getActiveSourceId();
  const sourceName = getEffectiveSources().find(s => s.id === currentSourceId)?.name || '未知源';
  
  return {
    ...data.list[0],
    source_id: currentSourceId,
    source_name: sourceName
  };
}

export async function syncFromLunaTV(sourceType: 'full' | 'jin18' | 'jingjian' = 'full'): Promise<ConfigItem[]> {
  const response = await fetch(`/api/proxy?format=0&source=${sourceType}`);
  if (!response.ok) throw new Error('同步失败');
  
  const config = await response.json();
  if (!config.api_site) throw new Error('配置格式不正确');
  
  const newSources: ConfigItem[] = Object.entries(config.api_site).map(([key, site]: [string, any]) => {
    let url = site.api;
    if (url.includes('?')) {
      // If it already has query params, ensure at=json is there
      if (!url.includes('at=json')) {
        url += '&at=json';
      }
    } else {
      // If it's a path, prefer /at/json
      url += '/at/json';
    }
    
    return {
      id: key.replace(/\./g, '_'),
      name: site.name,
      url: url
    };
  });
  
  return newSources;
}

export async function searchAllSources(wd: string): Promise<{ sourceId: string; sourceName: string; list: MacCMSVideo[], ping: number }[]> {
  const sources = getEffectiveSources();
  
  const promises = sources.map(async (source) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const res = await fetchMacCMS({ ac: 'detail', wd }, source.id, controller.signal);
      const ping = res._ping || 9999;
      clearTimeout(timeoutId);
      
      const list = (res.list || []).map(v => ({
        ...v,
        source_id: source.id,
        source_name: source.name,
        _ping: ping
      }));
      
      return {
        sourceId: source.id,
        sourceName: source.name,
        list,
        ping
      };
    } catch (e) {
      // Ignore errors for individual sources to not break the whole search
      return { sourceId: source.id, sourceName: source.name, list: [], ping: 9999 };
    }
  });

  const results = await Promise.all(promises);
  return results.filter(r => r.list.length > 0).sort((a, b) => {
    const sourceA = sources.find(s => s.id === a.sourceId);
    const sourceB = sources.find(s => s.id === b.sourceId);
    
    const scoreA = sourceA?.deepTestResult?.score;
    const scoreB = sourceB?.deepTestResult?.score;
    
    // If both have scores, sort by score descending
    if (scoreA !== undefined && scoreB !== undefined) {
      return scoreB - scoreA;
    }
    // If only one has a score, prioritize it
    if (scoreA !== undefined) return -1;
    if (scoreB !== undefined) return 1;
    
    // Fallback to ping
    return a.ping - b.ping;
  });
}

export function parsePlayUrls(playFrom: string, playUrl: string): PlaySource[] {
  if (!playFrom || !playUrl) return [];
  
  const sources = playFrom.split('$$$').filter(Boolean);
  const urlGroups = playUrl.split('$$$').filter(Boolean);

  const parsedSources = sources.map((sourceName, index) => {
    const group = urlGroups[index] || '';
    const episodes = group.split('#').filter(Boolean).map(ep => {
      const parts = ep.split('$');
      if (parts.length === 2) {
        return { name: parts[0], url: parts[1] };
      }
      return { name: '正片', url: parts[0] };
    });
    return { sourceName, episodes };
  }).filter(s => s.episodes.length > 0);

  // Prioritize m3u8 sources
  return parsedSources.sort((a, b) => {
    const aIsM3u8 = a.sourceName.toLowerCase().includes('m3u8');
    const bIsM3u8 = b.sourceName.toLowerCase().includes('m3u8');
    if (aIsM3u8 && !bIsM3u8) return -1;
    if (!aIsM3u8 && bIsM3u8) return 1;
    return 0;
  });
}
