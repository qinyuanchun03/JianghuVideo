export const storage = {
  set: (key: string, value: any) => {
    try {
      const stringValue = JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  },

  get: (key: string) => {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (e) {
      // If it's not JSON (possibly encrypted or old data), return null or the raw value
      // This prevents crashes when switching away from encryption
      return null;
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    localStorage.clear();
  }
};
