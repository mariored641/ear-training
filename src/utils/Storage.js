/**
 * LocalStorage management utility
 */
const Storage = {
  saveSettings(exerciseId, settings) {
    const key = `exercise${exerciseId}Settings`;
    localStorage.setItem(key, JSON.stringify(settings));
  },

  loadSettings(exerciseId, defaults) {
    const key = `exercise${exerciseId}Settings`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaults;
  },

  saveProgress(exerciseId, progress) {
    const key = `exercise${exerciseId}Progress`;
    localStorage.setItem(key, JSON.stringify(progress));
  },

  loadProgress(exerciseId) {
    const key = `exercise${exerciseId}Progress`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  },

  clearAll() {
    localStorage.clear();
  }
};

export default Storage;
