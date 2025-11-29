/**
 * Animation utilities for train board flip-clock effect
 *
 * This version choreographs split-flap style transitions with patterned
 * cascading (Matrix, Spiral, Dissolve) to make the change feel analog and rhythmic.
 */

const ANIMATION_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*-+=?';
// Slow, rippling cadence to span crossfades (approx 3.5s total at 25ms * 140 frames)
const FRAME_DURATION_MS = 25;
const TOTAL_FRAMES = 140;
const PATTERNS: Array<'matrix' | 'spiral' | 'dissolve' | 'waterfall'> = [
  'matrix',
  'spiral',
  'dissolve',
  'waterfall',
];

/**
 * Generate a random character for animation
 */
function randomChar(): string {
  return ANIMATION_CHARS[Math.floor(Math.random() * ANIMATION_CHARS.length)];
}

/**
 * Build a deterministic order in which characters resolve based on the pattern.
 */
function buildPatternOrder(
  length: number,
  pattern: 'matrix' | 'spiral' | 'dissolve' | 'waterfall'
): number[] {
  const indices = Array.from({ length }, (_, i) => i);

  if (pattern === 'dissolve') {
    // Shuffle for a scattered dissolve
    return indices.sort(() => Math.random() - 0.5);
  }

  if (pattern === 'spiral') {
    // Center-out ripple
    const mid = (length - 1) / 2;
    return indices.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  }

  if (pattern === 'waterfall') {
    // Top-to-bottom cascading; slight stagger by column group to mimic gravity
    return indices.sort((a, b) => (a % 4) - (b % 4) || a - b);
  }

  // Matrix: stagger by column groups for a cascading feel
  return indices.sort((a, b) => (a % 3) - (b % 3) || a - b);
}

/**
 * Generate animated version of text that progressively reveals the final text
 * using a split-flap style pattern.
 * @param finalText The final text to display
 * @param frame Current animation frame (0 to TOTAL_FRAMES)
 * @param pattern Pattern name
 * @param order Precomputed character order for the pattern
 * @returns Partially animated text
 */
export function animateText(
  finalText: string,
  frame: number,
  pattern: 'matrix' | 'spiral' | 'dissolve' | 'waterfall' = 'matrix',
  order?: number[]
): string {
  if (!finalText) return '';
  if (frame >= TOTAL_FRAMES) return finalText;

  const resolveOrder = order ?? buildPatternOrder(finalText.length, pattern);
  const progress = frame / TOTAL_FRAMES;

  // Each character resolves when progress exceeds its normalized position in the order
  const resolvedThresholds = new Map<number, number>();
  resolveOrder.forEach((idx, position) => {
    resolvedThresholds.set(idx, position / resolveOrder.length);
  });

  let result = '';
  for (let i = 0; i < finalText.length; i++) {
    const ch = finalText[i];
    const threshold = resolvedThresholds.get(i) ?? 1;

    if (progress >= threshold || ch === ' ' || ch === '-' || ch === ',') {
      // For waterfall, introduce a brief deterministic drift before snapping to the final character
      if (pattern === 'waterfall' && progress < threshold + 0.12 && frame < TOTAL_FRAMES - 1) {
        const driftIndex = (i + frame) % ANIMATION_CHARS.length;
        result += ANIMATION_CHARS[driftIndex];
        continue;
      }
      result += ch;
      continue;
    }

    result += randomChar();
  }

  return result;
}

/**
 * Run flip-clock animation for track name and artist
 * @param trackName Final track name
 * @param artist Final artist name
 * @param onFrame Callback for each animation frame
 * @returns Promise that resolves when animation completes
 */
export async function runFlipClockAnimation(
  trackName: string,
  artist: string,
  onFrame: (animatedTrack: string, animatedArtist: string) => void
): Promise<void> {
  const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  const trackOrder = buildPatternOrder(trackName.length, pattern);
  const artistOrder = buildPatternOrder(artist.length, pattern);

  for (let frame = 0; frame <= TOTAL_FRAMES; frame++) {
    const animatedTrack = animateText(trackName, frame, pattern, trackOrder);
    const animatedArtist = animateText(artist, frame, pattern, artistOrder);

    onFrame(animatedTrack, animatedArtist);

    if (frame < TOTAL_FRAMES) {
      await new Promise(resolve => setTimeout(resolve, FRAME_DURATION_MS));
    }
  }
}

// Export constants for testing
export const FLIP_TOTAL_FRAMES = TOTAL_FRAMES;
export const FLIP_FRAME_DURATION = FRAME_DURATION_MS;
