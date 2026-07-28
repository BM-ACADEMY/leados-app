/**
 * Thumbnail Brain — Configuration Layer
 * 
 * Single responsibility: Load, save, and validate Thumbnail Brain
 * configuration from localStorage. No prompt building, no API calls.
 */

export const THUMB_BRAIN_KEY = 'thumbnail_brain_config';

/* ── Option lists (used by the UI and validation) ─────────────────── */

export const STYLES = [
  'Cinematic', 'Technology', 'AI', 'Business', 'Education',
  'Gaming', 'Podcast', 'Real Estate', 'Minimal'
];

export const ASPECT_RATIOS = ['16:9', '9:16', '4:3', '1:1'];

export const RESOLUTIONS = ['1920x1080', '1280x720', '3840x2160', '1080x1920'];

export const QUALITIES = ['Ultra HD', 'HD', 'Standard'];

export const MODELS = [
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { value: 'gemini-2.5-pro-image',   label: 'Gemini 2.5 Pro Image' },
  { value: 'imagen',                 label: 'Imagen' },
  { value: 'openai-image',           label: 'OpenAI Image' },
  { value: 'flux',                   label: 'Flux' },
];

/* ── Default prompt ───────────────────────────────────────────────── */

export const DEFAULT_PROMPT = `You are an expert YouTube Thumbnail Designer and Creative Director.

Transform the selected video frame into a premium cinematic thumbnail.

Keep the person's face, pose, clothing and identity exactly the same.

Enhance:

• HDR lighting
• Professional color grading
• Face sharpness
• Eye clarity
• Hair details
• Dynamic contrast
• Depth of field
• Ultra realistic quality

Apply subtle cinematic effects:

• Rim lighting
• Lens flare
• Light rays
• Glow
• Floating particles

Keep all effects realistic.

Improve the background only if necessary while preserving realism.

Leave approximately 35% empty space for title placement.

Do not generate text.

Do not generate logos.

Do not generate watermarks.

Do not distort faces.

Output:

Aspect Ratio: 16:9

Resolution: 1920×1080

Ultra HD

Professional YouTube Thumbnail`;

/* ── Default configuration ────────────────────────────────────────── */

export const DEFAULT_CONFIG = {
  defaultPrompt: DEFAULT_PROMPT,
  style:         'Cinematic',
  aspectRatio:   '16:9',
  resolution:    '1920x1080',
  quality:       'Ultra HD',
  titleSafeArea: 35,
  model:         'gemini-2.5-flash-image',
};

/* ── Load / Save / Validate ───────────────────────────────────────── */

/**
 * Load the Thumbnail Brain configuration from localStorage.
 * Falls back to DEFAULT_CONFIG for any missing keys.
 */
export function loadConfig() {
  try {
    const saved = localStorage.getItem(THUMB_BRAIN_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

/**
 * Persist the current configuration to localStorage.
 */
export function saveConfig(config) {
  localStorage.setItem(THUMB_BRAIN_KEY, JSON.stringify(config));
}

/**
 * Check whether the user has ever saved a custom configuration.
 */
export function isConfigSaved() {
  return !!localStorage.getItem(THUMB_BRAIN_KEY);
}

/**
 * Validate a configuration object, filling in any missing keys
 * with defaults. Returns a clean, complete config.
 */
export function validateConfig(config) {
  return {
    defaultPrompt: config.defaultPrompt || DEFAULT_PROMPT,
    style:         STYLES.includes(config.style) ? config.style : DEFAULT_CONFIG.style,
    aspectRatio:   ASPECT_RATIOS.includes(config.aspectRatio) ? config.aspectRatio : DEFAULT_CONFIG.aspectRatio,
    resolution:    RESOLUTIONS.includes(config.resolution) ? config.resolution : DEFAULT_CONFIG.resolution,
    quality:       QUALITIES.includes(config.quality) ? config.quality : DEFAULT_CONFIG.quality,
    titleSafeArea: typeof config.titleSafeArea === 'number' ? config.titleSafeArea : DEFAULT_CONFIG.titleSafeArea,
    model:         MODELS.some(m => m.value === config.model) ? config.model : DEFAULT_CONFIG.model,
  };
}
