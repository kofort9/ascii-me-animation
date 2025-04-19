import curses
import time
import random
import os
import argparse
import shutil

def load_ascii_art(filename):
    with open(filename, 'r') as file:
        return [line.rstrip('\n') for line in file.readlines()]

def generate_static(width, height, offset=0, vertical_offset=0):
    # More varied characters for realistic static
    static_chars = "█▓▒░#@*+=-:. "  # Main characters
    noise_chars = "·•°○●"  # Additional noise characters
    
    static = []
    for y in range(height):
        line = []
        for x in range(width + 20):  # Extra width for horizontal movement
            # Create more realistic noise pattern
            if random.random() < 0.7:  # 70% chance of main static
                char = random.choice(static_chars)
            else:  # 30% chance of noise
                char = random.choice(noise_chars)
            
            # Add vertical movement effect
            if (y + vertical_offset) % 3 == 0 and random.random() < 0.3:
                char = ' '  # Create scan lines
            
            line.append(char)
        
        # Apply horizontal offset
        line = ''.join(line[offset % 20:offset % 20 + width])
        static.append(line)
    return static

def get_terminal_size():
    terminal_size = shutil.get_terminal_size()
    return terminal_size.lines, terminal_size.columns

def show_error_and_exit(message):
    print("\033[2J\033[H")  # Clear screen and move cursor to top
    print(message)
    time.sleep(2)
    exit(1)

def scale_art(art, target_width, target_height):
    if not art:
        return art
    
    original_height = len(art)
    original_width = len(art[0])
    
    # Calculate scaling factors
    width_scale = target_width / original_width
    height_scale = target_height / original_height
    
    # Use the smaller scale to maintain aspect ratio
    scale = min(width_scale, height_scale)
    
    # Calculate new dimensions
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    # Create scaled art
    scaled_art = []
    for y in range(new_height):
        line = []
        for x in range(new_width):
            # Map new coordinates to original
            orig_x = int(x / scale)
            orig_y = int(y / scale)
            line.append(art[orig_y][orig_x])
        scaled_art.append(''.join(line))
    
    return scaled_art

def animate_tv_effect(stdscr, original_art, static_duration, transition_duration):
    # Hide cursor
    curses.curs_set(0)
    
    # Initialize variables
    last_term_height, last_term_width = 0, 0
    scaled_art = None
    start_time = time.time()
    horizontal_offset = 0
    vertical_offset = 0
    
    while True:
        # Get current terminal size
        term_height, term_width = get_terminal_size()
        
        # Only rescale if terminal size changed
        if term_height != last_term_height or term_width != last_term_width:
            # Clear screen
            stdscr.clear()
            
            # Scale the art to fit the terminal
            scaled_art = scale_art(original_art, term_width, term_height)
            
            # Update last known dimensions
            last_term_height, last_term_width = term_height, term_width
            
            # Get dimensions of scaled art
            height = len(scaled_art)
            width = len(scaled_art[0]) if height > 0 else 0
            
            # Calculate center position
            start_y = (term_height - height) // 2
            start_x = (term_width - width) // 2
        
        current_time = time.time() - start_time
        
        # Update movement offsets
        horizontal_offset = int((time.time() * 40) % 20)  # Faster horizontal movement
        vertical_offset = int((time.time() * 10) % 3)     # Vertical scan line movement
        
        if current_time < static_duration:
            # Pure static phase with movement
            static = generate_static(width, height, horizontal_offset, vertical_offset)
            for y, line in enumerate(static):
                screen_y = start_y + y
                for x, char in enumerate(line):
                    screen_x = start_x + x
                    try:
                        # Add brightness variation
                        if random.random() < 0.4:  # 40% chance of brighter character
                            stdscr.addch(screen_y, screen_x, char, curses.A_BOLD)
                        else:
                            stdscr.addch(screen_y, screen_x, char)
                    except:
                        pass
        
        elif current_time < static_duration + transition_duration:
            # Transition phase with movement
            progress = (current_time - static_duration) / transition_duration
            static = generate_static(width, height, horizontal_offset, vertical_offset)
            for y, line in enumerate(scaled_art):
                screen_y = start_y + y
                for x, char in enumerate(line):
                    screen_x = start_x + x
                    try:
                        if random.random() > progress:
                            # Add brightness variation
                            if random.random() < 0.4:  # 40% chance of brighter character
                                stdscr.addch(screen_y, screen_x, static[y][x], curses.A_BOLD)
                            else:
                                stdscr.addch(screen_y, screen_x, static[y][x])
                        else:
                            stdscr.addch(screen_y, screen_x, char)
                    except:
                        pass
        
        elif current_time < static_duration + transition_duration + 5.0:
            # Final art phase with slight shimmer
            for y, line in enumerate(scaled_art):
                screen_y = start_y + y
                for x, char in enumerate(line):
                    screen_x = start_x + x
                    try:
                        if random.random() < 0.05:  # 5% chance of shimmer
                            stdscr.addch(screen_y, screen_x, char, curses.A_BOLD)
                        else:
                            stdscr.addch(screen_y, screen_x, char)
                    except:
                        pass
        else:
            # Final clear display of art
            for y, line in enumerate(scaled_art):
                screen_y = start_y + y
                for x, char in enumerate(line):
                    screen_x = start_x + x
                    try:
                        stdscr.addch(screen_y, screen_x, char)
                    except:
                        pass
            break
        
        stdscr.refresh()
        time.sleep(0.01)  # Even faster animation for smoother effect

def main():
    # Set up command line arguments
    parser = argparse.ArgumentParser(description='Animate ASCII art with TV static effect')
    parser.add_argument('--static', type=float, default=3.0,
                      help='Duration of static effect in seconds (default: 3.0)')
    parser.add_argument('--transition', type=float, default=2.0,
                      help='Duration of transition effect in seconds (default: 2.0)')
    args = parser.parse_args()

    # Load the ASCII art
    ascii_art = load_ascii_art('manga_ascii_art.txt')
    
    # Get original dimensions
    original_height = len(ascii_art)
    original_width = len(ascii_art[0]) if original_height > 0 else 0
    
    # Get terminal dimensions
    term_height, term_width = get_terminal_size()
    
    # Show dimensions info
    print(f"Original art size: {original_width}x{original_height}")
    print(f"Terminal size: {term_width}x{term_height}")
    print("The art will be scaled to fit your terminal.")
    print("You can resize your terminal window during the animation.")
    print("Press Enter to continue...")
    input()
    
    # Initialize curses and run animation
    curses.wrapper(lambda stdscr: animate_tv_effect(stdscr, ascii_art, args.static, args.transition))

if __name__ == "__main__":
    main() 