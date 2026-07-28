/**
 * Thumbnail Brain — Prompt Builder
 *
 * Single responsibility: Build the final AI prompt from a validated
 * Thumbnail Brain configuration. No config loading, no API calls.
 */

import { DEFAULT_PROMPT } from './thumbnailBrainConfig.js';
import { buildStyleInstruction } from './thumbnailStyles.js';

/**
 * Build the complete prompt that gets sent to the AI image model.
 *
 * Takes a Thumbnail Brain config object and produces a single string
 * that includes the base prompt, style instructions, title safe area,
 * and output settings.
 *
 * @param {Object} config — A Thumbnail Brain configuration object
 * @param {Object} [runtimeVars] — Optional content context injected at generation time
 * @param {string} [runtimeVars.videoTitle] — The video/content title
 * @param {string} [runtimeVars.description] — The video description or caption
 * @param {string} [runtimeVars.category] — Optional content category
 * @returns {string} — The final prompt string
 */
export function buildFinalPrompt(config, runtimeVars = {}) {
  let basePrompt = config.defaultPrompt || DEFAULT_PROMPT;

  // Strip the Output section — we always rebuild it from current settings
  const outputIdx = basePrompt.indexOf('\n\nOutput:');
  if (outputIdx !== -1) {
    basePrompt = basePrompt.substring(0, outputIdx);
  }

  // Strip any existing title-safe-area instruction so the configured value
  // is the only one the model sees (avoids conflicting "35% / 40%" instructions)
  basePrompt = basePrompt.replace(
    /\n\nLeave approximately \d+% empty space for title placement\./g,
    ''
  );

  // ── Style instruction (from style presets) ──────────────────────
  const styleSection = `\n\n${buildStyleInstruction(config.style)}`;

  // ── Runtime content context (injected from Approval Room at call time) ──
  const { videoTitle = '', description = '', category = '' } = runtimeVars;
  const contextLines = [];
  if (videoTitle) contextLines.push(`Title: ${videoTitle}`);
  if (description) contextLines.push(`Description: ${description}`);
  if (category) contextLines.push(`Category: ${category}`);
  const contextSection = contextLines.length
    ? `\n\nContent Context:\n${contextLines.join('\n')}`
    : '';

  // ── Title safe area ─────────────────────────────────────────────
  const titleSafeNote = `\n\nLeave approximately ${config.titleSafeArea ?? 35}% empty space for title text placement.`;

  // ── Output settings ─────────────────────────────────────────────
  const resolution = config.resolution
    ? config.resolution.replace('x', '×')
    : '1920×1080';

  const outputSection = [
    '\n\nOutput:',
    `\nAspect Ratio: ${config.aspectRatio || '16:9'}`,
    `\nResolution: ${resolution}`,
    `\nQuality: ${config.quality || 'Ultra HD'}`,
    '\nFormat: Professional YouTube Thumbnail',
  ].join('');

  return basePrompt + styleSection + contextSection + titleSafeNote + outputSection;
}
