# Lyre

A beautiful music visualizer and metadata TUI built with Node.js and Ink.

## Features
- **Built-in Local Player**: Browse and play your local audio files (MP3, FLAC, WAV) via a dedicated file browser with automatic queueing, shuffle, and loop.
- **Smart Search**: Instantly filter your local music library while browsing.
- **Media Player Selector**: Choose which active media player (e.g., Spotify, VLC, Firefox) Lyre should track.
- **Visualizer Tweaker**: Adjust CAVA sensitivity, smoothing, and gravity in real-time.
- **Focus Mode**: A minimalist, visualizer-only view for zero distractions (supports centered fullscreen lyrics).
- **Real-time Visualization**: Audio visualizer using `cava` with customizable fluid or stacked bars.
- **Synced Lyrics**: Fetches and displays time-synced lyrics that automatically scroll with the current track.
- **Album Art**: High-resolution (half-block) or ASCII art modes.
- **Modular Themes**: Switch between built-in visualizer themes or create your own custom gradients and styles.
- **Custom Keybindings**: Fully remappable keys for all actions.
- **Responsive**: Adapts to any terminal size and window resizing with smart truncation.

## Prerequisites
- **Node.js** (v18+)
- **cava**: Required for visualization.
- **playerctl**: Required for metadata and controls.
- **mpv**: Required for local file playback.
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

Lyre stores all configuration files in `~/.config/lyre/`. On first run, default configuration files are automatically generated if they do not exist.

### Directory Structure

```
~/.config/lyre/
├── lyre.json      # UI settings (album art, visualizer, lyrics, keybindings)
├── themes.json    # Custom visualizer themes
└── cava.conf      # Audio visualizer parameters
```

### `lyre.json` — UI Configuration

Customize the appearance and behavior by editing `~/.config/lyre/lyre.json`:

```json
{
  "albumArt": {
    "enabled": true,
    "mode": "high-res",
    "maxHeight": 18
  },
  "visualizer": {
    "bars": 80,
    "fps": 30,
    "theme": "default",
    "sensitivity": 100,
    "integral": 85,
    "gravity": 100
  },
  "lyrics": {
    "enabled": true,
    "activeColor": "yellow",
    "inactiveColor": "gray"
  },
  "keybindings": {
    "quit": "q",
    "playPause": " ",
    "next": "n",
    "previous": "p",
    "seekForward": "l",
    "seekBackward": "h",
    "volumeUp": "k",
    "volumeDown": "j",
    "browser": "b",
    "themes": "t",
    "player": "m",
    "lyrics": "v",
    "art": "a",
    "focus": "z",
    "tweaker": "f",
    "shuffle": "s",
    "loop": "r"
  }
}
```

#### Visualizer Tweak Options

| Option | Range | Default | Description |
|--------|-------|---------|-------------|
| `visualizer.sensitivity` | 10 - 200 | 100 | How reactive the bars are to sound. |
| `visualizer.integral` | 0 - 100 | 85 | Smoothing factor. Higher = more fluid, Lower = more jittery. |
| `visualizer.gravity` | 0 - 1000 | 100 | How fast bars fall. Lower = "zero gravity", Higher = instant drop. |

#### Keybindings Configuration
Every key in the `keybindings` section can be remapped to any single character. Special keys like `upArrow` or `escape` are currently reserved for navigation and closing menus.

## Keybindings

Lyre provides a fully interactive terminal experience. Use the **Tweaker (`f`)** to adjust these on the fly.

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `n` | Next track (Local Player) |
| `p` | Previous track (Local Player) |
| `h` / `Left` | Seek backward / Previous (MPRIS) |
| `l` / `Right` | Seek forward / Next (MPRIS) |
| `k` / `Up` | Volume up (+5%) |
| `j` / `Down` | Volume down (-5%) |
| `b` | Toggle Local File Browser |
| `/` | Smart Search (while in Browser) |
| `m` or `p` | Select Media Player (lock source) |
| `f` | Open Visualizer Tweaker |
| `z` | Toggle Focus Mode (minimalist) |
| `s` | Toggle Shuffle (Local Player) |
| `r` | Toggle Loop/Repeat (Local Player) |
| `v` | Toggle Synced Lyrics Mode |
| `t` | Open Theme Selector Menu |
| `a` | Toggle Album Art Visibility |
| `q` | Quit |
| `Ctrl+C` | Force quit (with cleanup) |

## Supported Players

Any MPRIS-compatible media player works with Lyre via `playerctl`, including:
- Spotify (with `spotifyd` or the official client)
- VLC
- Firefox / Chrome (with media keys support)
- MPD (with `mpd-mpris`)

## Troubleshooting

### Run in Debug Mode
If you encounter persistent issues (like bars not showing), run Lyre with the `--debug` flag:
```bash
lyre --debug
```
This will generate a log file at `~/.config/lyre/debug.log`. Please include this log when reporting issues.

### No visualizer bars appearing
Ensure `cava` is installed and can detect your audio output. Run `cava` standalone to verify.

### "playerctl: command not found"
Install `playerctl` from your package manager (`sudo pacman -S playerctl`, `sudo apt install playerctl`, etc.).

### Album art not rendering
- Ensure your terminal supports true color (24-bit).
- If colors appear wrong, try setting `albumArt.mode` to `"ascii"` in your config.

### Menu Clipping
Lyre is highly responsive. If a menu looks cut off, simply resize your terminal; the app will automatically recalculate the layout and pagination.

## Star Chart

<a href="https://www.star-history.com/?repos=DeadZone-0%2Flyre&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&theme=dark&legend=top-left" />
 </picture>
</a>

## License
ISC
