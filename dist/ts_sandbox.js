#!/usr/bin/env ts-node
"use strict";
/**
 * Lightweight TypeScript sandbox for the SpotifyDJ animation components.
 *
 * Provides quick shortcuts to:
 * - Render the train-board UI with demo data
 * - Play the split-flap flip animation for track/artist
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const spotifydj_1 = require("./spotifydj");
const spotifydj_animation_1 = require("./spotifydj_animation");
const types_1 = require("./types");
const DEMOS = {
    board: {
        key: 'board',
        shortcut: 'b',
        name: 'SpotifyDJ train-board (demo data)',
        note: 'matches spotifydj.txt snapshot',
        run: runBoardDemo,
    },
    flip: {
        key: 'flip',
        shortcut: 'f',
        name: 'Flip-clock animation (track + artist)',
        note: 'uses runFlipClockAnimation',
        run: runFlipDemo,
    },
};
function clearScreen() {
    process.stdout.write('\x1b[2J\x1b[H');
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function buildSampleTrack() {
    return {
        track_name: 'Asibe Happy',
        artist: 'Kabza De Small, DJ Maphorisa, Ami Faku',
        camelot_key: '9A',
        progress_ms: 142000,
        duration_ms: 325000,
        timestamp: Date.now(),
        isPlaying: true,
        audio_features: {
            tempo: 113,
            time_signature: 4,
        },
    };
}
function buildSampleRecommendations() {
    return [
        { track_name: 'MISSION', artist: 'SoFaygo', camelot_key: '10A', bpm: 156.9, shiftType: types_1.ShiftType.ENERGY_UP },
        { track_name: '2AM', artist: 'SZA', camelot_key: '8A', bpm: 84.0, shiftType: types_1.ShiftType.MOOD_SWITCH },
        { track_name: 'Designer Thangs', artist: 'tana', camelot_key: '10A', bpm: 180.0, shiftType: types_1.ShiftType.ENERGY_UP },
        { track_name: 'Tralala (feat. JayO)', artist: 'Aya Nakamura;JayO', camelot_key: '9A', bpm: 92.0, shiftType: types_1.ShiftType.SMOOTH },
        { track_name: 'BACK IN THE MIX', artist: 'SoFaygo', camelot_key: '9A', bpm: 134.0, shiftType: types_1.ShiftType.ENERGY_UP },
        { track_name: 'shiloh type beat', artist: 'Jessy Blakemore', camelot_key: '8A', bpm: 121.6, shiftType: types_1.ShiftType.SMOOTH },
        { track_name: 'I Want Her Too', artist: 'Artie J', camelot_key: '10A', bpm: 90.0, shiftType: types_1.ShiftType.MOOD_SWITCH },
        { track_name: 'Bad News Benji', artist: 'Benji Blue Bills', camelot_key: '9A', bpm: 166.0, shiftType: types_1.ShiftType.ENERGY_UP },
        { track_name: 'My Will', artist: 'Leon Thomas', camelot_key: '8A', bpm: 140.1, shiftType: types_1.ShiftType.RHYTHMIC_BREAKER },
        { track_name: "i can't feel my face (feat. Nechie)", artist: 'Gunna;Nechie', camelot_key: '8A', bpm: 127.0, shiftType: types_1.ShiftType.SMOOTH },
    ];
}
async function runBoardDemo() {
    const renderer = new spotifydj_1.TerminalRenderer();
    const phraseCounter = new spotifydj_1.PhraseCounter();
    const currentTrack = buildSampleTrack();
    const recommendations = buildSampleRecommendations();
    const notices = ['Demo mode - static snapshot that mirrors spotifydj.txt'];
    renderer.resetFrameCache();
    clearScreen();
    const runtimeMs = 8000;
    const intervalMs = 150;
    const start = Date.now();
    while (Date.now() - start < runtimeMs) {
        const phraseInfo = phraseCounter.calculate(currentTrack.audio_features.tempo, currentTrack.progress_ms, currentTrack.timestamp, currentTrack.audio_features.time_signature, currentTrack.isPlaying);
        renderer.renderTrainBoard(currentTrack, recommendations, phraseInfo, false, undefined, [], 'ALL', 0, false, notices, recommendations.length);
        await sleep(intervalMs);
    }
}
async function runFlipDemo() {
    const renderer = new spotifydj_1.TerminalRenderer();
    const recommendations = buildSampleRecommendations();
    const baseTrack = buildSampleTrack();
    const notices = ['Flip animation demo - track/artist will resolve over time'];
    renderer.resetFrameCache();
    clearScreen();
    await (0, spotifydj_animation_1.runFlipClockAnimation)(baseTrack.track_name, baseTrack.artist, (animatedTrack, animatedArtist) => {
        const animated = { ...baseTrack, track_name: animatedTrack, artist: animatedArtist };
        renderer.renderTrainBoard(animated, recommendations, null, false, undefined, [], 'ALL', 0, false, notices, recommendations.length);
    });
}
function listShortcuts() {
    console.log('Available TS animation shortcuts:');
    Object.values(DEMOS).forEach(demo => {
        const note = demo.note ? ` - ${demo.note}` : '';
        console.log(`  [${demo.shortcut}] ${demo.name}${note}`);
    });
}
function createInterface() {
    return readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}
function ask(rl, prompt) {
    return new Promise(resolve => {
        rl.question(prompt, answer => resolve(answer.trim()));
    });
}
async function interactiveMenu() {
    const rl = createInterface();
    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            clearScreen();
            console.log('TS Animation Sandbox\n');
            listShortcuts();
            console.log("  [q] Quit");
            const choice = (await ask(rl, '\nShortcut: ')).toLowerCase();
            if (!choice)
                continue;
            if (choice === 'q')
                break;
            const demo = Object.values(DEMOS).find(d => d.shortcut === choice);
            if (!demo) {
                console.log(`Unknown shortcut "${choice}".`);
                await sleep(700);
                continue;
            }
            await demo.run();
            console.log('\nPress Enter to return to the sandbox menu...');
            await ask(rl, '');
        }
    }
    finally {
        rl.close();
    }
}
function parseArgRun() {
    const arg = process.argv.find(entry => entry.startsWith('--run='));
    if (!arg)
        return null;
    const value = arg.split('=')[1];
    if (value === 'board' || value === 'flip')
        return value;
    return null;
}
async function main() {
    if (process.argv.includes('--list')) {
        listShortcuts();
        return;
    }
    const runKey = parseArgRun();
    if (runKey) {
        await DEMOS[runKey].run();
        return;
    }
    await interactiveMenu();
}
process.on('SIGINT', () => {
    clearScreen();
    process.exit(0);
});
main().catch(err => {
    console.error('TS sandbox failed:', err);
    process.exit(1);
});
