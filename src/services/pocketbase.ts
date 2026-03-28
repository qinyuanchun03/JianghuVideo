import PocketBase, { LocalAuthStore } from 'pocketbase';

const pbUrl = (import.meta as any).env.VITE_POCKETBASE_URL || 'https://api-serv.250221.xyz';
export const pb = new PocketBase(pbUrl, new LocalAuthStore('pb_auth'));

// Types for PocketBase collections
export interface HistoryRecord {
  id: string;
  user: string;
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  source_id: string;
  episode_name: string;
  progress: number;
  duration: number;
  created: string;
  updated: string;
}

export interface FavoriteRecord {
  id: string;
  user: string;
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  source_id: string;
  created: string;
  updated: string;
}

// Helper to check if user is logged in
export const isUserLoggedIn = () => pb.authStore.isValid;

// Helper to get current user ID
export const getCurrentUserId = () => pb.authStore.model?.id;

// Helper to login
export const login = async (email: string, password: string) => {
  const authData = await pb.collection('users').authWithPassword(email, password);
  window.dispatchEvent(new Event('pb_auth_changed'));
  return authData;
};

// Helper to register
export const register = async (data: any) => {
  const record = await pb.collection('users').create(data);
  window.dispatchEvent(new Event('pb_auth_changed'));
  return record;
};

// Helper to logout
export const logout = () => {
  pb.authStore.clear();
  window.dispatchEvent(new Event('pb_auth_changed'));
};

// Fetch history for current user
export const getHistory = async (page = 1, perPage = 50) => {
  if (!isUserLoggedIn()) return { items: [] };
  return await pb.collection('history').getList(page, perPage, {
    filter: `user = "${getCurrentUserId()}"`,
    sort: '-updated',
    $autoCancel: false,
  });
};

// Fetch specific history record for a video
export const getHistoryByVodId = async (vod_id: string) => {
  if (!isUserLoggedIn()) return null;
  try {
    return await pb.collection('history').getFirstListItem(`user="${getCurrentUserId()}" && vod_id="${vod_id}"`, {
      $autoCancel: false,
    });
  } catch (e) {
    return null;
  }
};

// Fetch favorites for current user
export const getFavorites = async (page = 1, perPage = 50) => {
  if (!isUserLoggedIn()) return { items: [] };
  return await pb.collection('favorites').getList(page, perPage, {
    filter: `user = "${getCurrentUserId()}"`,
    sort: '-created',
    $autoCancel: false,
  });
};

// Delete a history record
export const deleteHistory = async (id: string) => {
  return await pb.collection('history').delete(id, { $autoCancel: false });
};

// Clear all history for current user
export const clearHistory = async () => {
  if (!isUserLoggedIn()) return;
  const userId = getCurrentUserId();
  const records = await pb.collection('history').getFullList({
    filter: `user = "${userId}"`,
    $autoCancel: false,
  });
  
  // PocketBase doesn't have a "delete all" by filter, so we delete each
  const deletePromises = records.map(record => pb.collection('history').delete(record.id, { $autoCancel: false }));
  return await Promise.all(deletePromises);
};

// Delete a favorite record
export const deleteFavorite = async (id: string) => {
  return await pb.collection('favorites').delete(id, { $autoCancel: false });
};

// Remove from favorites by vod_id
export const removeFromFavorites = async (vod_id: string) => {
  if (!isUserLoggedIn()) return;
  const userId = getCurrentUserId();
  try {
    const existing = await pb.collection('favorites').getFirstListItem(`user="${userId}" && vod_id="${vod_id}"`, {
      $autoCancel: false,
    });
    return await pb.collection('favorites').delete(existing.id, { $autoCancel: false });
  } catch (e) {
    return null;
  }
};

// Save or update history
export const saveHistory = async (data: {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  source_id: string;
  episode_name: string;
  progress: number;
  duration: number;
}) => {
  if (!isUserLoggedIn()) return;
  const userId = getCurrentUserId();
  
  // Check if record exists
  try {
    const existing = await pb.collection('history').getFirstListItem(`user="${userId}" && vod_id="${data.vod_id}"`, {
      $autoCancel: false,
    });
    return await pb.collection('history').update(existing.id, {
      ...data,
    }, { $autoCancel: false });
  } catch (e: any) {
    if (e.status === 404) {
      // Create new
      try {
        return await pb.collection('history').create({
          ...data,
          user: userId,
        }, { $autoCancel: false });
      } catch (createErr: any) {
        console.error('PocketBase Create History Error Detail:', createErr.data);
        throw createErr;
      }
    }
    console.error('PocketBase Update History Error Detail:', e.data);
    throw e;
  }
};

// Check if a video is favorited
export const isFavorited = async (vod_id: string) => {
  if (!isUserLoggedIn()) return false;
  try {
    await pb.collection('favorites').getFirstListItem(`user="${getCurrentUserId()}" && vod_id="${vod_id}"`, {
      $autoCancel: false,
    });
    return true;
  } catch (e) {
    return false;
  }
};

// Toggle favorite
export const toggleFavorite = async (data: {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  source_id: string;
}) => {
  if (!isUserLoggedIn()) throw new Error('请先登录');
  const userId = getCurrentUserId();
  
  try {
    const existing = await pb.collection('favorites').getFirstListItem(`user="${userId}" && vod_id="${data.vod_id}"`, {
      $autoCancel: false,
    });
    await pb.collection('favorites').delete(existing.id, { $autoCancel: false });
    return false; // Unfavorited
  } catch (e: any) {
    if (e.status === 404) {
      try {
        await pb.collection('favorites').create({
          ...data,
          user: userId,
        }, { $autoCancel: false });
        return true; // Favorited
      } catch (createErr: any) {
        console.error('PocketBase Create Favorite Error Detail:', createErr.data);
        throw createErr;
      }
    }
    console.error('PocketBase Toggle Favorite Error Detail:', e.data);
    throw e;
  }
};
