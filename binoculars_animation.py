#!/usr/bin/env python3
"""
Binoculars Animation - A Matrix-style ASCII art animation for CLI installations

This script creates a cyberpunk/Matrix-style animation featuring binoculars ASCII art
with dynamic effects including Matrix rain, color transitions, and glitch effects.
Perfect for CLI tool installations or startup sequences.

Features:
- Matrix-style rain effect with falling binary digits
- Dynamic color transitions (green, bright green, cyan)
- Glitch effects and random intensity variations
- Professional installation-style messages
- Smooth frame transitions
- Terminal size adaptation
- Error handling and clean exits
- Interactive menu system

Usage:
    python3 binoculars_animation.py [options]

Options:
    --iterations N    Number of animation cycles (default: 3)
    --speed S         Animation speed in seconds (default: 0.2)
    --rain            Enable/disable Matrix rain effect (default: True)
    --intensity I     Effect intensity (0.1 to 1.0, default: 0.3)

Example:
    python3 binoculars_animation.py --iterations 5 --speed 0.1 --intensity 0.5
"""

import sys
import time
import random
import os
import argparse
from typing import List, Tuple, Dict

# ANSI escape codes for colors and styles
class Colors:
    """ANSI escape codes for terminal colors and styles."""
    GREEN = '\033[32m'        # Standard green
    BRIGHT_GREEN = '\033[92m'  # Bright green
    CYAN = '\033[36m'         # Cyan
    BLUE = '\033[34m'         # Blue
    RED = '\033[31m'          # Red
    RESET = '\033[0m'         # Reset all styles
    BOLD = '\033[1m'          # Bold text
    DIM = '\033[2m'           # Dim text
    YELLOW = '\033[33m'       # Yellow
    MAGENTA = '\033[35m'      # Magenta

class AnimationConfig:
    """Configuration class for animation settings."""
    def __init__(self):
        self.iterations = 3
        self.speed = 0.2
        self.rain = True
        self.intensity = 0.3
        self.color_scheme = "matrix"  # matrix, cyberpunk, glitch

def clear_screen():
    """Clear the terminal screen using the appropriate command for the OS."""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    """Print the application header."""
    clear_screen()
    print(f"{Colors.CYAN}{Colors.BOLD}Binoculars Animation{Colors.RESET}")
    print(f"{Colors.DIM}Matrix-style ASCII art animation for CLI installations{Colors.RESET}")
    print()

def print_menu(config: AnimationConfig):
    """Print the interactive menu with current settings."""
    print_header()
    print(f"{Colors.YELLOW}Current Configuration:{Colors.RESET}")
    print(f"1. Iterations: {config.iterations}")
    print(f"2. Speed: {config.speed:.2f}s")
    print(f"3. Rain Effect: {'Enabled' if config.rain else 'Disabled'}")
    print(f"4. Intensity: {config.intensity:.1f}")
    print(f"5. Color Scheme: {config.color_scheme}")
    print()
    print(f"{Colors.YELLOW}Actions:{Colors.RESET}")
    print("6. Preview Animation")
    print("7. Run Full Animation")
    print("8. Save Configuration")
    print("9. Exit")
    print()
    return input(f"{Colors.GREEN}Select an option (1-9): {Colors.RESET}")

def get_valid_input(prompt: str, min_val: float, max_val: float, is_int: bool = False) -> float:
    """Get valid numeric input from user."""
    while True:
        try:
            value = input(prompt)
            if is_int:
                value = int(value)
            else:
                value = float(value)
            if min_val <= value <= max_val:
                return value
            print(f"{Colors.RED}Please enter a value between {min_val} and {max_val}{Colors.RESET}")
        except ValueError:
            print(f"{Colors.RED}Please enter a valid number{Colors.RESET}")

def configure_iterations(config: AnimationConfig):
    """Configure the number of animation iterations."""
    print_header()
    print(f"{Colors.YELLOW}Configure Iterations{Colors.RESET}")
    config.iterations = get_valid_input(
        f"Enter number of iterations (1-10): ",
        1, 10, True
    )

def configure_speed(config: AnimationConfig):
    """Configure the animation speed."""
    print_header()
    print(f"{Colors.YELLOW}Configure Speed{Colors.RESET}")
    config.speed = get_valid_input(
        f"Enter animation speed in seconds (0.05-1.0): ",
        0.05, 1.0
    )

def configure_rain(config: AnimationConfig):
    """Toggle the rain effect."""
    print_header()
    print(f"{Colors.YELLOW}Configure Rain Effect{Colors.RESET}")
    config.rain = input("Enable rain effect? (y/n): ").lower() == 'y'

def configure_intensity(config: AnimationConfig):
    """Configure the effect intensity."""
    print_header()
    print(f"{Colors.YELLOW}Configure Intensity{Colors.RESET}")
    config.intensity = get_valid_input(
        f"Enter effect intensity (0.1-1.0): ",
        0.1, 1.0
    )

def configure_color_scheme(config: AnimationConfig):
    """Configure the color scheme."""
    print_header()
    print(f"{Colors.YELLOW}Configure Color Scheme{Colors.RESET}")
    print("1. Matrix (Green)")
    print("2. Cyberpunk (Cyan)")
    print("3. Glitch (Mixed)")
    choice = get_valid_input("Select color scheme (1-3): ", 1, 3, True)
    schemes = {1: "matrix", 2: "cyberpunk", 3: "glitch"}
    config.color_scheme = schemes[choice]

def save_config(config: AnimationConfig):
    """Save the current configuration to a file."""
    print_header()
    print(f"{Colors.YELLOW}Save Configuration{Colors.RESET}")
    filename = input("Enter filename to save configuration: ")
    try:
        with open(filename, 'w') as f:
            f.write(f"iterations={config.iterations}\n")
            f.write(f"speed={config.speed}\n")
            f.write(f"rain={config.rain}\n")
            f.write(f"intensity={config.intensity}\n")
            f.write(f"color_scheme={config.color_scheme}\n")
        print(f"{Colors.GREEN}Configuration saved to {filename}{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}Error saving configuration: {e}{Colors.RESET}")
    input("Press Enter to continue...")

def load_config(config: AnimationConfig, filename: str):
    """Load configuration from a file."""
    try:
        with open(filename, 'r') as f:
            for line in f:
                key, value = line.strip().split('=')
                if key == 'iterations':
                    config.iterations = int(value)
                elif key == 'speed':
                    config.speed = float(value)
                elif key == 'rain':
                    config.rain = value.lower() == 'true'
                elif key == 'intensity':
                    config.intensity = float(value)
                elif key == 'color_scheme':
                    config.color_scheme = value
    except Exception as e:
        print(f"{Colors.RED}Error loading configuration: {e}{Colors.RESET}")
        input("Press Enter to continue...")

def get_color_scheme(config: AnimationConfig) -> List[str]:
    """Get the color scheme based on configuration."""
    if config.color_scheme == "matrix":
        return [Colors.GREEN, Colors.BRIGHT_GREEN]
    elif config.color_scheme == "cyberpunk":
        return [Colors.CYAN, Colors.BLUE]
    else:  # glitch
        return [Colors.GREEN, Colors.CYAN, Colors.MAGENTA, Colors.RED]

def load_frames(filename: str) -> List[List[str]]:
    """
    Load ASCII art frames from a file.
    
    Args:
        filename (str): Path to the ASCII art file
        
    Returns:
        List[List[str]]: List of frames, where each frame is a list of strings
        
    The file should contain frames separated by 'Frame N:' headers.
    """
    frames = []
    current_frame = []
    
    with open(filename, 'r') as file:
        for line in file:
            if line.startswith('Frame'):
                if current_frame:
                    frames.append(current_frame)
                current_frame = []
            elif line.strip():
                current_frame.append(line.rstrip())
    
    if current_frame:
        frames.append(current_frame)
    
    return frames

def matrix_rain_effect(width: int, height: int) -> List[str]:
    """
    Generate a Matrix-style rain effect of falling binary digits.
    
    Args:
        width (int): Width of the rain effect
        height (int): Height of the rain effect
        
    Returns:
        List[str]: List of strings representing the rain effect
    """
    chars = "01"
    rain = []
    for _ in range(height):
        rain.append(''.join(random.choice(chars) for _ in range(width)))
    return rain

def apply_matrix_effect(frame: List[str], config: AnimationConfig) -> List[Tuple[str, str]]:
    """Apply Matrix-style effects to a frame of ASCII art."""
    result = []
    colors = get_color_scheme(config)
    for line in frame:
        styled_line = []
        for char in line:
            if char != ' ':
                if random.random() < config.intensity:
                    color = random.choice(colors)
                    styled_line.append((char, color))
                else:
                    styled_line.append((char, colors[0]))
            else:
                styled_line.append((char, ''))
        result.append(styled_line)
    return result

def print_frame(styled_frame: List[Tuple[str, str]], rain_effect: bool = True):
    """
    Print a styled frame with optional rain effect.
    
    Args:
        styled_frame (List[Tuple[str, str]]): The frame to print with color information
        rain_effect (bool): Whether to include the Matrix rain effect
    """
    height = len(styled_frame)
    width = max(len(line) for line in styled_frame)
    
    if rain_effect:
        rain = matrix_rain_effect(width, height)
    
    for y, line in enumerate(styled_frame):
        for x, (char, color) in enumerate(line):
            if char == ' ':
                if rain_effect and random.random() < 0.1:
                    sys.stdout.write(f"{Colors.DIM}{Colors.GREEN}{random.choice('01')}{Colors.RESET}")
                else:
                    sys.stdout.write(' ')
            else:
                sys.stdout.write(f"{color}{char}{Colors.RESET}")
        sys.stdout.write('\n')
    
    sys.stdout.flush()

def animate_installation(frames: List[List[str]], config: AnimationConfig, preview: bool = False):
    """Animate the installation sequence with Matrix-style effects."""
    clear_screen()
    
    if not preview:
        print(f"{Colors.CYAN}Initializing email monitor...{Colors.RESET}")
        time.sleep(1)
    
    iterations = 1 if preview else config.iterations
    
    for _ in range(iterations):
        if config.rain:
            for _ in range(5):
                clear_screen()
                rain_effect = matrix_rain_effect(40, 12)
                print('\n'.join(Colors.DIM + get_color_scheme(config)[0] + line + Colors.RESET for line in rain_effect))
                time.sleep(0.1)
        
        for frame in frames:
            clear_screen()
            styled_frame = apply_matrix_effect(frame, config)
            print_frame(styled_frame, config.rain)
            time.sleep(config.speed)
    
    if not preview:
        clear_screen()
        styled_frame = apply_matrix_effect(frames[0], config)
        print_frame(styled_frame, rain_effect=False)
        print(f"\n{Colors.BRIGHT_GREEN}Email monitor initialized successfully.{Colors.RESET}")
        input("Press Enter to continue...")

def main():
    """Main entry point for the script."""
    config = AnimationConfig()
    
    # Try to load default configuration if it exists
    if os.path.exists('binoculars_config.txt'):
        load_config(config, 'binoculars_config.txt')
    
    while True:
        choice = print_menu(config)
        
        if choice == '1':
            configure_iterations(config)
        elif choice == '2':
            configure_speed(config)
        elif choice == '3':
            configure_rain(config)
        elif choice == '4':
            configure_intensity(config)
        elif choice == '5':
            configure_color_scheme(config)
        elif choice == '6':
            frames = load_frames('binoculars_ascii.txt')
            animate_installation(frames, config, preview=True)
        elif choice == '7':
            frames = load_frames('binoculars_ascii.txt')
            animate_installation(frames, config)
        elif choice == '8':
            save_config(config)
        elif choice == '9':
            print(f"{Colors.CYAN}Goodbye!{Colors.RESET}")
            sys.exit(0)
        else:
            print(f"{Colors.RED}Invalid option. Please try again.{Colors.RESET}")
            time.sleep(1)

if __name__ == "__main__":
    main() 