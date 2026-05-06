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

Lyre stores all configuration files in `~/.config/lyre/`. On first run, a default `cava.conf` is automatically generated if one does not exist.

### Directory Structure

```
~/.config/lyre/
├── lyre.json      # UI settings (album art, visualizer)
└── cava.conf      # Audio visualizer parameters
```

### `lyre.json` — UI Configuration

Customize the appearance and behavior by creating or editing `~/.config/lyre/lyre.json`:

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

#### Album Art Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `albumArt.enabled` | `boolean` | `true` | Show or hide the album art panel. Set to `false` to give more space to the visualizer and metadata. |
| `albumArt.mode` | `"high-res"` or `"ascii"` | `"high-res"` | Rendering mode for album art. `high-res` uses half-block Unicode characters with true-color RGB for photorealistic output. `ascii` uses standard ASCII characters for maximum compatibility with older terminals. |
| `albumArt.maxHeight` | `number` | `18` | Maximum height of the album art panel in terminal rows. The actual height is dynamically calculated based on terminal size but will never exceed this value. Minimum effective height is 6 rows. |

#### Visualizer Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `visualizer.bars` | `number` | `80` | Number of bars displayed in the audio visualizer. Higher values give finer granularity but require a wider terminal. The actual number of bars is capped by available terminal width. |
| `visualizer.fps` | `number` | `30` | Target frames per second for visualizer updates. Must match the `framerate` value in `cava.conf` for smooth output. Values above 60 are not recommended due to diminishing returns and increased CPU usage. |

### `cava.conf` — Audio Visualizer Configuration

Lyre uses [cava](https://github.com/karlstav/cava) under the hood for audio analysis. The configuration file at `~/.config/lyre/cava.conf` controls how cava captures and processes audio.

A default config is generated automatically. You can customize it with any valid cava options. Key sections:

#### `[general]`
| Option | Default | Description |
|--------|---------|-------------|
| `framerate` | `30` | Output refresh rate in Hz. Should match `visualizer.fps` in `lyre.json`. |
| `bars` | `100` | Number of frequency bars cava produces. Lyre samples from these to fit the configured display width. |
| `autosens` | `1` | Automatically adjusts sensitivity to prevent clipping. Set to `0` for manual control via `sensitivity`. |

#### `[output]`
These options are critical for Lyre to function — do not change the method or data format:

| Option | Required Value | Description |
|--------|----------------|-------------|
| `method` | `raw` | Output method. Must be `raw` for Lyre to parse the data. |
| `raw_target` | `/dev/stdout` | Output destination. Must be stdout. |
| `data_format` | `ascii` | Data encoding. Must be `ascii` (semicolon-separated integers). |
| `ascii_max_range` | `1000` | Maximum value in the output. Used by Lyre to normalize bar heights. |

#### `[smoothing]`
Controls how the visualizer transitions between frames:

| Option | Default | Description |
|--------|---------|-------------|
| `monstercat` | `1` | Enables Monstercat-style smoothing for a more dynamic look. Set to `0` to disable. |
| `integral` | `85` | Smoothing factor (0-100). Higher values produce smoother, slower transitions. |
| `gravity` | `100` | How quickly bars fall back down (0-100). Higher values make bars drop faster. |

#### Audio Input Source

By default, cava uses PulseAudio/PipeWire. To change the input source, add an `[input]` section:

```ini
[input]
method = pulse
source = auto
```

For ALSA users:
```ini
[input]
method = alsa
source = hw:Loopback,1
```

For MPD users:
```ini
[input]
method = mpd
host = localhost
port = 6600
```

See the [cava documentation](https://github.com/karlstav/cava/blob/master/example_files/config) for all available options.

## Keybindings

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `h` / `Left` | Previous track |
| `l` / `Right` | Next track |
| `k` / `Up` | Volume up (+5%) |
| `j` / `Down` | Volume down (-5%) |
| `q` | Quit |
| `Ctrl+C` | Force quit (with cleanup) |

## Supported Players

Any MPRIS-compatible media player works with Lyre via `playerctl`, including:
- Spotify (with `spotifyd` or the official client)
- VLC
- Firefox / Chrome (with media keys support)
- MPD (with `mpd-mpris`)
- Audacious
- Lollypop

## Troubleshooting

### No visualizer bars appearing
Ensure `cava` is installed and can detect your audio output. Run `cava` standalone to verify.

### "playerctl: command not found"
Install `playerctl` from your package manager (`sudo apt install playerctl`, `sudo pacman -S playerctl`, etc.).

### Album art not rendering
- Ensure your terminal supports true color (24-bit). Test with `echo -e "\e[38;2;255;0;0mRed\e[0m"`.
- If colors appear wrong, try setting `albumArt.mode` to `"ascii"` in your config.

### Orphaned cava processes
Lyre cleans up the cava subprocess on exit (via `q` or `Ctrl+C`). If you see lingering processes, kill them with `pkill cava`.

## Star History

<a href="https://www.star-history.com/?repos=DeadZone-0%2Flyre&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=DeadZone-0/lyre&type=date&legend=top-left" />
 </picture>
</a>

## License
ISC
