/**
 * Preset Manager
 * שמירה וטעינה של presets מ-localStorage
 */

// ==================== LOCAL STORAGE ====================

export const saveLocalPreset = (presetType, preset) => {
  try {
    const storageKey = `${presetType}_presets_local`
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const newPreset = {
      ...preset,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      source: 'local'
    }
    existing.push(newPreset)
    localStorage.setItem(storageKey, JSON.stringify(existing))
    return { success: true, preset: newPreset }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const getLocalPresets = (presetType) => {
  try {
    const storageKey = `${presetType}_presets_local`
    return JSON.parse(localStorage.getItem(storageKey) || '[]')
  } catch {
    return []
  }
}

export const deleteLocalPreset = (presetType, presetId) => {
  try {
    const storageKey = `${presetType}_presets_local`
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
    localStorage.setItem(storageKey, JSON.stringify(existing.filter(p => p.id !== presetId)))
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ==================== COMBINED ====================

export const getAllPresets = async (presetType, builtInPresets = []) => {
  const localPresets = getLocalPresets(presetType)
  const markedBuiltIn = builtInPresets.map(p => ({ ...p, source: 'built-in' }))
  return {
    builtIn: markedBuiltIn,
    local: localPresets,
    global: [],
    all: [...markedBuiltIn, ...localPresets]
  }
}

export const savePreset = async (presetType, preset, isGlobal = false) => {
  return saveLocalPreset(presetType, preset)
}
