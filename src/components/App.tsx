import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { useCava } from '../hooks/useCava.js';
import { useMetadata } from '../hooks/useMetadata.js';
import { useAlbumArt } from '../hooks/useAlbumArt.js';
import { useLyrics } from '../hooks/useLyrics.js';
import { useLocalPlayer } from '../hooks/useLocalPlayer.js';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';
import { log } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default Themes
const DEFAULT_THEMES = {
	default: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['blue', 'cyan', 'magenta', 'red'], gradientDirection: 'horizontal', peakColor: '' },
	cyberpunk: { style: 'stacked', char: '■', emptyChar: ' ', gradient: ['#00ffff', '#ff00ff', '#ffff00'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	retro: { style: 'stacked', char: '━', emptyChar: ' ', gradient: ['#00ff00', '#aaff00', '#ffff00', '#ff8800', '#ff0000'], gradientDirection: 'vertical', peakColor: '#ff0000' },
	ocean: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['blue', 'blueBright', 'cyan'], gradientDirection: 'vertical', peakColor: 'white' },
	matrix: { style: 'stacked', char: '█', emptyChar: ' ', gradient: ['#003300', '#00ff00', '#ccffcc'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	fire: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['#330000', '#ff0000', '#ff8800', '#ffff00', '#ffffff'], gradientDirection: 'vertical', peakColor: '' },
	synthwave: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['#091833', '#133e7c', '#711c91', '#ea00d9', '#0abdc6'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	glacier: { style: 'stacked', char: '■', emptyChar: ' ', gradient: ['#002244', '#0066aa', '#00aaff', '#aaffff'], gradientDirection: 'vertical', peakColor: '#ffffff' }
};

// Resolve config paths
const getPaths = () => {
	const localConfig = path.resolve(__dirname, '../../lyre.json');
	const localThemes = path.resolve(__dirname, '../../themes.json');
	const localCava = path.resolve(__dirname, '../../cava.conf');
	
	const globalDir = path.join(os.homedir(), '.config', 'lyre');
	const globalConfig = path.join(globalDir, 'lyre.json');
	const globalThemes = path.join(globalDir, 'themes.json');
	const globalCava = path.join(globalDir, 'cava.conf');

	if (fs.existsSync(localConfig) && fs.existsSync(localCava)) {
		if (!fs.existsSync(localThemes)) {
			fs.writeFileSync(localThemes, JSON.stringify(DEFAULT_THEMES, null, 2));
		}
		return { config: localConfig, themes: localThemes, cava: localCava };
	}
	
	if (!fs.existsSync(globalDir)) {
		fs.mkdirSync(globalDir, { recursive: true });
	}
	
	if (!fs.existsSync(globalCava)) {
		fs.writeFileSync(globalCava, `[general]\nframerate = 30\nbars = 100\nautosens = 1\n\n[output]\nmethod = raw\nraw_target = /dev/stdout\ndata_format = ascii\nascii_max_range = 1000\n\n[smoothing]\nmonstercat = 1\nintegral = 85\ngravity = 100\n`);
	}

	if (!fs.existsSync(globalThemes)) {
		fs.writeFileSync(globalThemes, JSON.stringify(DEFAULT_THEMES, null, 2));
	}

	return { config: globalConfig, themes: globalThemes, cava: globalCava };
};

const paths = getPaths();
const CONFIG_PATH = paths.cava;
const LYRE_CONFIG_PATH = paths.config;
const THEMES_PATH = paths.themes;

let loadedThemes = DEFAULT_THEMES;
try {
	if (fs.existsSync(THEMES_PATH)) {
		loadedThemes = { ...DEFAULT_THEMES, ...JSON.parse(fs.readFileSync(THEMES_PATH, 'utf-8')) };
	}
} catch (e) {}

let initialConfig = {
	albumArt: { enabled: true, mode: 'high-res' as 'high-res' | 'ascii', maxHeight: 18 },
	visualizer: { bars: 80, fps: 30, theme: 'default', sensitivity: 100, integral: 85, gravity: 100 },
	lyrics: { enabled: true, activeColor: 'yellow', inactiveColor: 'gray' },
	player: '', // empty string means auto
	keybindings: {
		quit: 'q',
		playPause: ' ',
		next: 'n',
		previous: 'p',
		seekForward: 'l',
		seekBackward: 'h',
		volumeUp: 'k',
		volumeDown: 'j',
		browser: 'b',
		themes: 't',
		player: 'm',
		lyrics: 'v',
		art: 'a',
		focus: 'z',
		tweaker: 'f',
		shuffle: 's',
		loop: 'r'
	}
};

try {
	if (fs.existsSync(LYRE_CONFIG_PATH)) {
		const saved = JSON.parse(fs.readFileSync(LYRE_CONFIG_PATH, 'utf-8'));
		log(`Loading config from ${LYRE_CONFIG_PATH}`);
		initialConfig = {
			...initialConfig,
			...saved,
			albumArt: { ...initialConfig.albumArt, ...saved.albumArt, mode: (saved.albumArt?.mode === 'ascii') ? 'ascii' : 'high-res' },
			visualizer: { 
				...initialConfig.visualizer, 
				...saved.visualizer,
				sensitivity: saved.visualizer?.sensitivity ?? 100,
				integral: saved.visualizer?.integral ?? 85,
				gravity: saved.visualizer?.gravity ?? 100
			},
			lyrics: { ...initialConfig.lyrics, ...saved.lyrics },
			player: saved.player || '',
			keybindings: { ...initialConfig.keybindings, ...saved.keybindings }
		};
	}
} catch (e) {}

const VisualizerTweakerMode = ({ config, onUpdate, onCancel, width }: { config: any; onUpdate: (c: any) => void; onCancel: () => void; width: number }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const options = [
		{ label: 'Sensitivity', key: 'sensitivity', min: 10, max: 200, step: 5 },
		{ label: 'Smoothing (Integral)', key: 'integral', min: 0, max: 100, step: 5 },
		{ label: 'Gravity', key: 'gravity', min: 0, max: 1000, step: 10 }
	];

	useInput((input, key) => {
		if (input === 'q' || key.escape || input === 'k') onCancel();
		if (key.upArrow || input === 'k') setSelectedIndex(Math.max(0, selectedIndex - 1));
		if (key.downArrow || input === 'j') setSelectedIndex(Math.min(options.length - 1, selectedIndex + 1));
		
		const opt = options[selectedIndex];
		if (!opt) return;

		if (key.leftArrow || input === 'h') {
			const newVal = Math.max(opt.min, config.visualizer[opt.key] - opt.step);
			onUpdate({ ...config, visualizer: { ...config.visualizer, [opt.key]: newVal } });
		}
		if (key.rightArrow || input === 'l') {
			const newVal = Math.min(opt.max, config.visualizer[opt.key] + opt.step);
			onUpdate({ ...config, visualizer: { ...config.visualizer, [opt.key]: newVal } });
		}
	});

	return (
		<Box flexDirection="column" alignItems="center" justifyContent="center" width="100%">
			<Box marginBottom={1}>
				<Text bold color="yellow">Visualizer Tweaker</Text>
			</Box>
			<Box flexDirection="column" alignItems="flex-start">
				{options.map((opt, i) => {
				const isSelected = i === selectedIndex;
				const val = (config.visualizer as any)[opt.key];
				const percent = ((val - opt.min) / (opt.max - opt.min));
				const barWidth = 20;
				const filled = Math.round(barWidth * percent);
				
				return (
					<Box key={opt.key} marginBottom={0}>
						<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
							{isSelected ? '▶ ' : '  '}{opt.label.padEnd(20)}
						</Text>
						<Text color="gray">[</Text>
						<Text color="cyan">{'█'.repeat(filled)}</Text>
						<Text color="gray">{' '.repeat(Math.max(0, barWidth - filled))}] </Text>
						<Text color="white" bold>{val}</Text>
					</Box>
				);
			})}
			</Box>
			<Box marginTop={1}>
				<Text color="gray" dimColor>(H/L: Adjust | J/K: Navigate | K/Q: Close)</Text>
			</Box>
		</Box>
	);
};

const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const Visualizer = ({ bars, height = 4, type = 'horizontal', activeTheme = 'default' }: { bars: number[]; height?: number; type?: 'horizontal' | 'minimal'; activeTheme?: string }) => {
	const theme = (loadedThemes as any)[activeTheme] || loadedThemes.default;
	const maxLevel = theme.style === 'stacked' ? height : height * 8;
	
	const vizString = useMemo(() => {
		let result = '';
		if (type === 'minimal') {
			for (let i = 0; i < bars.length; i++) {
				const v = bars[i] || 0;
				const level = Math.floor((v / 1000) * 8);
				let colorFunc = chalk.cyan;
				const pos = i / bars.length;
				const gradIndex = Math.min(Math.floor(pos * theme.gradient.length), Math.max(0, theme.gradient.length - 1));
				const colorStr = theme.gradient[gradIndex] || 'cyan';
				if (colorStr.startsWith('#')) colorFunc = chalk.hex(colorStr);
				else if ((chalk as any)[colorStr]) colorFunc = (chalk as any)[colorStr];
				
				result += colorFunc(BLOCKS[Math.min(level, 8)] || ' ');
			}
		} else {
			for (let r = height - 1; r >= 0; r--) {
				for (let i = 0; i < bars.length; i++) {
					const v = bars[i] || 0;
					const level = Math.floor((v / 1000) * maxLevel);
					let char = theme.emptyChar;
					let isPeak = false;

					if (theme.style === 'stacked') {
						const rowLevel = level - r;
						if (rowLevel > 0) char = theme.char;
						if (rowLevel === 1) isPeak = true;
					} else {
						const rowLevel = level - (r * 8);
						const blockChar = rowLevel <= 0 ? theme.emptyChar : (rowLevel >= 8 ? theme.char : (BLOCKS[Math.min(rowLevel, 8)] || theme.char));
						char = blockChar;
						if (rowLevel > 0 && rowLevel <= 8) isPeak = true;
					}
					
					let colorStr = theme.gradient[0] || 'cyan';
					const pos = theme.gradientDirection === 'vertical' 
						? 1 - (r / (height - 1 || 1)) 
						: i / bars.length;

					const gradIndex = Math.min(Math.floor(pos * theme.gradient.length), Math.max(0, theme.gradient.length - 1));
					colorStr = theme.gradient[gradIndex] || colorStr;

					if (isPeak && theme.peakColor && char !== theme.emptyChar) {
						colorStr = theme.peakColor;
					}

					let colorFunc = chalk.white;
					if (colorStr && colorStr.startsWith('#')) colorFunc = chalk.hex(colorStr);
					else if (colorStr && (chalk as any)[colorStr]) colorFunc = (chalk as any)[colorStr];

					result += colorFunc(char);
				}
				if (r > 0) result += '\n';
			}
		}
		return result;
	}, [bars, height, maxLevel, type, theme]);

	return <Text wrap="truncate">{vizString}</Text>;
};

const LyricsMode = ({ lyrics, position, height, width, title, config }: { lyrics: any[], position: number, height: number, width: number, title: string, config: any }) => {
	const currentMs = position / 1000;
	const activeIndex = lyrics.findIndex((l, i) => {
		const next = lyrics[i + 1];
		return currentMs >= l.time && (!next || currentMs < next.time);
	});

	const visibleLines = Math.max(1, height - 4);
	const start = Math.max(0, activeIndex - Math.floor(visibleLines / 2));
	const displayLyrics = lyrics.slice(start, start + visibleLines);

	return (
		<Box flexDirection="column" alignItems="center" justifyContent="center" height="100%" width="100%">
			<Box marginBottom={1}>
				<Text bold color="yellow" wrap="truncate-end">{title}</Text>
			</Box>
			<Box flexDirection="column" alignItems="center">
				{displayLyrics.length > 0 ? displayLyrics.map((line, i) => {
					const isActive = (start + i) === activeIndex;
					return (
						<Box key={i} marginY={0}>
							<Text 
								color={isActive ? config.lyrics.activeColor : config.lyrics.inactiveColor}
								bold={isActive}
							>
								{truncate(isActive ? ` ${line.text} ` : line.text, width)}
							</Text>
						</Box>
					);
				}) : (
					<Text color="gray" italic>Searching for synced lyrics...</Text>
				)}
			</Box>
		</Box>
	);
};

const ProgressBar = ({ current, total, width }: { current: number; total: number; width: number }) => {
	if (total === 0) return null;
	const percentage = Math.min(current / total, 1);
	const barWidth = Math.max(10, width - 15);
	const completed = Math.round(barWidth * percentage);
	const remaining = Math.max(0, barWidth - completed);

	const formatTime = (microseconds: number) => {
		const seconds = Math.floor(microseconds / 1000000);
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<Box flexDirection="row" alignItems="center">
			<Text color="gray" dimColor>{formatTime(current)} </Text>
			<Text color="white">{'━'.repeat(completed)}</Text>
			<Text color="gray" dimColor>{'─'.repeat(remaining)}</Text>
			<Text color="gray" dimColor> {formatTime(total)}</Text>
		</Box>
	);
};

const AlbumArt = ({ pixels }: { pixels: string }) => {
	if (!pixels) return <Text color="gray" dimColor>♪</Text>;
	return <Text wrap="truncate">{pixels}</Text>;
};

const truncate = (str: string, maxLen: number) => {
	if (str.length <= maxLen) return str;
	return str.slice(0, maxLen - 3) + '...';
};

const ThemeSelectorMode = ({ activeTheme, onSelect, onCancel, height, width }: { activeTheme: string; onSelect: (t: string) => void; onCancel: () => void; height: number; width: number }) => {
	const themes = Object.keys(loadedThemes);
	const [selectedIndex, setSelectedIndex] = useState(Math.max(0, themes.indexOf(activeTheme)));

	useInput((input, key) => {
		if (input === 'q' || key.escape || input === 't') onCancel();
		if (key.upArrow || input === 'k') setSelectedIndex(Math.max(0, selectedIndex - 1));
		if (key.downArrow || input === 'j') setSelectedIndex(Math.min(themes.length - 1, selectedIndex + 1));
		if (key.return || input === ' ') onSelect(themes[selectedIndex]!);
	});

	const maxVisible = Math.max(1, height - 5);
	let startIndex = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
	let endIndex = startIndex + maxVisible;
	if (endIndex > themes.length) {
		endIndex = themes.length;
		startIndex = Math.max(0, endIndex - maxVisible);
	}
	const visibleThemes = themes.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column" alignItems="flex-start" justifyContent="flex-start" height="100%" width="100%" paddingX={2} overflow="hidden">
			<Box marginBottom={1} width="100%" height={1} overflow="hidden">
				<Text bold color="yellow">{truncate("Theme Selector", width - 4)}</Text>
			</Box>
			<Box flexDirection="column" alignItems="flex-start" height={maxVisible + 2} width="100%" overflow="hidden">
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{startIndex > 0 ? '  ▲' : ' '}</Text></Box>
				{visibleThemes.map((theme, i) => {
					const index = startIndex + i;
					const isSelected = index === selectedIndex;
					const str = `${isSelected ? '▶ ' : '  '}${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
					return (
						<Box key={theme} width="100%" height={1} overflow="hidden">
							<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected} wrap="truncate-end">
								{truncate(str, width - 4)}
							</Text>
						</Box>
					);
				})}
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{endIndex < themes.length ? '  ▼' : ' '}</Text></Box>
			</Box>
			<Box marginTop={1} width="100%" height={1} overflow="hidden">
				<Text color="gray" dimColor>{truncate("(Enter: Select | T/Q: Cancel | Up/Down: Navigate)", width - 4)}</Text>
			</Box>
		</Box>
	);
};

const FileBrowserMode = ({ onSelect, onCancel, height, width }: { onSelect: (files: string[], index: number) => void; onCancel: () => void; height: number; width: number }) => {
	const [currentDir, setCurrentDir] = useState(os.homedir());
	const [files, setFiles] = useState<{ name: string; isDir: boolean }[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		try {
			const items = fs.readdirSync(currentDir, { withFileTypes: true });
			const sorted = items
				.filter(item => !item.name.startsWith('.'))
				.filter(item => item.isDirectory() || item.name.match(/\.(mp3|flac|wav|m4a|ogg)$/i))
				.map(item => ({ name: item.name, isDir: item.isDirectory() }))
				.sort((a, b) => {
					if (a.isDir && !b.isDir) return -1;
					if (!a.isDir && b.isDir) return 1;
					return a.name.localeCompare(b.name);
				});
			if (currentDir !== '/') sorted.unshift({ name: '..', isDir: true });
			setFiles(sorted);
			setSelectedIndex(0);
			setSearchQuery('');
			setIsSearching(false);
		} catch (e) {
			setFiles([{ name: '..', isDir: true }]);
		}
	}, [currentDir]);

	const filteredFiles = files.filter(f => 
		f.name === '..' || f.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	useInput((input, key) => {
		if (isSearching) {
			if (key.escape || key.return) {
				setIsSearching(false);
				return;
			}
			if (key.backspace || key.delete) {
				setSearchQuery(prev => prev.slice(0, -1));
				setSelectedIndex(0);
				return;
			}
			if (input && input.length === 1 && !key.ctrl && !key.meta) {
				setSearchQuery(prev => prev + input);
				setSelectedIndex(0);
				return;
			}
			return;
		}

		if (input === '/' ) {
			setIsSearching(true);
			return;
		}

		if (input === 'q' || key.escape || input === 'b') onCancel();
		if (key.upArrow || input === 'k') setSelectedIndex(Math.max(0, selectedIndex - 1));
		if (key.downArrow || input === 'j') setSelectedIndex(Math.min(filteredFiles.length - 1, selectedIndex + 1));
		if (key.return || input === ' ') {
			const selected = filteredFiles[selectedIndex];
			if (!selected) return;
			const fullPath = path.join(currentDir, selected.name);
			if (selected.isDir) {
				setCurrentDir(path.resolve(fullPath));
			} else {
				const audioFiles = files.filter(f => !f.isDir).map(f => path.join(currentDir, f.name));
				const idx = audioFiles.indexOf(fullPath);
				onSelect(audioFiles, idx === -1 ? 0 : idx);
			}
		}
	});

	const maxVisible = Math.max(1, height - (isSearching ? 6 : 5));
	let startIndex = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
	let endIndex = startIndex + maxVisible;
	if (endIndex > filteredFiles.length) {
		endIndex = filteredFiles.length;
		startIndex = Math.max(0, endIndex - maxVisible);
	}
	const visibleFiles = filteredFiles.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column" alignItems="flex-start" justifyContent="flex-start" height="100%" width="100%" paddingX={2} overflow="hidden">
			<Box marginBottom={1} width="100%" height={1} overflow="hidden">
				<Text bold color="yellow">{truncate(`   ${currentDir}`, width - 4)}</Text>
			</Box>
			
			{isSearching && (
				<Box marginBottom={1} width="100%" height={1} overflow="hidden">
					<Text color="cyan">   Search: </Text>
					<Text color="white" bold>{searchQuery}</Text>
					<Text color="cyan" dimColor>_</Text>
				</Box>
			)}

			<Box flexDirection="column" alignItems="flex-start" height={maxVisible + 2} width="100%" overflow="hidden">
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{startIndex > 0 ? '  ▲' : ' '}</Text></Box>
				{visibleFiles.map((file, i) => {
					const index = startIndex + i;
					const isSelected = index === selectedIndex;
					const icon = file.isDir ? ' ' : '󰝚 ';
					const str = `${isSelected ? '▶ ' : '  '}${icon} ${file.name}`;
					return (
						<Box key={file.name} width="100%" height={1} overflow="hidden">
							<Text color={isSelected ? 'cyan' : (file.isDir ? 'blue' : 'white')} bold={isSelected}>
								{truncate(str, width - 4)}
							</Text>
						</Box>
					);
				})}
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{endIndex < filteredFiles.length ? '  ▼' : ' '}</Text></Box>
			</Box>
			<Box marginTop={1} width="100%" height={1} overflow="hidden">
				<Text color="gray" dimColor>
					{isSearching 
						? truncate("(Type to filter | Enter/Esc: Stop)", width - 4)
						: truncate("(Enter: Select | /: Search | B/Q: Cancel | Up/Down: Navigate)", width - 4)
					}
				</Text>
			</Box>
		</Box>
	);
};

const PlayerSelectorMode = ({ activePlayer, onSelect, onCancel, height, width }: { activePlayer: string; onSelect: (p: string) => void; onCancel: () => void; height: number; width: number }) => {
	const [players, setPlayers] = useState<string[]>(['Auto']);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const fetchPlayers = async () => {
			try {
				const { stdout } = await execa('playerctl', ['-l']);
				const list = stdout.split('\n').filter(Boolean);
				if (!cancelled) setPlayers(['Auto', ...list]);
			} catch (e) {
				if (!cancelled) setPlayers(['Auto']);
			}
		};
		fetchPlayers();
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		const idx = players.indexOf(activePlayer || 'Auto');
		if (idx !== -1) setSelectedIndex(idx);
	}, [players, activePlayer]);

	useInput((input, key) => {
		if (input === 'q' || key.escape || input === 'm') onCancel();
		if (key.upArrow || input === 'k') setSelectedIndex(Math.max(0, selectedIndex - 1));
		if (key.downArrow || input === 'j') setSelectedIndex(Math.min(players.length - 1, selectedIndex + 1));
		if (key.return || input === ' ') onSelect(players[selectedIndex] === 'Auto' ? '' : players[selectedIndex]!);
	});

	const maxVisible = Math.max(1, height - 5);
	let startIndex = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
	let endIndex = startIndex + maxVisible;
	if (endIndex > players.length) {
		endIndex = players.length;
		startIndex = Math.max(0, endIndex - maxVisible);
	}
	const visiblePlayers = players.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column" alignItems="flex-start" justifyContent="flex-start" height="100%" width="100%" paddingX={2} overflow="hidden">
			<Box marginBottom={1} width="100%" height={1} overflow="hidden">
				<Text bold color="yellow">{truncate("Media Player Selector", width - 4)}</Text>
			</Box>
			<Box flexDirection="column" alignItems="flex-start" height={maxVisible + 2} width="100%" overflow="hidden">
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{startIndex > 0 ? '  ▲' : ' '}</Text></Box>
				{visiblePlayers.map((player, i) => {
					const index = startIndex + i;
					const isSelected = index === selectedIndex;
					const str = `${isSelected ? '▶ ' : '  '}${player}`;
					return (
						<Box key={player} width="100%" height={1} overflow="hidden">
							<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
								{truncate(str, width - 4)}
							</Text>
						</Box>
					);
				})}
				<Box width="100%" height={1} overflow="hidden"><Text color="gray">{endIndex < players.length ? '  ▼' : ' '}</Text></Box>
			</Box>
			<Box marginTop={1} width="100%" height={1} overflow="hidden">
				<Text color="gray" dimColor>{truncate("(Enter: Select | M/Q: Cancel | Up/Down: Navigate)", width - 4)}</Text>
			</Box>
		</Box>
	);
};

let hasLoggedInit = false;

export const App = () => {
	const { stdout } = useStdout();
	const { exit } = useApp();
	
	useEffect(() => {
		if (!hasLoggedInit) {
			log('App initialized and ready.');
			hasLoggedInit = true;
		}
	}, []);

	const [dimensions, setDimensions] = useState({ columns: stdout?.columns || 80, rows: stdout?.rows || 24 });
	const [isLyricsMode, setIsLyricsMode] = useState(false);
	const [isThemeMode, setIsThemeMode] = useState(false);
	const [isFileBrowserMode, setIsFileBrowserMode] = useState(false);
	const [isPlayerSelectorMode, setIsPlayerSelectorMode] = useState(false);
	const [isFocusMode, setIsFocusMode] = useState(false);
	const [isTweakerMode, setIsTweakerMode] = useState(false);
	const [config, setConfig] = useState(initialConfig);
	const [isArtVisible, setIsArtVisible] = useState(config.albumArt.enabled);

	useEffect(() => {
		const onResize = () => setDimensions({ columns: stdout?.columns || 80, rows: stdout?.rows || 24 });
		stdout?.on('resize', onResize);
		return () => { stdout?.off('resize', onResize); };
	}, [stdout]);

	const sysMetadata = useMetadata(config.player);
	const { localState, playQueue, togglePause, changeVolume, seek, nextTrack, prevTrack, toggleShuffle, toggleLoop, stopLocal } = useLocalPlayer();

	// Merge metadata
	const metadata = localState.isActive ? localState : sysMetadata;

	const { lyrics } = useLyrics(metadata.title, metadata.artist, metadata.duration);
	
	const { mode, maxHeight } = config.albumArt;
	const artSize = isArtVisible ? Math.max(6, Math.min(maxHeight, Math.floor(dimensions.rows / 2) - 4)) : 0;
	const artString = useAlbumArt(metadata.artUrl, artSize * 2, artSize, mode);

	const padding = 6;
	const artWidth = !isFocusMode && isArtVisible && !isLyricsMode && !isThemeMode && !isFileBrowserMode && !isPlayerSelectorMode && !isTweakerMode ? artSize * 2 + 4 : 0; 
	const availableWidth = isFocusMode ? dimensions.columns - 4 : Math.max(30, dimensions.columns - padding - artWidth);
	
	const bars = useCava(CONFIG_PATH, availableWidth, [config.visualizer.sensitivity, config.visualizer.integral, config.visualizer.gravity]);
	const vizHeight = isFocusMode 
		? dimensions.rows - 4 
		: Math.max(2, Math.min(8, Math.floor(dimensions.rows / 4)));

	useInput((input, key) => {
		if (isThemeMode || isFileBrowserMode || isPlayerSelectorMode || isTweakerMode) return; // Let sub-modes handle inputs
		
		const kb = config.keybindings;

		if (input === kb.quit) { log('Quit triggered'); exit(); }
		if (input === kb.tweaker) { log('Tweaker mode triggered'); setIsTweakerMode(true); }
		if (input === kb.focus) { log('Focus mode toggled'); setIsFocusMode(!isFocusMode); }
		if (input === kb.themes) { log('Theme mode triggered'); setIsThemeMode(true); }
		if (input === kb.browser) { log('Browser mode triggered'); setIsFileBrowserMode(true); }
		if (input === kb.player) { log('Player selector triggered'); setIsPlayerSelectorMode(true); }

		if (input === kb.art) { log('Art toggle triggered'); setIsArtVisible(!isArtVisible); }
		if (input === kb.shuffle && localState.isActive) { log('Shuffle toggled'); toggleShuffle(); }
		if (input === kb.loop && localState.isActive) { log('Loop toggled'); toggleLoop(); }
		if (input === kb.next && localState.isActive) { log('Next track triggered'); nextTrack(); }
		if (input === kb.previous && localState.isActive) { log('Prev track triggered'); prevTrack(); }

		const playerArgs = config.player ? ['-p', config.player] : [];

		if (input === kb.playPause) {
			log(`Play/Pause triggered (Local active: ${localState.isActive})`);
			localState.isActive ? togglePause() : execa('playerctl', [...playerArgs, 'play-pause']).catch(() => {});
		}
		if (key.rightArrow || input === kb.seekForward) {
			log('Next/Seek forward triggered');
			localState.isActive ? seek(10) : execa('playerctl', [...playerArgs, 'next']).catch(() => {});
		}
		if (key.leftArrow || input === kb.seekBackward) {
			log('Prev/Seek backward triggered');
			localState.isActive ? seek(-10) : execa('playerctl', [...playerArgs, 'previous']).catch(() => {});
		}
		if (key.upArrow || input === kb.volumeUp) {
			log('Volume up triggered');
			localState.isActive ? changeVolume('up') : execa('playerctl', [...playerArgs, 'volume', '0.05+']).catch(() => {});
		}
		if (key.downArrow || input === kb.volumeDown) {
			log('Volume down triggered');
			localState.isActive ? changeVolume('down') : execa('playerctl', [...playerArgs, 'volume', '0.05-']).catch(() => {});
		}
		if (input === kb.lyrics) { log('Lyrics toggle triggered'); setIsLyricsMode(!isLyricsMode); }
	});

	const handleConfigUpdate = (newConfig: any) => {
		setConfig(newConfig);
		try {
			fs.writeFileSync(LYRE_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
			
			// Dynamically update cava.conf
			const cavaConf = `[general]
framerate = ${newConfig.visualizer.fps}
bars = 100
autosens = 1
sensitivity = ${newConfig.visualizer.sensitivity}

[output]
method = raw
raw_target = /dev/stdout
data_format = ascii
ascii_max_range = 1000

[smoothing]
monstercat = 1
integral = ${newConfig.visualizer.integral}
gravity = ${newConfig.visualizer.gravity}
`;
			fs.writeFileSync(CONFIG_PATH, cavaConf);
		} catch (e) {}
	};

	const handleThemeSelect = (themeName: string) => {
		const newConfig = { ...config, visualizer: { ...config.visualizer, theme: themeName as any } };
		handleConfigUpdate(newConfig);
		setIsThemeMode(false);
	};

	const handlePlayerSelect = (playerName: string) => {
		const newConfig = { ...config, player: playerName };
		handleConfigUpdate(newConfig);
		setIsPlayerSelectorMode(false);
	};

	const kb = config.keybindings;
	const hotkeyStr = localState.isActive 
		? ` (${kb.lyrics.toUpperCase()}: Lyrics | ${kb.themes.toUpperCase()}: Themes | ${kb.browser.toUpperCase()}: Browser | ${kb.player.toUpperCase()}: Player | ${kb.tweaker.toUpperCase()}: Tweak | ${kb.art.toUpperCase()}: Art | ${kb.focus.toUpperCase()}: Focus | ${kb.shuffle.toUpperCase()}: Shuffle [${localState.isShuffle ? 'On' : 'Off'}] | ${kb.loop.toUpperCase()}: Loop [${localState.isLoop ? 'On' : 'Off'}])`
		: ` (${kb.lyrics.toUpperCase()}: Lyrics | ${kb.themes.toUpperCase()}: Themes | ${kb.browser.toUpperCase()}: Browser | ${kb.player.toUpperCase()}: Player | ${kb.tweaker.toUpperCase()}: Tweak | ${kb.art.toUpperCase()}: Art | ${kb.focus.toUpperCase()}: Focus)`;

	if (isFocusMode) {
		return (
			<Box flexDirection="column" alignItems="center" justifyContent="center" width={dimensions.columns} height={dimensions.rows} borderStyle="round" borderColor="magenta">
				{isLyricsMode ? (
					<LyricsMode 
						lyrics={lyrics} 
						position={metadata.position} 
						height={dimensions.rows - 4} 
						width={dimensions.columns - 4}
						title={metadata.title}
						config={config}
					/>
				) : (
					<Visualizer bars={bars} height={vizHeight} activeTheme={config.visualizer.theme} />
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" paddingX={1} paddingY={0} borderStyle="round" borderColor="magenta" width={dimensions.columns} height={dimensions.rows}>
			<Box flexDirection="row" flexGrow={1} overflow="hidden">
				{isTweakerMode ? (
					<Box width="100%" height="100%" alignItems="center" justifyContent="center">
						<VisualizerTweakerMode 
							config={config} 
							onUpdate={handleConfigUpdate} 
							onCancel={() => setIsTweakerMode(false)}
							width={dimensions.columns - 4}
						/>
					</Box>
				) : isPlayerSelectorMode ? (
					<PlayerSelectorMode 
						activePlayer={config.player} 
						onSelect={handlePlayerSelect} 
						onCancel={() => setIsPlayerSelectorMode(false)} 
						height={dimensions.rows - 6}
						width={dimensions.columns - 4}
					/>
				) : isFileBrowserMode ? (
					<FileBrowserMode 
						height={dimensions.rows - 6} 
						width={dimensions.columns - 4}
						onSelect={(files, idx) => { playQueue(files, idx); setIsFileBrowserMode(false); }}
						onCancel={() => setIsFileBrowserMode(false)}
					/>
				) : isThemeMode ? (
					<ThemeSelectorMode 
						activeTheme={config.visualizer.theme} 
						onSelect={handleThemeSelect} 
						onCancel={() => setIsThemeMode(false)} 
						height={dimensions.rows - 6}
						width={dimensions.columns - 4}
					/>
				) : isLyricsMode ? (
					<LyricsMode 
						lyrics={lyrics} 
						position={metadata.position} 
						height={dimensions.rows - 6} 
						width={dimensions.columns - 4}
						title={metadata.title}
						config={config}
					/>
				) : (
					<>
						{isArtVisible && (
							<Box 
								borderStyle="single" 
								borderColor="gray" 
								marginRight={2} 
								padding={0} 
								alignSelf="center"
								width={artSize * 2 + 2}
								height={artSize + 2}
								justifyContent="center"
								alignItems="center"
								flexShrink={0}
							>
								<AlbumArt pixels={artString} />
							</Box>
						)}

						<Box flexDirection="column" flexGrow={1} justifyContent="center" overflow="hidden">
							<Box flexDirection="row" marginBottom={1} alignItems="flex-start">
								<Box flexDirection="column" flexGrow={1}>
									<Text bold color="yellow" wrap="truncate-end">{metadata.title}</Text>
									<Text color="white" dimColor wrap="truncate-end">{metadata.artist}</Text>
									<Text italic color="gray" dimColor wrap="truncate-end">{metadata.album}</Text>
								</Box>
								<Box marginRight={5}><Text color="cyan" bold italic>LYRE</Text></Box>
							</Box>

							<Box flexDirection="column" alignItems="center" marginBottom={1} width="100%" overflow="hidden">
								<Visualizer bars={bars} height={vizHeight} activeTheme={config.visualizer.theme} />
							</Box>
						</Box>
					</>
				)}
			</Box>

			<Box flexDirection="column" width="100%">
				{isLyricsMode && !isThemeMode && !isFileBrowserMode && (
					<Box marginBottom={0} justifyContent="center" width="100%">
						<Visualizer bars={bars} type="minimal" activeTheme={config.visualizer.theme} />
					</Box>
				)}
				
				<Box justifyContent="center" width="100%" marginBottom={1}>
					<ProgressBar current={metadata.position} total={metadata.duration} width={dimensions.columns - 6} />
				</Box>

				<Box flexDirection="row" justifyContent="space-between" width="100%">
					<Box flexShrink={1} width="100%" height={1} overflow="hidden">
						<Text color={metadata.status === 'Playing' ? 'green' : 'yellow'} wrap="truncate-end">
							{metadata.status === 'Playing' ? '●' : '○'} {metadata.status}
						</Text>
						<Text color="gray" dimColor>
							{truncate(hotkeyStr, dimensions.columns - 25)}
						</Text>
					</Box>
					<Box flexShrink={0}>
						<Text color="gray" dimColor> v1.3.2</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
