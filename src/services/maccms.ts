import { MacCMSResponse, PlaySource } from '../types';

export interface ConfigItem {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_SOURCES: ConfigItem[] = [
  { id: 'default', name: 'ikunzy (默认)', url: 'https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json' }
];

const DEFAULT_CORS: ConfigItem[] = [
  { id: 'default', name: 'Takao CORS (默认)', url: 'https://cros.takaosakuma.dpdns.org/?url=' },
  { id: 'none', name: '直连 (无代理)', url: '' }
];

const DEFAULT_PLAYERS: ConfigItem[] = [
  { id: 'default', name: '内置 DPlayer/HLS', url: '' }
];

export const getSources = (): ConfigItem[] => {
  const saved = localStorage.getItem('maccms_sources');
  return saved ? JSON.parse(saved) : DEFAULT_SOURCES;
};
export const setSources = (sources: ConfigItem[]) => localStorage.setItem('maccms_sources', JSON.stringify(sources));
export const getActiveSourceId = () => localStorage.getItem('maccms_active_source_id') || 'default';
export const setActiveSourceId = (id: string) => localStorage.setItem('maccms_active_source_id', id);

export const getApiUrl = () => {
  const legacy = localStorage.getItem('maccms_api_url');
  if (legacy && !localStorage.getItem('maccms_sources')) return legacy;
  const sources = getSources();
  const active = sources.find(s => s.id === getActiveSourceId()) || sources[0];
  return active ? active.url : DEFAULT_SOURCES[0].url;
};

export const getCorsProxies = (): ConfigItem[] => {
  const saved = localStorage.getItem('maccms_cors_proxies');
  return saved ? JSON.parse(saved) : DEFAULT_CORS;
};
export const setCorsProxies = (proxies: ConfigItem[]) => localStorage.setItem('maccms_cors_proxies', JSON.stringify(proxies));
export const getActiveCorsId = () => localStorage.getItem('maccms_active_cors_id') || 'default';
export const setActiveCorsId = (id: string) => localStorage.setItem('maccms_active_cors_id', id);

export const getCorsProxyUrl = () => {
  const legacy = localStorage.getItem('cors_proxy_url');
  if (legacy !== null && !localStorage.getItem('maccms_cors_proxies')) return legacy;
  const proxies = getCorsProxies();
  const active = proxies.find(p => p.id === getActiveCorsId()) || proxies[0];
  return active ? active.url : '';
};

export const getPlayers = (): ConfigItem[] => {
  const saved = localStorage.getItem('maccms_players');
  return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
};
export const setPlayers = (players: ConfigItem[]) => localStorage.setItem('maccms_players', JSON.stringify(players));
export const getActivePlayerId = () => localStorage.getItem('maccms_active_player_id') || 'default';
export const setActivePlayerId = (id: string) => localStorage.setItem('maccms_active_player_id', id);

export const getCustomPlayerUrl = () => {
  const legacy = localStorage.getItem('custom_player_url');
  if (legacy !== null && !localStorage.getItem('maccms_players')) return legacy;
  const players = getPlayers();
  const active = players.find(p => p.id === getActivePlayerId()) || players[0];
  return active ? active.url : '';
};

export async function fetchMacCMS(params: Record<string, string | number>): Promise<MacCMSResponse> {
  let baseUrl = getApiUrl();
  if (!baseUrl) {
    throw new Error('未配置 API 接口地址');
  }

  // Force JSON format if the user entered an XML URL
  if (baseUrl.includes('/at/xml')) {
    baseUrl = baseUrl.replace('/at/xml', '/at/json');
  }

  const targetUrl = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    targetUrl.searchParams.append(key, String(value));
  });

  // 使用用户提供的 CORS 代理
  const corsProxy = getCorsProxyUrl();
  const proxyUrl = corsProxy ? `${corsProxy}${encodeURIComponent(targetUrl.toString())}` : targetUrl.toString();

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    let errorMessage = `请求失败: ${response.status}`;
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

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('接口返回的数据格式不正确，请确保接口支持 JSON 格式输出 (例如在地址末尾加上 /at/json)');
  }

  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

export async function getCategories(): Promise<MacCMSResponse['class']> {
  const data = await fetchMacCMS({ ac: 'list' });
  return data.class;
}

export async function getVideos(page = 1, type_id?: number, wd?: string): Promise<MacCMSResponse> {
  const params: Record<string, string | number> = { ac: 'detail', pg: page };
  if (type_id) params.t = type_id;
  if (wd) params.wd = wd;
  return fetchMacCMS(params);
}

export async function getVideoDetail(id: number): Promise<MacCMSResponse['list'][0]> {
  const data = await fetchMacCMS({ ac: 'detail', ids: id });
  if (!data.list || data.list.length === 0) {
    throw new Error('未找到该影片');
  }
  return data.list[0];
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
