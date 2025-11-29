#!/usr/bin/env python3
"""
Interactive sandbox launcher for the local ASCII animations.

Runs each animation script in its own subprocess so curses sessions do not
collide. Use the single-character shortcuts to start an animation and return
to the menu when it exits.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable


@dataclass(frozen=True)
class Animation:
    shortcut: str
    name: str
    script: str
    args: tuple[str, ...] = ()
    note: str = ""


ROOT = Path(__file__).resolve().parent

ANIMATIONS: Dict[str, Animation] = {
    "b": Animation("b", "Binoculars install (Matrix vibe)", "binoculars_animation.py"),
    "t": Animation("t", "Split-flap train board", "train_board_animation.py"),
    "w": Animation("w", "Diagonal ripple water", "ripple_water_animation.py"),
    "m": Animation("m", "Manga TV static reveal", "animate_ascii.py"),
}


def clear_screen() -> None:
    """Basic terminal clear that works in POSIX shells."""
    print("\033[2J\033[H", end="")


def list_shortcuts(anims: Iterable[Animation]) -> None:
    print("Available shortcuts:")
    for anim in sorted(anims, key=lambda a: a.shortcut):
        note = f" — {anim.note}" if anim.note else ""
        print(f"  [{anim.shortcut}] {anim.name}{note}  -> {anim.script}")


def run_animation(shortcut: str) -> int:
    key = shortcut.lower()
    anim = ANIMATIONS.get(key)
    if not anim:
        print(f"Unknown shortcut '{shortcut}'. Use --list to see options.")
        return 1

    script_path = ROOT / anim.script
    if not script_path.exists():
        print(f"Script not found: {script_path}")
        return 1

    clear_screen()
    print(f"Launching {anim.name} ({anim.script})")
    print("Press Ctrl+C to return to the sandbox menu.\n")

    cmd = [sys.executable, str(script_path), *anim.args]
    try:
        result = subprocess.run(cmd)
        return result.returncode
    except KeyboardInterrupt:
        # Bubble a polite exit code when the user cancels a child animation
        return 130
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Failed to launch {anim.script}: {exc}")
        return 1


def interactive_loop() -> None:
    while True:
        clear_screen()
        print("ASCII Animation Sandbox\n")
        list_shortcuts(ANIMATIONS.values())
        print("\nPress a shortcut letter to launch, or 'q' to quit.")

        choice = input("\nShortcut: ").strip().lower()
        if not choice:
            continue
        if choice in {"q", "quit", "exit"}:
            break

        run_animation(choice)
        input("\nPress Enter to return to the sandbox menu...")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run local ASCII animations via shortcuts from a safe launcher."
    )
    parser.add_argument("-l", "--list", action="store_true", help="list shortcuts and exit")
    parser.add_argument("-r", "--run", metavar="SHORTCUT", help="run one animation and exit")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.list:
        list_shortcuts(ANIMATIONS.values())
        return

    if args.run:
        sys.exit(run_animation(args.run))

    interactive_loop()


if __name__ == "__main__":
    main()
