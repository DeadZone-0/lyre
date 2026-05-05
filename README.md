# Lyre

A beautiful music visualizer and metadata TUI built with Node.js and Ink.

## Features
- **Real-time Visualization**: Audio visualizer using `cava`.
- **Album Art**: high-res (half-block), ultra-res (braille), or ASCII modes.
- **Metadata**: Track info, progress bar, and player status via `playerctl`.
- **Interactive Controls**: Play, pause, skip, and volume control from your keyboard.
- **Responsive**: Adapts to any terminal size.

## Prerequisites
- **Node.js** (v18+)
- **cava**: Required for visualization.
- **playerctl**: Required for metadata and controls.
- **Nerd Fonts**: Recommended for icons.

## Installation
1. Clone the repository.
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Start Lyre: `npm start`

## Configuration (`lyre.json`)
You can customize Lyre by creating/editing `lyre.json` in the root directory:
```json
{
  "albumArt": {
    "enabled": true,
    "mode": "ultra-res", 
    "maxHeight": 20
  },
  "visualizer": {
    "bars": 80,
    "fps": 30
  }
}
```
### Art Modes:
- `ultra-res`: (Default) Uses Braille characters for highest detail + color.
- `high-res`: Uses half-blocks for color-accurate but lower resolution look.
- `ascii`: Classic monochrome ASCII art style.

## Keybindings
- `Space`: Play / Pause
- `h` / `l` (or Left/Right): Previous / Next Track
- `j` / `k` (or Up/Down): Volume Down / Up
- `q`: Quit

## License
ISC
