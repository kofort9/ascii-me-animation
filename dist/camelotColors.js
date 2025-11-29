"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCamelotColor = getCamelotColor;
const CAMELOT_COLORS = {
    '1A': '#2bdce0',
    '2A': '#1db9ff',
    '3A': '#438eff',
    '4A': '#5c6bff',
    '5A': '#7c52ff',
    '6A': '#9f4dff',
    '7A': '#c14fff',
    '8A': '#e54faa',
    '9A': '#ff7a72',
    '10A': '#ffae54',
    '11A': '#ffd166',
    '12A': '#b7e36c',
    '1B': '#2de2c7',
    '2B': '#26d7ae',
    '3B': '#2ac48f',
    '4B': '#3eb479',
    '5B': '#54a66d',
    '6B': '#6d9c6e',
    '7B': '#889d78',
    '8B': '#a6a182',
    '9B': '#c3a47e',
    '10B': '#e2a16f',
    '11B': '#f68f60',
    '12B': '#ff7f6e',
};
function getCamelotColor(key) {
    const normalized = key.toUpperCase();
    return CAMELOT_COLORS[normalized] ?? '#9ca3af';
}
