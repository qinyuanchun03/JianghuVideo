export interface MacCMSVideo {
  vod_id: number;
  type_id: number;
  type_name: string;
  vod_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_play_url: string;
  vod_pic: string;
  vod_content?: string;
  vod_year?: string;
  vod_area?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_class?: string;
  vod_score?: string;
  source_id?: string;
  source_name?: string;
}

export interface MacCMSCategory {
  type_id: number;
  type_name: string;
}

export interface MacCMSResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: number;
  total: number;
  list: MacCMSVideo[];
  class?: MacCMSCategory[];
  _ping?: number;
}

export interface Episode {
  name: string;
  url: string;
}

export interface PlaySource {
  sourceName: string;
  episodes: Episode[];
}
