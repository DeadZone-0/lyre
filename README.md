# Lyre

A beautiful music visualizer and metadata TUI built with Node.js and Ink.

## Features
- Real-time audio visualization using `cava`.
- Metadata tracking (Title, Artist, Album, Status) using `playerctl`.
- Smooth progress bar.
- Modern, aesthetic terminal UI.

## Prerequisites
- **Node.js** (v18+)
- **cava**: For audio visualization.
- **playerctl**: For music metadata.
- **Nerd Fonts**: Recommended for icons (e.g., FiraCode Nerd Font).

## Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Start Lyre:
   ```bash
   npm start
   ```

## Configuration
Lyre uses a custom `cava.conf` located in the root directory. You can adjust the number of bars, sensitivity, and other parameters there.

## License
ISC
