import { CurrentTrack, MatchedTrack, PhraseInfo, ShiftType } from './types';
import { getCamelotColor } from './camelotColors';
import * as os from 'os';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import packageJson from './package.json';

// Simple ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgBlack: '\x1b[40m',
  fgBlack: '\x1b[30m',
  spotifyGreen: '\x1b[38;2;29;185;84m',
  lightGreen: '\x1b[92m',
  zshGreen: '\x1b[32m',
  zshBlue: '\x1b[34m',
  zshYellow: '\x1b[33m',
};

const FRAME_BASE_COLOR = `${colors.bright}${colors.cyan}`;
const FRAME_RIPPLE_COLOR = `${colors.spotifyGreen}${colors.bright}`;
const RIPPLE_GLYPH = '▒';
const RIPPLE_BAND = 5;
const RIPPLE_STEP_MS = 90;
const BASE_BAR_BG = '\x1b[48;2;30;30;30m';
const SCAN_GRADIENT = [0.3, 0.6, 1, 0.6, 0.3];

// Helper to convert Hex to ANSI 24-bit color
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const VERSION = `v${packageJson.version}`;

export class PhraseCounter {
  calculate(
    bpm: number,
    progressMs: number,
    timestamp: number,
    timeSignature?: number,
    isPlaying = true
  ): PhraseInfo {
    // Handle zero or negative BPM gracefully
    if (bpm <= 0) {
      return { beatsRemaining: 32, timeRemainingSeconds: 0, phraseCount: 1 };
    }

    const now = Date.now();
    const safeTimestamp = timestamp > 0 ? timestamp : now;

    const elapsed = isPlaying ? now - safeTimestamp : 0;
    const currentProgressMs = progressMs + elapsed;

    const beatDurationMs = 60000 / bpm;

    const totalBeats = currentProgressMs / beatDurationMs;

    // Phrase counter only valid for 4/4 time
    // For other time signatures, return a default or skip
    if (timeSignature && timeSignature !== 4) {
      return { beatsRemaining: 0, timeRemainingSeconds: 0, phraseCount: 0 };
    }

    const beatsInPhrase = 32; // 32 beats = 8 bars of 4/4
    const positionInPhrase = totalBeats % beatsInPhrase;
    const beatsRemaining = beatsInPhrase - positionInPhrase;
    const timeRemainingSeconds = (beatsRemaining * beatDurationMs) / 1000;
    const phraseCount = Math.floor(positionInPhrase) + 1;

    return {
      beatsRemaining,
      timeRemainingSeconds,
      phraseCount,
    };
  }
}

// Helper to center text in a given width
function center(text: string, width: number): string {
  const visibleWidth = stringWidth(stripAnsi(text));
  if (visibleWidth >= width) return text;
  const padLeft = Math.floor((width - visibleWidth) / 2);
  return ' '.repeat(padLeft) + text + ' '.repeat(width - visibleWidth - padLeft);
}

type RippleState = {
  active: boolean;
  band: number;
  cycle: number;
  phase: number;
};

const CLEAR_TO_END = '\x1b[0K';

function buildRippleState(frameWidth: number, frameHeight: number, isActive: boolean): RippleState {
  const virtualHeight = Math.max(6, Math.min(frameHeight, 60));
  const cycle = frameWidth + virtualHeight;
  const phase = Math.floor(Date.now() / RIPPLE_STEP_MS) % cycle;

  return {
    active: isActive,
    band: RIPPLE_BAND,
    cycle,
    phase,
  };
}

function isInRipple(row: number, col: number, ripple: RippleState): boolean {
  if (!ripple.active) return false;

  const position = (row + col) % ripple.cycle;
  const windowEnd = (ripple.phase + ripple.band) % ripple.cycle;

  if (ripple.phase <= windowEnd) {
    return position >= ripple.phase && position <= windowEnd;
  }

  return position >= ripple.phase || position <= windowEnd;
}

function colorizeFrameChar(
  ch: string,
  row: number,
  col: number,
  ripple: RippleState,
  useRippleGlyph = false
): string {
  const active = isInRipple(row, col, ripple);
  const glyph = active && useRippleGlyph ? RIPPLE_GLYPH : ch;
  const color = active ? FRAME_RIPPLE_COLOR : FRAME_BASE_COLOR;
  return `${color}${glyph}${colors.reset}`;
}

function buildRippleBorderLine(
  width: number,
  rowIndex: number,
  ripple: RippleState,
  isBottom = false
): string {
  const leftCorner = isBottom ? '╚' : '╔';
  const rightCorner = isBottom ? '╝' : '╗';
  const chars: string[] = [];

  for (let col = 0; col < width + 2; col++) {
    if (col === 0) {
      chars.push(colorizeFrameChar(leftCorner, rowIndex, col, ripple));
    } else if (col === width + 1) {
      chars.push(colorizeFrameChar(rightCorner, rowIndex, col, ripple));
    } else {
      chars.push(colorizeFrameChar('═', rowIndex, col, ripple, true));
    }
  }

  return chars.join('');
}

function buildRippleTitleLine(
  title: string,
  width: number,
  rowIndex: number,
  ripple: RippleState
): string {
  const centeredTitle = center(title, width);
  const leftBorder = colorizeFrameChar('║', rowIndex, 0, ripple);
  const rightBorder = colorizeFrameChar('║', rowIndex, width + 1, ripple);
  return `${leftBorder}${FRAME_BASE_COLOR}${centeredTitle}${colors.reset}${rightBorder}${colors.reset}`;
}

type RgbColor = { r: number; g: number; b: number };

type ScanSettings = {
  speedMs: number;
  pulseWidth: number;
  baseColor: RgbColor;
  freeze: boolean;
  warningFg?: string;
};

function getScanSettings(beatsRemaining: number): ScanSettings {
  if (beatsRemaining <= 8) {
    return {
      speedMs: 0,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 210, g: 90, b: 50 },
      freeze: true,
      warningFg: colors.red,
    };
  }

  if (beatsRemaining <= 16) {
    return {
      speedMs: 50,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 210, g: 160, b: 60 },
      freeze: false,
    };
  }

  if (beatsRemaining <= 32) {
    return {
      speedMs: 100,
      pulseWidth: SCAN_GRADIENT.length,
      baseColor: { r: 70, g: 160, b: 180 },
      freeze: false,
    };
  }

  return {
    speedMs: 250,
    pulseWidth: SCAN_GRADIENT.length,
    baseColor: { r: 40, g: 110, b: 130 },
    freeze: false,
  };
}

function makeBg(color: RgbColor, factor: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(color.r * factor);
  const g = clamp(color.g * factor);
  const b = clamp(color.b * factor);
  return `\x1b[48;2;${r};${g};${b}m`;
}

function getPulseCenter(length: number, scan: ScanSettings): number {
  if (scan.freeze || scan.speedMs <= 0) {
    return Math.floor(length / 2);
  }
  return Math.floor(Date.now() / scan.speedMs) % length;
}

function wrapDistance(a: number, b: number, length: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, length - direct);
}

function buildScanlineBar(beatsRemaining: number): { bar: string; labelColor: string } {
  const barLength = 32;
  const filled = Math.max(0, Math.min(barLength, Math.floor(beatsRemaining)));
  const chars = Array.from({ length: barLength }, (_, i) => (i < filled ? '█' : '░'));

  const scan = getScanSettings(beatsRemaining);
  const center = getPulseCenter(barLength, scan);

  const colored = chars.map((ch, idx) => {
    const dist = wrapDistance(idx, center, barLength);

    if (dist > Math.floor(scan.pulseWidth / 2)) {
      return `${BASE_BAR_BG}${colors.dim}${ch}${colors.reset}`;
    }

    const gradientIdx = Math.min(dist + Math.floor(scan.pulseWidth / 2), SCAN_GRADIENT.length - 1);
    const factor = SCAN_GRADIENT[gradientIdx] ?? 0.3;
    const bg = makeBg(scan.baseColor, factor);
    const textColor = scan.freeze ? colors.bright : colors.reset;
    return `${bg}${textColor}${ch}${colors.reset}`;
  });

  const labelColor = scan.freeze ? colors.red : colors.white;
  return { bar: colored.join(''), labelColor };
}

function buildHelpPanel(width: number): string[] {
  const separator = '─'.repeat(width);
  return [
    `${colors.dim}${separator}${colors.reset}`,
    `${colors.bright}${colors.cyan}HELP${colors.reset}`,
    `${colors.dim}${separator}${colors.reset}`,
    `${colors.bright}h${colors.reset}: toggle help   ${colors.bright}tab${colors.reset}: categories   ${colors.bright}w/s${colors.reset}: scroll`,
    `${colors.bright}r${colors.reset}: refresh library   ${colors.bright}Ctrl+C${colors.reset}: exit`,
    `${colors.dim}Scanline glow speeds up near the mix window and locks red inside the final 8 beats.${colors.reset}`,
  ];
}

function buildStatusBar(
  width: number,
  showWarning: boolean,
  ripple: RippleState,
  rowIndex: number
): string[] {
  const statusWidth = Math.min(width, 120);
  const effectiveWidth = Math.max(62, statusWidth - 2);
  const separator = buildRippleBorderLine(effectiveWidth, rowIndex, ripple, true);

  if (showWarning) {
    return [separator, ' Press Ctrl-C again to exit '];
  }

  const username = process.env.USER || os.userInfo().username;
  const hostname = os.hostname().split('.')[0];
  const userHost = `${username}@${hostname}`;
  const cwd = process.cwd().replace(os.homedir(), '~');
  const branch = '<main>';
  const controls = 'w/s: scroll | tab: category | r: refresh | h: help';

  return [
    separator,
    `${colors.zshGreen}${userHost}${colors.reset} | ${colors.white}${controls}${colors.reset}`,
    `${colors.zshBlue}${cwd}  ${colors.zshYellow}${branch}${colors.reset}`,
  ];
}

export class TerminalRenderer {
  private previousFrame: string[] = [];

  resetFrameCache(): void {
    this.previousFrame = [];
  }

  writeFrame(lines: string[]): void {
    const terminalHeight = process.stdout.rows || 24;
    // Strictly enforce terminal height to prevent scrolling
    const clippedLines = lines.slice(0, terminalHeight);

    const maxRows = Math.max(clippedLines.length, this.previousFrame.length);
    const buffer: string[] = [];

    // Move cursor home
    buffer.push('\x1b[H');

    for (let i = 0; i < maxRows; i++) {
      const next = clippedLines[i] ?? '';
      const prev = this.previousFrame[i] ?? '';
      if (next !== prev) {
        buffer.push(`\x1b[${i + 1};1H${next}${CLEAR_TO_END}`);
      }
    }

    if (buffer.length > 0) {
      process.stdout.write(buffer.join(''));
    }

    this.previousFrame = clippedLines.slice();
  }

  renderNarrowWarning(width: number): void {
    this.resetFrameCache();
    const lines = [
      '',
      `${colors.yellow}⚠️  Terminal too narrow!${colors.reset}`,
      `Minimum width: 80 characters`,
      `Current width: ${width} characters`,
      '',
      'Please resize your terminal window.',
    ];
    this.writeFrame(lines);
  }

  renderTrainBoard(
    currentTrack: CurrentTrack | null,
    recommendations: MatchedTrack[],
    phraseInfo: PhraseInfo | null,
    showExitWarning = false,
    debugMessage?: string,
    logs: string[] = [],
    selectedCategory: ShiftType | 'ALL' = 'ALL',
    scrollOffset = 0,
    showHelp = false,
    notices: string[] = [],
    totalTracksInLibrary = 0
  ): { clampedOffset: number; maxScroll: number } {
    const terminalWidth = process.stdout.columns || 80;
    const terminalHeight = process.stdout.rows || 24;
    const lines: string[] = [];
    let maxLines = 0;
    let totalLines = 0;

    // Allow UI to grow wider than 80 chars for better use of space
    const uiWidth = Math.min(terminalWidth, 120);
    const effectiveWidth = Math.max(62, uiWidth - 2);
    const frameWidth = effectiveWidth + 2;
    const ripple = buildRippleState(frameWidth, terminalHeight, Boolean(currentTrack));

    const title = `${colors.spotifyGreen}ᯤ SpotifyDJ${colors.reset} — Real-Time DJ Assistant`;

    const topLine = buildRippleBorderLine(effectiveWidth, lines.length, ripple);
    lines.push(topLine);
    const middleLine = buildRippleTitleLine(title, effectiveWidth, lines.length, ripple);
    lines.push(middleLine);
    const bottomLine = buildRippleBorderLine(effectiveWidth, lines.length, ripple, true);
    lines.push(bottomLine);
    lines.push(`${colors.dim}Version: ${VERSION}${colors.reset}`, '');

    if (notices.length > 0) {
      notices.forEach(note => {
        lines.push(`${colors.yellow}⚠️  ${note}${colors.reset}`);
      });
      lines.push('');
    }

    if (!currentTrack) {
      lines.push(`${colors.yellow}Waiting for playback...${colors.reset}`);
    } else {
      const now = Date.now();
      const isFlashOn = currentTrack.isPlaying && Math.floor(now / 500) % 2 === 0;
      const recordIndicator = isFlashOn
        ? `${colors.spotifyGreen}⏺${colors.reset}`
        : `${colors.dim}⏺${colors.reset}`;

      const trackName = `${colors.bright}${currentTrack.track_name}${colors.reset}`;
      const artistName = `${colors.bright}${currentTrack.artist}${colors.reset}`;
      const rawInfo = `${currentTrack.track_name} — ${currentTrack.artist}`;
      const maxInfoWidth = effectiveWidth - 10;

      let displayInfo = `${trackName} — ${artistName}`;
      if (rawInfo.length > maxInfoWidth) {
        const truncatedRaw = rawInfo.substring(0, maxInfoWidth - 1) + '…';
        displayInfo = `${colors.bright}${truncatedRaw}${colors.reset}`;
      }

      lines.push(`💿  ${displayInfo} ${recordIndicator}`);

      // BPM and Camelot on line directly below track info
      const bpmVal = currentTrack.audio_features?.tempo?.toFixed(1) || '0.0';
      const camelVal = currentTrack.camelot_key || '-';

      let coloredCamel = camelVal;
      if (currentTrack.camelot_key) {
        const hex = getCamelotColor(currentTrack.camelot_key);
        const ansiColor = hexToAnsi(hex);
        coloredCamel = `${ansiColor}${colors.bright}${camelVal}${colors.reset}`;
      }

      const detailsStr = `${colors.bright}BPM:${colors.reset} ${bpmVal}  ${colors.dim}•${colors.reset}  ${colors.bright}Camelot:${colors.reset} ${coloredCamel}`;
      lines.push(`    ${detailsStr}`, '');

      const elapsed = now - currentTrack.timestamp;
      // Calculate current progress accurately
      const baseProgressMs = currentTrack.progress_ms;
      const additionalProgressMs = currentTrack.isPlaying ? elapsed : 0;
      const currentMs = Math.min(baseProgressMs + additionalProgressMs, currentTrack.duration_ms);

      // Dynamic progress bar width: 40% of terminal width, minimum 40 (per NEWIDEAS.md), maximum 60
      const barWidth = Math.max(40, Math.min(60, Math.floor(effectiveWidth * 0.5)));

      // Calculate percentage with proper edge case handling
      let percent: number;
      if (currentTrack.duration_ms <= 0) {
        percent = 0; // Avoid division by zero
      } else {
        percent = Math.min(1, Math.max(0, currentMs / currentTrack.duration_ms));
      }

      // Calculate filled length: ensure 0% = 0 blocks, 100% = all blocks
      // Use Math.floor for more accurate representation, but ensure 100% shows full bar
      let filledLen: number;
      if (percent >= 1) {
        filledLen = barWidth; // 100% = all blocks
      } else if (percent <= 0) {
        filledLen = 0; // 0% = no blocks
      } else {
        // For values between 0 and 1, use precise calculation
        // Multiply first to maintain precision, then round
        filledLen = Math.round(barWidth * percent);
        // Ensure we don't exceed barWidth due to rounding
        filledLen = Math.min(filledLen, barWidth);
      }

      const emptyLen = barWidth - filledLen;
      const bar = '▰'.repeat(filledLen) + '▱'.repeat(emptyLen);

      lines.push(`  ${bar}`, '');

      if (phraseInfo) {
        // Skip phrase display if not 4/4 time (beatsRemaining = 0 indicates this)
        if (phraseInfo.beatsRemaining > 0) {
          lines.push(`${colors.bright}⏱  Phrase Matching${colors.reset}`);
          const { bar, labelColor } = buildScanlineBar(phraseInfo.beatsRemaining);
          lines.push(
            bar,
            `${labelColor}Beats Rem: ${phraseInfo.beatsRemaining.toFixed(1)} | Time: ${phraseInfo.timeRemainingSeconds.toFixed(1)}s${colors.reset}`,
            ''
          );
        } else if (
          currentTrack &&
          currentTrack.audio_features.time_signature &&
          currentTrack.audio_features.time_signature !== 4
        ) {
          lines.push(
            `${colors.yellow}⚠️  Non-4/4 time signature detected (${currentTrack.audio_features.time_signature}/4)${colors.reset}`,
            `${colors.dim}Phrase counter disabled for non-4/4 tracks${colors.reset}`,
            ''
          );
        }
      }
    }

    // Render Tabs
    const categories = ['ALL', ...Object.values(ShiftType)];
    const tabs = categories
      .map(cat => {
        return cat === selectedCategory
          ? `${colors.bgBlue}${colors.white} ${cat} ${colors.reset}`
          : `${colors.dim} ${cat} ${colors.reset}`;
      })
      .join(' ');

    const currentBpm = currentTrack ? currentTrack.audio_features?.tempo?.toFixed(1) || '0.0' : '0.0';
    lines.push(
      `${colors.bright}${colors.spotifyGreen}⚡ Recommendations${colors.reset} ${colors.dim}(Current: ${currentBpm} BPM)${colors.reset}`
    );

    lines.push(tabs);
    lines.push(`${colors.dim}${'─'.repeat(effectiveWidth)}${colors.reset}`);

    // Calculate available space for recommendations
    // We have lines so far (header, track info, tabs)
    // We need to reserve space for:
    // 1. Footer (status bar) -> statusLineCount + 1 (blank line before)
    // 2. Help panel (if shown) -> helpPanel.length + 1 (blank line before)
    // 3. Debug logs (if shown) -> logs.length + 3 (header + blank lines)
    // 4. Empty library tip (if shown) -> 2 lines
    // 5. No matches message (if shown) -> 1 line

    const statusLineCount = showExitWarning ? 2 : 3;
    let reservedLines = statusLineCount + 1; // +1 for blank line before status

    let helpLines: string[] = [];
    if (showHelp) {
      helpLines = buildHelpPanel(effectiveWidth);
      reservedLines += helpLines.length + 1;
    }

    let logLines: string[] = [];
    if (logs.length > 0) {
      const separator = '─'.repeat(effectiveWidth);
      logLines = ['', `${colors.dim}${separator}${colors.reset}`, `${colors.bright}${colors.red}DEBUG LOGS:${colors.reset}`];
      logs.forEach(log => logLines.push(`${colors.dim}${log}${colors.reset}`));
      reservedLines += logLines.length;
    }

    // Calculate space used by fixed content at the top
    const usedLinesTop = lines.length;

    // Calculate remaining space for recommendations
    // terminalHeight - 1 (safety) - usedLinesTop - reservedLines
    const availableForRecs = Math.max(0, terminalHeight - 1 - usedLinesTop - reservedLines);

    // Render Recommendations List
    const displayLines: string[] = [];

    if (recommendations.length === 0) {
      if (totalTracksInLibrary === 0) {
        displayLines.push(`${colors.dim}Library is empty.${colors.reset}`);
        displayLines.push(
          `${colors.dim}Tip: export your liked songs as Liked_Songs.csv (Exportify), drop it in this project, and run \`npm run refresh:library\` or press r.${colors.reset}`
        );
      } else {
        displayLines.push(`${colors.dim}No harmonic matches found in library.${colors.reset}`);
      }
      if (debugMessage) {
        displayLines.push(`${colors.red}DEBUG: ${debugMessage}${colors.reset}`);
      }
    } else {
      // Filter recommendations based on selected category
      let filteredRecs = recommendations;
      if (selectedCategory !== 'ALL') {
        filteredRecs = recommendations.filter(r => r.shiftType === selectedCategory);
      }

      // Grouping logic (simplified for flat list with headers if ALL)
      const grouped: Record<string, MatchedTrack[]> = {};
      if (selectedCategory === 'ALL') {
        filteredRecs.forEach(track => {
          grouped[track.shiftType] = grouped[track.shiftType] || [];
          grouped[track.shiftType].push(track);
        });
      } else {
        grouped[selectedCategory] = filteredRecs;
      }

      // Order of types for ALL view
      const typeOrder = Object.values(ShiftType);
      const typesToRender = selectedCategory === 'ALL' ? typeOrder : [selectedCategory as ShiftType];

      for (const type of typesToRender) {
        const tracks = grouped[type];
        if (tracks && tracks.length > 0) {
          let typeColor = colors.white;
          if (type === ShiftType.SMOOTH) typeColor = colors.spotifyGreen;
          if (type === ShiftType.ENERGY_UP) typeColor = colors.yellow;
          if (type === ShiftType.MOOD_SWITCH) typeColor = colors.magenta;
          if (type === ShiftType.RHYTHMIC_BREAKER) typeColor = colors.red;

          // Always add category header
          if (selectedCategory === 'ALL') {
            displayLines.push(`${typeColor}▼ ${type}${colors.reset}`);
          } else {
            displayLines.push(`${colors.bright}${typeColor}${type}${colors.reset}`);
          }

          tracks.forEach(track => {
            const hex = getCamelotColor(track.camelot_key);
            const ansiColor = hexToAnsi(hex);
            const coloredKey = `${ansiColor}[${track.camelot_key}]${colors.reset}`;

            // Calculate BPM percentage difference
            let bpmDiffStr = '';
            if (currentTrack && currentTrack.audio_features?.tempo) {
              const bpmDiff =
                ((track.bpm - currentTrack.audio_features.tempo) /
                  currentTrack.audio_features.tempo) *
                100;
              bpmDiffStr = bpmDiff >= 0 ? `+${bpmDiff.toFixed(1)}%` : `${bpmDiff.toFixed(1)}%`;
              const bpmColor = Math.abs(bpmDiff) > 5 ? colors.yellow : colors.dim;
              bpmDiffStr = ` ${bpmColor}${bpmDiffStr}${colors.reset}`;
            }

            // Build the full line
            const fullLine = `  ${coloredKey} ${track.track_name} - ${track.artist} (${track.bpm.toFixed(1)} BPM)${bpmDiffStr}`;

            // Calculate visual width and truncate if needed
            const visualWidth = stringWidth(stripAnsi(fullLine));
            if (visualWidth > effectiveWidth) {
              // Need to truncate - work backwards from the track info
              const prefix = `  ${coloredKey} `;
              const suffix = ` (${track.bpm.toFixed(1)} BPM)${bpmDiffStr}`;
              const prefixWidth = stringWidth(stripAnsi(prefix));
              const suffixWidth = stringWidth(stripAnsi(suffix));
              const availableForTrackInfo = effectiveWidth - prefixWidth - suffixWidth - 1; // -1 for ellipsis

              if (availableForTrackInfo > 10) {
                const trackInfo = `${track.track_name} - ${track.artist}`;
                let truncated = trackInfo;
                while (stringWidth(truncated) > availableForTrackInfo && truncated.length > 0) {
                  truncated = truncated.slice(0, -1);
                }
                truncated = truncated.trim() + '…';
                displayLines.push(`${prefix}${truncated}${suffix}`);
              } else {
                // Too narrow, just show what we can
                displayLines.push(fullLine.substring(0, effectiveWidth - 1) + '…');
              }
            } else {
              displayLines.push(fullLine);
            }
          });
        }
      }
    }

    // Pagination / Scrolling
    maxLines = availableForRecs;
    totalLines = displayLines.length;

    // Ensure scrollOffset is valid
    if (scrollOffset < 0) scrollOffset = 0;
    const maxScroll = Math.max(0, totalLines - maxLines);
    if (scrollOffset > maxScroll) scrollOffset = maxScroll;

    const visibleLines = displayLines.slice(scrollOffset, scrollOffset + maxLines);

    visibleLines.forEach(line => lines.push(line));

    if (totalLines > maxLines) {
      // If we truncated, we might want to show a "more" indicator, but we need space for it.
      // Ideally, we'd reserve 1 line for this if needed, but for now let's just show it if we have at least 1 line.
      if (maxLines > 0) {
        // We don't have extra space reserved for this line, so we replace the last visible line
        // or just rely on the scrollbar logic in the status bar if we had one.
        // For now, let's just append it if there happens to be space due to rounding, 
        // or strictly, we should have reserved it. 
        // Let's keep it simple: if we are scrolling, the user knows.
        // But the original code had a specific line for it.
        // Let's try to squeeze it in if we can, or replace the last line.
        // Actually, let's just not show it to save space, the scrollbar in status is enough?
        // The original code had: lines.push(`${colors.dim}... ${totalLines - ...} more ...`)
        // Let's skip it to avoid overflow for now, or implement it by reducing maxLines by 1.
      }
    } else if (visibleLines.length === 0 && totalLines > 0) {
      // This happens if maxLines is 0.
      lines.push(`${colors.dim} (Terminal too small to show tracks) ${colors.reset}`);
    }

    // Append reserved content
    if (logLines.length > 0) {
      lines.push(...logLines);
    }

    if (showHelp) {
      lines.push('');
      lines.push(...helpLines);
    }

    // Fill blank lines until status bar
    const statusStartRow = Math.max(terminalHeight - statusLineCount, lines.length);
    const statusLines = buildStatusBar(terminalWidth, showExitWarning, ripple, statusStartRow);

    // Ensure we don't push past the limit before status bar
    while (lines.length < terminalHeight - statusLineCount) {
      lines.push('');
    }

    lines.push(...statusLines);

    this.writeFrame(lines);

    return { clampedOffset: scrollOffset, maxScroll: Math.max(0, totalLines - maxLines) };
  }
}
