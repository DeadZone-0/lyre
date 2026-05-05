# Lyre

A beautiful music visualizer and metadata TUI built with Node.js and Ink.

## Features
- **Real-time Visualization**: Audio visualizer using `cava`.
- **Album Art**: high-res (half-block) or ASCII modes.
- **Metadata**: Track info, progress bar, and player status via `playerctl`.
- **Interactive Controls**: Play, pause, skip, and volume control from your keyboard.
- **Responsive**: Adapts to any terminal size and window resizing.
- **Optimized**: High-performance string rendering for lag-free experience.

## Prerequisites
- **Node.js** (v18+)
- **cava**: Required for visualization.
- **playerctl**: Required for metadata and controls.
- **Nerd Fonts**: Recommended for icons.

## Installation

### From Source
1. Clone the repository.
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Link globally: `sudo npm link`
5. Run from anywhere: `lyre`

### Via NPM
```bash
npm install -g lyre-tui
lyre
```

## Configuration
Lyre looks for configuration in `~/.config/lyre/`. 

### `lyre.json`
You can customize the UI by creating `~/.config/lyre/lyre.json`:
```json
{
  "albumArt": {
    "enabled": true,
    "mode": "high-res", 
    "maxHeight": 18
  },
  "visualizer": {
    "bars": 80,
    "fps": 30
  }
}
```

## Keybindings
- `Space`: Play / Pause
- `h` / `l` (or Left/Right): Previous / Next Track
- `j` / `k` (or Up/Down): Volume Down / Up
- `q`: Quit

## License
ISC
