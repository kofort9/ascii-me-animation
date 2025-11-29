#!/usr/bin/env python3
"""
Diagonal ripple animation that fills the terminal.

It treats the terminal as a shallow square of water and drops a stone in the
top-left corner. The resulting waves propagate diagonally across the screen
with a lightweight numerical wave simulation and shaded ASCII surface.

Controls:
- Press 'q' to quit.
"""

import curses
import math
import time
from typing import List, Tuple


GRADIENT = " .:-=+*#%~"
DAMPING = 0.997
DROP_INTERVAL = 2.2
DROP_STRENGTH = 4.0
FRAME_TIME = 1 / 45.0
WAVE_AMPLITUDE = 0.32
WAVE_WAVELENGTH = 32.0
WAVE_SPEED = 0.65
DIAG_ACCEL = 0.22
DIAG_EASE = 0.018
DIAG_PHASE_CLAMP = 10.0  # Prevents exponential overflow


def allocate_buffers(height: int, width: int) -> Tuple[List[List[float]], List[List[float]]]:
    """Create two padded height maps so edges stay stable."""
    return (
        [[0.0] * (width + 2) for _ in range(height + 2)],
        [[0.0] * (width + 2) for _ in range(height + 2)],
    )


def add_drop(buffer: List[List[float]], strength: float = DROP_STRENGTH) -> None:
    """Inject energy at the top-left corner and a small diagonal smear."""
    buffer[1][1] += strength
    buffer[1][2] += strength * 0.6
    buffer[2][1] += strength * 0.6
    buffer[2][2] += strength * 0.35


def add_background_waves(buffer: List[List[float]], t_elapsed: float, height: int, width: int) -> None:
    """Continuously feed gentle traveling waves with an accelerating diagonal push."""
    k = (2.0 * math.pi) / WAVE_WAVELENGTH
    phase_linear = t_elapsed * WAVE_SPEED
    # Clamp the exponential term to avoid OverflowError on long runs
    phase_diag = math.expm1(min(t_elapsed * DIAG_ACCEL, DIAG_PHASE_CLAMP)) * WAVE_SPEED
    top_amp = WAVE_AMPLITUDE * 0.45
    side_amp = WAVE_AMPLITUDE * 0.35
    diag_amp = WAVE_AMPLITUDE * 0.6

    for x in range(1, width + 1):
        buffer[1][x] += math.sin(x * k - phase_linear) * top_amp

    for y in range(1, height + 1):
        buffer[y][1] += math.sin(y * k - phase_linear * 0.9 + 0.8) * side_amp

    diag_len = min(height, width)
    for d in range(1, diag_len + 1):  # Dense diagonal to show the accelerating wave
        envelope = 1.0 - math.exp(-d * DIAG_EASE)
        buffer[d][d] += math.sin(d * k - phase_diag) * diag_amp * envelope


def init_colors() -> None:
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_CYAN, -1)   # Crests
    curses.init_pair(2, curses.COLOR_BLUE, -1)   # Troughs
    curses.init_pair(3, curses.COLOR_WHITE, -1)  # Highlights


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def render_frame(stdscr, grid: List[List[float]], height: int, width: int) -> None:
    """Render the water surface with shaded characters and color accents."""
    stdscr.erase()
    max_amp = 6.0  # Prevents over-bright highlights on large terminals

    for y in range(1, height + 1):
        screen_y = y - 1
        for x in range(1, width + 1):
            amp = grid[y][x]
            norm = clamp((amp / max_amp + 1.0) * 0.5, 0.0, 1.0)
            char = GRADIENT[int(norm * (len(GRADIENT) - 1))]
            if abs(amp) < 0.05:
                char = " "

            color = 0
            if amp > 0.9:
                color = curses.color_pair(3) | curses.A_BOLD
            elif amp > 0.25:
                color = curses.color_pair(1)
            elif amp < -0.35:
                color = curses.color_pair(2)

            try:
                stdscr.addch(screen_y, x - 1, char, color)
            except curses.error:
                pass  # Avoid crashes on rapid resizes

    stdscr.refresh()


def step_wave(
    prev: List[List[float]],
    curr: List[List[float]],
    height: int,
    width: int,
) -> List[List[float]]:
    """Advance the wave using a simple damped numerical integration."""
    next_state = [[0.0] * (width + 2) for _ in range(height + 2)]
    diag_weight = 0.7
    weight_sum = 4 + 4 * diag_weight

    for y in range(1, height + 1):
        for x in range(1, width + 1):
            neighbor_sum = (
                prev[y - 1][x]
                + prev[y + 1][x]
                + prev[y][x - 1]
                + prev[y][x + 1]
                + diag_weight * (prev[y - 1][x - 1] + prev[y - 1][x + 1] + prev[y + 1][x - 1] + prev[y + 1][x + 1])
            )
            neighbor_avg = neighbor_sum / weight_sum
            next_state[y][x] = (neighbor_avg * 2 - curr[y][x]) * DAMPING

    return next_state


def animate(stdscr) -> None:
    curses.curs_set(0)
    stdscr.nodelay(True)
    init_colors()

    height, width = stdscr.getmaxyx()
    height = max(4, height - 1)
    width = max(4, width)
    prev, curr = allocate_buffers(height, width)
    add_drop(prev)
    last_drop = time.time()
    start_time = time.time()

    while True:
        start = time.time()
        try:
            key = stdscr.getch()
        except curses.error:
            key = -1
        if key in (ord("q"), ord("Q")):
            break

        # Handle terminal resizes smoothly
        new_h, new_w = stdscr.getmaxyx()
        new_h = max(4, new_h - 1)
        new_w = max(4, new_w)
        if new_h != height or new_w != width:
            height, width = new_h, new_w
            prev, curr = allocate_buffers(height, width)
            add_drop(prev)

        # Periodic drops to keep motion alive
        now = time.time()
        if now - last_drop > DROP_INTERVAL:
            add_drop(prev)
            last_drop = now

        elapsed = now - start_time
        add_background_waves(prev, elapsed, height, width)

        next_state = step_wave(prev, curr, height, width)
        render_frame(stdscr, next_state, height, width)
        prev, curr = curr, next_state

        elapsed = time.time() - start
        time.sleep(max(0.0, FRAME_TIME - elapsed))


def main() -> None:
    curses.wrapper(animate)


if __name__ == "__main__":
    main()
