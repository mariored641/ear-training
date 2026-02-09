import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

// Password for saving global presets
const GLOBAL_PRESET_PASSWORD = 'CAGED';

/**
 * Preset Manager
 * Handles saving and loading presets from localStorage and Firebase
 */

// ==================== LOCAL STORAGE ====================

/**
 * Save a preset to localStorage (local to this browser only)
 */
export const saveLocalPreset = (presetType, preset) => {
  try {
    const storageKey = `${presetType}_presets_local`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

    // Add timestamp and unique ID
    const newPreset = {
      ...preset,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      source: 'local'
    };

    existing.push(newPreset);
    localStorage.setItem(storageKey, JSON.stringify(existing));

    return { success: true, preset: newPreset };
  } catch (error) {
    console.error('Error saving local preset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all local presets from localStorage
 */
export const getLocalPresets = (presetType) => {
  try {
    const storageKey = `${presetType}_presets_local`;
    const presets = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return presets;
  } catch (error) {
    console.error('Error loading local presets:', error);
    return [];
  }
};

/**
 * Delete a local preset
 */
export const deleteLocalPreset = (presetType, presetId) => {
  try {
    const storageKey = `${presetType}_presets_local`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const filtered = existing.filter(p => p.id !== presetId);
    localStorage.setItem(storageKey, JSON.stringify(filtered));
    return { success: true };
  } catch (error) {
    console.error('Error deleting local preset:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FIREBASE (GLOBAL) ====================

/**
 * Verify password for global preset saving
 */
export const verifyGlobalPassword = (password) => {
  return password === GLOBAL_PRESET_PASSWORD;
};

/**
 * Save a preset to Firebase (visible to everyone)
 */
export const saveGlobalPreset = async (presetType, preset, password) => {
  // Verify password
  if (!verifyGlobalPassword(password)) {
    return { success: false, error: 'Incorrect password' };
  }

  try {
    // Check if Firebase is initialized
    if (!db) {
      return { success: false, error: 'Firebase not initialized. Please configure Firebase first.' };
    }

    const collectionName = `${presetType}_presets_global`;

    const newPreset = {
      ...preset,
      createdAt: new Date().toISOString(),
      source: 'global'
    };

    const docRef = await addDoc(collection(db, collectionName), newPreset);

    return {
      success: true,
      preset: { ...newPreset, id: docRef.id }
    };
  } catch (error) {
    console.error('Error saving global preset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all global presets from Firebase
 */
export const getGlobalPresets = async (presetType) => {
  try {
    // Check if Firebase is initialized
    if (!db) {
      console.warn('Firebase not initialized, skipping global presets');
      return [];
    }

    const collectionName = `${presetType}_presets_global`;
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const presets = [];
    querySnapshot.forEach((doc) => {
      presets.push({
        id: doc.id,
        ...doc.data(),
        source: 'global'
      });
    });

    return presets;
  } catch (error) {
    console.error('Error loading global presets:', error);
    return [];
  }
};

// ==================== COMBINED ====================

/**
 * Get all presets from all sources (built-in + local + global)
 */
export const getAllPresets = async (presetType, builtInPresets = []) => {
  try {
    // Get local presets
    const localPresets = getLocalPresets(presetType);

    // Get global presets
    const globalPresets = await getGlobalPresets(presetType);

    // Mark built-in presets
    const markedBuiltIn = builtInPresets.map(p => ({ ...p, source: 'built-in' }));

    // Combine all presets
    return {
      builtIn: markedBuiltIn,
      local: localPresets,
      global: globalPresets,
      all: [...markedBuiltIn, ...globalPresets, ...localPresets]
    };
  } catch (error) {
    console.error('Error getting all presets:', error);
    return {
      builtIn: builtInPresets.map(p => ({ ...p, source: 'built-in' })),
      local: [],
      global: [],
      all: builtInPresets.map(p => ({ ...p, source: 'built-in' }))
    };
  }
};

/**
 * Save preset based on type (local or global)
 */
export const savePreset = async (presetType, preset, isGlobal = false, password = '') => {
  if (isGlobal) {
    return await saveGlobalPreset(presetType, preset, password);
  } else {
    return saveLocalPreset(presetType, preset);
  }
};
