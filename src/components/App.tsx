import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { useCava } from '../hooks/useCava.js';
import { useMetadata } from '../hooks/useMetadata.js';
import { useAlbumArt } from '../hooks/useAlbumArt.js';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve config paths (Support both local dev and global install)
const getPaths = () => {
	const localConfig = path.resolve(__dirname, '../../lyre.json');
	const localCava = path.resolve(__dirname, '../../cava.conf');
	
	const globalDir = path.join(os.homedir(), '.config', 'lyre');
	const globalConfig = path.join(globalDir, 'lyre.json');
	const globalCava = path.join(globalDir, 'cava.conf');

	if (fs.existsSync(localConfig)) {
		return { config: localConfig, cava: localCava };
	}
	
	// Ensure global dir exists if not in local dev
	if (!fs.existsSync(globalDir)) {
		fs.mkdirSync(globalDir, { recursive: true });
	}
	
	// Create default cava.conf if it doesn't exist globally
	if (!fs.existsSync(globalCava)) {
		fs.writeFileSync(globalCava, `[general]\nframerate = 30\nbars = 100\nautosens = 1\n\n[output]\nmethod = raw\nraw_target = /dev/stdout\ndata_format = ascii\nascii_max_range = 1000\n\n[smoothing]\nmonstercat = 1\nintegral = 85\ngravity = 100\n`);
	}

	return { config: globalConfig, cava: globalCava };
};

const paths = getPaths();
const CONFIG_PATH = paths.cava;
const LYRE_CONFIG_PATH = paths.config;

// Load config
let lyreConfig = {
	albumArt: { enabled: true, mode: 'high-res' as 'high-res' | 'ascii', maxHeight: 18 },
	visualizer: { bars: 80, fps: 30 }
};
try {
	if (fs.existsSync(LYRE_CONFIG_PATH)) {
		const saved = JSON.parse(fs.readFileSync(LYRE_CONFIG_PATH, 'utf-8'));
		lyreConfig = {
			...lyreConfig,
			...saved,
			albumArt: {
				...lyreConfig.albumArt,
				...saved.albumArt,
				mode: (saved.albumArt?.mode === 'ascii') ? 'ascii' : 'high-res'
			}
		};
	}
} catch (e) {}

const BLOCKS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const Visualizer = ({ bars, height = 4 }: { bars: number[]; height?: number }) => {
	const maxLevel = height * 8;
	
	const vizString = useMemo(() => {
		let result = '';
		for (let r = height - 1; r >= 0; r--) {
			for (let i = 0; i < bars.length; i++) {
				const v = bars[i] || 0;
				const level = Math.floor((v / 1000) * maxLevel);
				const rowLevel = level - (r * 8);
				const char = rowLevel <= 0 ? BLOCKS[0] : (rowLevel >= 8 ? BLOCKS[8] : BLOCKS[rowLevel]);
				
				let colorFunc = chalk.cyan;
				const pos = i / bars.length;
				if (pos < 0.25) colorFunc = chalk.blue;
				else if (pos > 0.75) colorFunc = chalk.magenta;
				else if (pos > 0.5) colorFunc = chalk.red;
				
				result += colorFunc(char);
			}
			if (r > 0) result += '\n';
		}
		return result;
	}, [bars, height, maxLevel]);

	return <Text wrap="truncate">{vizString}</Text>;
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

const AlbumArt = ({ pixels, ascii, mode }: { pixels: string; ascii: string; mode: string }) => {
	if (mode === 'ascii') return <Text color="white">{ascii}</Text>;
	if (!pixels) return <Text color="gray">No Art</Text>;
	return <Text wrap="truncate">{pixels}</Text>;
};

export const App = () => {
	const { stdout } = useStdout();
	const { exit } = useApp();
	const [dimensions, setDimensions] = useState({ 
		columns: stdout?.columns || 80, 
		rows: stdout?.rows || 24 
	});

	useEffect(() => {
		const onResize = () => {
			setDimensions({
				columns: stdout?.columns || 80,
				rows: stdout?.rows || 24
			});
		};
		stdout?.on('resize', onResize);
		return () => {
			stdout?.off('resize', onResize);
		};
	}, [stdout]);

	const metadata = useMetadata();
	
	const { enabled, mode, maxHeight } = lyreConfig.albumArt;
	const artSize = enabled 
		? Math.max(6, Math.min(maxHeight, Math.floor(dimensions.rows / 2) - 4)) 
		: 0;
	
	const artString = useAlbumArt(metadata.artUrl, artSize * 2, artSize, mode);

	const padding = 6;
	const artWidth = enabled ? artSize * 2 + 4 : 0; 
	const availableWidth = Math.max(30, dimensions.columns - padding - artWidth);
	
	const bars = useCava(CONFIG_PATH, availableWidth);
	const vizHeight = Math.max(2, Math.min(8, Math.floor(dimensions.rows / 4)));

	useInput((input, key) => {
		if (input === 'q') exit();
		if (input === ' ') execa('playerctl', ['play-pause']).catch(() => {});
		if (key.rightArrow || input === 'l') execa('playerctl', ['next']).catch(() => {});
		if (key.leftArrow || input === 'h') execa('playerctl', ['previous']).catch(() => {});
		if (key.upArrow || input === 'k') execa('playerctl', ['volume', '0.05+']).catch(() => {});
		if (key.downArrow || input === 'j') execa('playerctl', ['volume', '0.05-']).catch(() => {});
	});

	return (
		<Box 
			flexDirection="column" 
			paddingX={1} 
			paddingY={0}
			borderStyle="round" 
			borderColor="magenta" 
			width={dimensions.columns}
			height={dimensions.rows}
		>
			<Box flexDirection="row" flexGrow={1} overflow="hidden">
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
						<AlbumArt pixels={artString} ascii={artString} mode={mode} />
					</Box>
				)}

				<Box flexDirection="column" flexGrow={1} justifyContent="center" overflow="hidden">
					<Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
						<Box flexDirection="column" flexGrow={1}>
							<Text bold color="yellow" wrap="truncate-end">
								{metadata.title}
							</Text>
							<Text color="white" dimColor wrap="truncate-end">{metadata.artist}</Text>
							<Text italic color="gray" dimColor wrap="truncate-end">{metadata.album}</Text>
						</Box>
						<Box flexShrink={0} marginLeft={1}>
							<Text color="cyan" bold italic>LYRE</Text>
						</Box>
					</Box>

					<Box flexDirection="column" alignItems="center" marginBottom={1} width="100%" overflow="hidden">
						<Visualizer bars={bars} height={vizHeight} />
					</Box>

					<Box justifyContent="center" width="100%" marginBottom={1}>
						<ProgressBar 
							current={metadata.position} 
							total={metadata.duration} 
							width={availableWidth} 
						/>
					</Box>

					<Box flexDirection="row" justifyContent="space-between" width="100%">
						<Box flexShrink={1}>
							<Text color={metadata.status === 'Playing' ? 'green' : 'yellow'} wrap="truncate">
								{metadata.status === 'Playing' ? '●' : '○'} {metadata.status}
							</Text>
						</Box>
						<Box flexShrink={0}>
							<Text color="gray" dimColor> v1.8.0</Text>
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
