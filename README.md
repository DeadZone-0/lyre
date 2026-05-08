# Lyre

A beautiful music visualizer and metadata TUI built with Node.js and Ink.

## Features
- **Real-time Visualization**: Audio visualizer using `cava` with customizable fluid or stacked bars.
- **Synced Lyrics**: Fetches and displays time-synced lyrics that automatically scroll with the current track.
- **Album Art**: High-resolution (half-block) or ASCII art modes.
- **Modular Themes**: Switch between built-in visualizer themes or create your own custom gradients and styles.
- **Metadata**: Track info, progress bar, and player status via `playerctl`.
- **Interactive Controls**: Play, pause, skip, volume control, and view toggles directly from your keyboard.
- **Responsive**: Adapts to any terminal size and window resizing.
- **Optimized**: High-performance string rendering for a lag-free experience.

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

Lyre stores all configuration files in `~/.config/lyre/`. On first run, default configuration files are automatically generated if they do not exist.

### Directory Structure

```
~/.config/lyre/
├── lyre.json      # UI settings (album art, visualizer, lyrics)
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
    "theme": "default"
  },
  "lyrics": {
    "enabled": true,
    "activeColor": "yellow",
    "inactiveColor": "gray"
  }
}
```

#### Album Art Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `albumArt.enabled` | `boolean` | `true` | Show or hide the album art panel. Can be toggled in-app via the `a` key. |
| `albumArt.mode` | `"high-res"` or `"ascii"` | `"high-res"` | Rendering mode for album art. `high-res` uses half-block Unicode characters with true-color RGB. `ascii` uses standard ASCII characters for maximum compatibility. |
| `albumArt.maxHeight` | `number` | `18` | Maximum height of the album art panel in terminal rows. |

#### Visualizer Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `visualizer.bars` | `number` | `80` | Number of bars sampled from the audio visualizer. The actual number displayed is capped by available terminal width. |
| `visualizer.fps` | `number` | `30` | Target frames per second for visualizer updates. Must match `framerate` in `cava.conf`. |
| `visualizer.theme` | `string` | `"default"` | The active visualizer theme loaded from `themes.json` (e.g., `retro`, `ocean`, `cyberpunk`). |

#### Lyrics Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lyrics.activeColor` | `string` | `"yellow"` | The color used to highlight the currently playing line of lyrics. |
| `lyrics.inactiveColor` | `string` | `"gray"` | The color used for surrounding, upcoming, or past lyric lines. |

### `themes.json` — Theme Engine

Lyre features a fully modular theme engine. You can edit `~/.config/lyre/themes.json` to customize existing themes or add new ones.

A theme object defines how the visualizer is drawn:
- `style`: `"fluid"` (smooth wave transitions) or `"stacked"` (discrete blocks).
- `char`: The character used to draw the bars (e.g., `█`, `━`, `■`).
- `emptyChar`: The character used for empty space (usually a space ` `).
- `gradient`: An array of color names or hex codes (e.g., `["#00ff00", "yellow", "red"]`).
- `gradientDirection`: `"horizontal"` (left to right) or `"vertical"` (bottom to top).
- `peakColor`: (Optional) Forces the highest active block in a `stacked` bar to a specific color.

### `cava.conf` — Audio Configuration

Lyre uses [cava](https://github.com/karlstav/cava) under the hood. The file at `~/.config/lyre/cava.conf` controls audio capture and processing.

#### `[general]`
| Option | Default | Description |
|--------|---------|-------------|
| `framerate` | `30` | Output refresh rate in Hz. Should match `visualizer.fps` in `lyre.json`. |
| `bars` | `100` | Number of frequency bars cava produces. |

#### `[output]`
**Do not change the method or data format**, as Lyre relies on these to function:
- `method = raw`
- `raw_target = /dev/stdout`
- `data_format = ascii`

#### Audio Input Source
To change the input source (e.g., for ALSA or MPD), add an `[input]` section:
```ini
[input]
method = pulse
source = auto
```

## Keybindings

Lyre provides a fully interactive terminal experience:

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `h` / `Left` | Previous track |
| `l` / `Right` | Next track |
| `k` / `Up` | Volume up (+5%) |
| `j` / `Down` | Volume down (-5%) |
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

### No visualizer bars appearing
Ensure `cava` is installed and can detect your audio output. Run `cava` standalone to verify.

### "playerctl: command not found"
Install `playerctl` from your package manager (`sudo pacman -S playerctl`, `sudo apt install playerctl`, etc.).

### Album art not rendering
- Ensure your terminal supports true color (24-bit).
- If colors appear wrong, try setting `albumArt.mode` to `"ascii"` in your config.

### Lyrics displaying "Searching..."
The current track may not exist in the LRCLIB database, or the metadata provided by your player is missing the artist/title.

### Menu Clipping
If the Theme menu is cut off, simply resize your terminal vertically; the menu will automatically paginate.

## License
ISC
