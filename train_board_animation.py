#!/usr/bin/env python3
"""
Mechanical split-flap style train board that cycles wait times.

Simulates a station board with rows that flip characters into place. Each row
rotates through a short sequence of statuses (minutes → arriving → boarding).
Press 'q' to quit.
"""

import curses
import random
import time
from typing import Dict, List

CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-'."
FRAME_TIME = 1 / 40.0
FLIP_MIN = 2
FLIP_MAX = 9
ROW_ADVANCE_RANGE = (5.5, 11.0)
MIN_ROW_WIDTH = 54
MAX_ROW_WIDTH = 96
MANUAL_STEP_KEYS = {ord("n"), ord("N"), ord(" ")}  # Advance immediately
RESET_KEYS = {ord("r"), ord("R")}  # Reset board to first entries

def seed_flap_counts(current: List[str], target: List[str]) -> List[int]:
    """Return per-character flip counts for positions that need to change."""
    counters: List[int] = []
    for cur, tgt in zip(current, target):
        if cur != tgt:
            counters.append(random.randint(FLIP_MIN, FLIP_MAX))
        else:
            counters.append(0)
    return counters

# Sample sequences each row will cycle through
SCHEDULES: List[List[Dict[str, str]]] = [
    [
        {"time": "08:24", "line": "RED", "dest": "DOWNTOWN", "track": "2", "status": "4 MIN"},
        {"time": "08:24", "line": "RED", "dest": "DOWNTOWN", "track": "2", "status": "2 MIN"},
        {"time": "08:24", "line": "RED", "dest": "DOWNTOWN", "track": "2", "status": "ARRIVING"},
        {"time": "08:24", "line": "RED", "dest": "DOWNTOWN", "track": "2", "status": "BOARDING"},
        {"time": "08:24", "line": "RED", "dest": "DOWNTOWN", "track": "2", "status": "DEPARTED"},
    ],
    [
        {"time": "08:32", "line": "YELLOW", "dest": "AIRPORT", "track": "1", "status": "10 MIN"},
        {"time": "08:32", "line": "YELLOW", "dest": "AIRPORT", "track": "1", "status": "8 MIN"},
        {"time": "08:32", "line": "YELLOW", "dest": "AIRPORT", "track": "1", "status": "5 MIN"},
        {"time": "08:32", "line": "YELLOW", "dest": "AIRPORT", "track": "1", "status": "2 MIN"},
        {"time": "08:32", "line": "YELLOW", "dest": "AIRPORT", "track": "1", "status": "ARRIVING"},
    ],
    [
        {"time": "08:45", "line": "GREEN", "dest": "RIVERSIDE", "track": "3", "status": "13 MIN"},
        {"time": "08:45", "line": "GREEN", "dest": "RIVERSIDE", "track": "3", "status": "11 MIN"},
        {"time": "08:45", "line": "GREEN", "dest": "RIVERSIDE", "track": "3", "status": "7 MIN"},
        {"time": "08:45", "line": "GREEN", "dest": "RIVERSIDE", "track": "3", "status": "BOARDING"},
    ],
    [
        {"time": "09:02", "line": "BLUE", "dest": "HARBOR POINT", "track": "4", "status": "21 MIN"},
        {"time": "09:02", "line": "BLUE", "dest": "HARBOR POINT", "track": "4", "status": "18 MIN"},
        {"time": "09:02", "line": "BLUE", "dest": "HARBOR POINT", "track": "4", "status": "15 MIN"},
        {"time": "09:02", "line": "BLUE", "dest": "HARBOR POINT", "track": "4", "status": "ON TIME"},
    ],
]


class SplitFlapRow:
    def __init__(self, width: int):
        self.width = width
        self.current = [" "] * width
        self.target = [" "] * width
        self.counters = [0] * width

    def set_target(self, text: str) -> None:
        # Set a new destination string and seed flap counts for characters that need to change
        padded = text.upper().ljust(self.width)[: self.width]
        self.target = list(padded)
        self.counters = seed_flap_counts(self.current, self.target)

    def step(self) -> bool:
        """Advance flipping characters one tick; returns True if any flipped."""
        active = False
        for i, count in enumerate(self.counters):
            if count > 0:
                # Spin forward in the charset to mimic physical flaps cycling
                idx = CHARSET.find(self.current[i])
                idx = 0 if idx == -1 else idx
                self.current[i] = CHARSET[(idx + 1) % len(CHARSET)]
                self.counters[i] -= 1
                active = True
            else:
                self.current[i] = self.target[i]
        return active

    def render(self) -> str:
        return "".join(self.current)


def format_entry(entry: Dict[str, str], width: int) -> str:
    # Compute column widths and return a padded line ready for display
    time_w = 5
    line_w = 8
    track_w = 3
    gap = 2 * 3  # between fields

    remaining = max(10, width - (time_w + line_w + track_w + gap))
    dest_w = max(10, int(remaining * 0.55))
    status_w = max(6, remaining - dest_w)

    time_field = entry["time"]
    line_field = entry["line"]
    dest_field = entry["dest"]
    track_field = entry["track"]
    status_field = entry["status"]

    return (
        f"{time_field:<{time_w}}  "
        f"{line_field:<{line_w}}  "
        f"{dest_field:<{dest_w}}  "
        f"{track_field:>{track_w}}  "
        f"{status_field:<{status_w}}"
    )


def draw_board(stdscr, rows: List[SplitFlapRow], header: str, x: int, y: int) -> None:
    stdscr.attron(curses.A_BOLD)
    stdscr.addstr(y, x, header)
    stdscr.attroff(curses.A_BOLD)
    stdscr.addstr(y + 1, x, "TIME   LINE      DESTINATION               TRK  STATUS")
    stdscr.addstr(y + 2, x, "-" * max(10, len(rows[0].render())))

    for i, row in enumerate(rows):
        # Print each row; could be styled differently when flipping
        stdscr.addstr(y + 3 + i, x, row.render())


def animate_board(stdscr) -> None:
    curses.curs_set(0)
    stdscr.nodelay(True)
    curses.use_default_colors()

    prev_width = -1
    rows: List[SplitFlapRow] = []
    pointers = [0] * len(SCHEDULES)
    next_change = [0.0] * len(SCHEDULES)

    def init_rows(term_width: int) -> None:
        nonlocal rows, prev_width, next_change
        # Allocate rows sized to the current terminal and seed first entries
        row_width = max(MIN_ROW_WIDTH, min(term_width - 4, MAX_ROW_WIDTH))
        rows = [SplitFlapRow(row_width) for _ in SCHEDULES]
        for idx, seq in enumerate(SCHEDULES):
            pointers[idx] = 0
            rows[idx].set_target(format_entry(seq[0], row_width))
        next_change = [time.time() + random.uniform(*ROW_ADVANCE_RANGE) for _ in SCHEDULES]
        prev_width = term_width

    def reset_board() -> None:
        """Return all rows to their first schedule entry and refresh timers."""
        for idx, seq in enumerate(SCHEDULES):
            pointers[idx] = 0
            rows[idx].set_target(format_entry(seq[0], rows[idx].width))
            next_change[idx] = time.time() + random.uniform(*ROW_ADVANCE_RANGE)

    def advance_all() -> None:
        """Advance every row one entry immediately."""
        now = time.time()
        for idx, seq in enumerate(SCHEDULES):
            pointers[idx] = (pointers[idx] + 1) % len(seq)
            rows[idx].set_target(format_entry(seq[pointers[idx]], rows[idx].width))
            next_change[idx] = now + random.uniform(*ROW_ADVANCE_RANGE)

    init_rows(stdscr.getmaxyx()[1])

    while True:
        start = time.time()
        height, width = stdscr.getmaxyx()
        if width != prev_width:
            # Rebuild rows on resize
            init_rows(width)

        try:
            key = stdscr.getch()
        except curses.error:
            key = -1
        if key in (ord("q"), ord("Q")):
            break
        if key in MANUAL_STEP_KEYS:
            advance_all()
        if key in RESET_KEYS:
            reset_board()

        now = time.time()
        for idx, seq in enumerate(SCHEDULES):
            if now >= next_change[idx]:
                # Auto-advance rows when their timers elapse
                pointers[idx] = (pointers[idx] + 1) % len(seq)
                rows[idx].set_target(format_entry(seq[pointers[idx]], rows[idx].width))
                next_change[idx] = now + random.uniform(*ROW_ADVANCE_RANGE)
            # Tick the flip animation on every frame
            rows[idx].step()

        stdscr.erase()
        header = "MECHANICAL TRAIN BOARD — NEXT DEPARTURES"
        board_x = max(0, (width - rows[0].width) // 2)
        board_y = max(0, (height - (len(rows) + 6)) // 2)
        draw_board(stdscr, rows, header, board_x, board_y)
        stdscr.addstr(board_y + len(rows) + 4, board_x, "Controls: q quit  n/space advance  r reset")
        stdscr.refresh()

        elapsed = time.time() - start
        time.sleep(max(0.0, FRAME_TIME - elapsed))


def main() -> None:
    curses.wrapper(animate_board)


if __name__ == "__main__":
    main()
