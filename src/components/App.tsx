import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { useCava } from '../hooks/useCava.js';
import { useMetadata } from '../hooks/useMetadata.js';
import { useAlbumArt } from '../hooks/useAlbumArt.js';
import { useLyrics } from '../hooks/useLyrics.js';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve config paths
const getPaths = () => {
	const localConfig = path.resolve(__dirname, '../../lyre.json');
	const localCava = path.resolve(__dirname, '../../cava.conf');
	
	const globalDir = path.join(os.homedir(), '.config', 'lyre');
	const globalConfig = path.join(globalDir, 'lyre.json');
	const globalCava = path.join(globalDir, 'cava.conf');

	if (fs.existsSync(localConfig) && fs.existsSync(localCava)) {
		return { config: localConfig, cava: localCava };
	}
	
	if (!fs.existsSync(globalDir)) {
		fs.mkdirSync(globalDir, { recursive: true });
	}
	
	if (!fs.existsSync(globalCava)) {
		fs.writeFileSync(globalCava, `[general]\nframerate = 30\nbars = 100\nautosens = 1\n\n[output]\nmethod = raw\nraw_target = /dev/stdout\ndata_format = ascii\nascii_max_range = 1000\n\n[smoothing]\nmonstercat = 1\nintegral = 85\ngravity = 100\n`);
	}

	return { config: globalConfig, cava: globalCava };
};

const paths = getPaths();
const CONFIG_PATH = paths.cava;
const LYRE_CONFIG_PATH = paths.config;

const THEMES = {
	default: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['blue', 'cyan', 'magenta', 'red'], gradientDirection: 'horizontal', peakColor: '' },
	cyberpunk: { style: 'stacked', char: '■', emptyChar: ' ', gradient: ['#00ffff', '#ff00ff', '#ffff00'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	retro: { style: 'stacked', char: '━', emptyChar: ' ', gradient: ['#00ff00', '#aaff00', '#ffff00', '#ff8800', '#ff0000'], gradientDirection: 'vertical', peakColor: '#ff0000' },
	ocean: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['blue', 'blueBright', 'cyan'], gradientDirection: 'vertical', peakColor: 'white' },
	matrix: { style: 'stacked', char: '█', emptyChar: ' ', gradient: ['#003300', '#00ff00', '#ccffcc'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	fire: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['#330000', '#ff0000', '#ff8800', '#ffff00', '#ffffff'], gradientDirection: 'vertical', peakColor: '' },
	synthwave: { style: 'fluid', char: '█', emptyChar: ' ', gradient: ['#091833', '#133e7c', '#711c91', '#ea00d9', '#0abdc6'], gradientDirection: 'vertical', peakColor: '#ffffff' },
	glacier: { style: 'stacked', char: '■', emptyChar: ' ', gradient: ['#002244', '#0066aa', '#00aaff', '#aaffff'], gradientDirection: 'vertical', peakColor: '#ffffff' }
};

let initialConfig = {
	albumArt: { enabled: true, mode: 'high-res' as 'high-res' | 'ascii', maxHeight: 18 },
	visualizer: { bars: 80, fps: 30, theme: 'default' as keyof typeof THEMES },
	lyrics: { enabled: true, activeColor: 'yellow', inactiveColor: 'gray' }
};

try {
	if (fs.existsSync(LYRE_CONFIG_PATH)) {
		const saved = JSON.parse(fs.readFileSync(LYRE_CONFIG_PATH, 'utf-8'));
		initialConfig = {
			...initialConfig,
			...saved,
			albumArt: { ...initialConfig.albumArt, ...saved.albumArt, mode: (saved.albumArt?.mode === 'ascii') ? 'ascii' : 'high-res' },
			visualizer: { ...initialConfig.visualizer, ...saved.visualizer },
			lyrics: { ...initialConfig.lyrics, ...saved.lyrics }
		};
	}
} catch (e) {}

const BLOCKS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const Visualizer = ({ bars, height = 4, type = 'horizontal', activeTheme = 'default' }: { bars: number[]; height?: number; type?: 'horizontal' | 'minimal'; activeTheme?: string }) => {
	const theme = (THEMES as any)[activeTheme] || THEMES.default;
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

	const visibleLines = Math.floor(height / 2);
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
								wrap="truncate-end"
							>
								{isActive ? ` ${line.text} ` : line.text}
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

const AlbumArt = ({ pixels, mode }: { pixels: string; mode: string }) => {
	if (!pixels) return <Text color="gray">No Art</Text>;
	return <Text wrap="truncate">{pixels}</Text>;
};

const ThemeSelectorMode = ({ activeTheme, onSelect, onCancel, height }: { activeTheme: string; onSelect: (t: string) => void; onCancel: () => void; height: number }) => {
	const themes = Object.keys(THEMES);
	const [selectedIndex, setSelectedIndex] = useState(Math.max(0, themes.indexOf(activeTheme)));

	useInput((input, key) => {
		if (input === 'q' || key.escape || input === 't') onCancel();
		if (key.upArrow || input === 'k') setSelectedIndex(Math.max(0, selectedIndex - 1));
		if (key.downArrow || input === 'j') setSelectedIndex(Math.min(themes.length - 1, selectedIndex + 1));
		if (key.return || input === ' ') onSelect(themes[selectedIndex]!);
	});

	// Calculate visible items to avoid clipping
	const maxVisible = Math.max(3, height - 4); // leaving space for headers/footers
	let startIndex = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
	let endIndex = startIndex + maxVisible;
	if (endIndex > themes.length) {
		endIndex = themes.length;
		startIndex = Math.max(0, endIndex - maxVisible);
	}
	const visibleThemes = themes.slice(startIndex, endIndex);

	return (
		<Box flexDirection="column" alignItems="center" justifyContent="center" height="100%" width="100%">
			<Box marginBottom={1} paddingX={2} borderStyle="single" borderColor="magenta">
				<Text bold color="yellow">Theme Selector</Text>
			</Box>
			<Box flexDirection="column" alignItems="flex-start" paddingX={2} paddingY={1}>
				{startIndex > 0 && <Text color="gray">  ▲</Text>}
				{visibleThemes.map((theme) => {
					const index = themes.indexOf(theme);
					const isSelected = index === selectedIndex;
					return (
						<Text key={theme} color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
							{isSelected ? '▶ ' : '  '}{theme.charAt(0).toUpperCase() + theme.slice(1)}
						</Text>
					);
				})}
				{endIndex < themes.length && <Text color="gray">  ▼</Text>}
			</Box>
			<Box marginTop={1}>
				<Text color="gray" dimColor>(Enter: Select | T/Q: Cancel | Up/Down: Navigate)</Text>
			</Box>
		</Box>
	);
};

export const App = () => {
	const { stdout } = useStdout();
	const { exit } = useApp();
	const [dimensions, setDimensions] = useState({ columns: stdout?.columns || 80, rows: stdout?.rows || 24 });
	const [isLyricsMode, setIsLyricsMode] = useState(false);
	const [isThemeMode, setIsThemeMode] = useState(false);
	const [config, setConfig] = useState(initialConfig);

	useEffect(() => {
		const onResize = () => setDimensions({ columns: stdout?.columns || 80, rows: stdout?.rows || 24 });
		stdout?.on('resize', onResize);
		return () => { stdout?.off('resize', onResize); };
	}, [stdout]);

	const metadata = useMetadata();
	const { lyrics } = useLyrics(metadata.title, metadata.artist, metadata.duration);
	
	const { enabled, mode, maxHeight } = config.albumArt;
	const artSize = enabled ? Math.max(6, Math.min(maxHeight, Math.floor(dimensions.rows / 2) - 4)) : 0;
	const artString = useAlbumArt(metadata.artUrl, artSize * 2, artSize, mode);

	const padding = 6;
	const artWidth = enabled && !isLyricsMode && !isThemeMode ? artSize * 2 + 4 : 0; 
	const availableWidth = Math.max(30, dimensions.columns - padding - artWidth);
	
	const bars = useCava(CONFIG_PATH, availableWidth);
	const vizHeight = Math.max(2, Math.min(8, Math.floor(dimensions.rows / 4)));

	useInput((input, key) => {
		if (isThemeMode) return; // Let ThemeSelector handle inputs
		
		if (input === 'q') exit();
		if (input === 't') setIsThemeMode(true);
		if (input === ' ') execa('playerctl', ['play-pause']).catch(() => {});
		if (key.rightArrow || input === 'l') execa('playerctl', ['next']).catch(() => {});
		if (key.leftArrow || input === 'h') execa('playerctl', ['previous']).catch(() => {});
		if (key.upArrow || input === 'k') execa('playerctl', ['volume', '0.05+']).catch(() => {});
		if (key.downArrow || input === 'j') execa('playerctl', ['volume', '0.05-']).catch(() => {});
		if (input === 'v') setIsLyricsMode(!isLyricsMode);
	});

	const handleThemeSelect = (themeName: string) => {
		const newConfig = { ...config, visualizer: { ...config.visualizer, theme: themeName as any } };
		setConfig(newConfig);
		try {
			fs.writeFileSync(LYRE_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
		} catch (e) {}
		setIsThemeMode(false);
	};

	return (
		<Box flexDirection="column" paddingX={1} paddingY={0} borderStyle="round" borderColor="magenta" width={dimensions.columns} height={dimensions.rows}>
			<Box flexDirection="row" flexGrow={1} overflow="hidden">
				{isThemeMode ? (
					<ThemeSelectorMode 
						activeTheme={config.visualizer.theme} 
						onSelect={handleThemeSelect} 
						onCancel={() => setIsThemeMode(false)} 
						height={dimensions.rows - 6}
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
						{enabled && (
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
								<AlbumArt pixels={artString} mode={mode} />
							</Box>
						)}

						<Box flexDirection="column" flexGrow={1} justifyContent="center" overflow="hidden">
							<Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
								<Box flexDirection="column" flexGrow={1}>
									<Text bold color="yellow" wrap="truncate-end">{metadata.title}</Text>
									<Text color="white" dimColor wrap="truncate-end">{metadata.artist}</Text>
									<Text italic color="gray" dimColor wrap="truncate-end">{metadata.album}</Text>
								</Box>
								<Box flexShrink={0} marginLeft={1}>
									<Text color="cyan" bold italic>LYRE</Text>
								</Box>
							</Box>

							<Box flexDirection="column" alignItems="center" marginBottom={1} width="100%" overflow="hidden">
								<Visualizer bars={bars} height={vizHeight} activeTheme={config.visualizer.theme} />
							</Box>
						</Box>
					</>
				)}
			</Box>

			<Box flexDirection="column" width="100%">
				{isLyricsMode && !isThemeMode && (
					<Box marginBottom={0} justifyContent="center" width="100%">
						<Visualizer bars={bars} type="minimal" activeTheme={config.visualizer.theme} />
					</Box>
				)}
				
				<Box justifyContent="center" width="100%" marginBottom={1}>
					<ProgressBar current={metadata.position} total={metadata.duration} width={dimensions.columns - 6} />
				</Box>

				<Box flexDirection="row" justifyContent="space-between" width="100%">
					<Box flexShrink={1}>
						<Text color={metadata.status === 'Playing' ? 'green' : 'yellow'} wrap="truncate">
							{metadata.status === 'Playing' ? '●' : '○'} {metadata.status}
						</Text>
						<Text color="gray" dimColor> (V: Lyrics | T: Themes)</Text>
					</Box>
					<Box flexShrink={0}>
						<Text color="gray" dimColor> v1.2.0</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
