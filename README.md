# Binoculars Animation

A Matrix-style ASCII art animation system for CLI installations and startup sequences. This tool creates a cyberpunk/Matrix-style animation featuring binoculars ASCII art with dynamic effects, perfect for CLI tool installations or startup sequences.

## Features

- 🎨 Matrix-style rain effect with falling binary digits
- 🌈 Dynamic color transitions (green, bright green, cyan)
- ⚡ Glitch effects and random intensity variations
- 🎭 Professional installation-style messages
- 🔄 Smooth frame transitions
- 📱 Terminal size adaptation
- 🛡️ Error handling and clean exits
- 🎮 Interactive menu system
- 💾 Configuration saving and loading

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/binoculars-animation.git
cd binoculars-animation
```

2. Ensure you have Python 3.6+ installed:
```bash
python3 --version
```

3. Run the animation:
```bash
python3 binoculars_animation.py
```

## Usage

### Interactive Menu

The script provides an interactive menu with the following options:

1. **Configure Iterations** (1-10)
   - Set the number of times the animation cycles
   
2. **Configure Speed** (0.05-1.0s)
   - Adjust the animation speed
   
3. **Toggle Rain Effect**
   - Enable/disable the Matrix-style rain effect
   
4. **Configure Intensity** (0.1-1.0)
   - Control the intensity of the visual effects
   
5. **Select Color Scheme**
   - Choose between different visual themes:
     - Matrix (Green theme)
     - Cyberpunk (Cyan theme)
     - Glitch (Mixed colors)
   
6. **Preview Animation**
   - Quick preview with current settings
   
7. **Run Full Animation**
   - Run the complete animation sequence
   
8. **Save Configuration**
   - Save your current settings to a file
   
9. **Exit**
   - Close the application

### Configuration Files

The script automatically loads configurations from `binoculars_config.txt` if it exists. You can save your custom configurations to any file name.

### ASCII Art Files

The animation uses ASCII art frames from `binoculars_ascii.txt`. Each frame should be separated by a "Frame N:" header.

## Customization

### Adding New Frames

To add new frames to the animation:

1. Open `binoculars_ascii.txt`
2. Add your frame with a "Frame N:" header
3. Ensure the frame maintains the same width as other frames

Example:
```
Frame 5:
   .---.   .---.
  /     \ /     \
 |  *O*  |  *O*  |
  \     / \     /
   '---'   '---'
    |_________|
     \     /
      \   /
       \_/
```

### Modifying Color Schemes

To add new color schemes:

1. Open `binoculars_animation.py`
2. Add new colors to the `Colors` class
3. Add a new scheme to the `get_color_scheme` function

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Matrix and Mr. Robot visual effects
- ASCII art design by [Your Name]
- Thanks to all contributors

## Support

For support, please open an issue in the GitHub repository or contact [Your Email].