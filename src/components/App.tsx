import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useStdout, useInput, useApp } from 'ink';
import { useCava } from '../hooks/useCava.js';
import { useMetadata } from '../hooks/useMetadata.js';
import { useAlbumArt } from '../hooks/useAlbumArt.js';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../../cava.conf');

const BLOCKS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const VisualizerRow = ({ bars, r, height }: { bars: number[]; r: number; height: number }) => {
	const maxLevel = height * 8;
	const segments = useMemo(() => {
		const result: { text: string; color: string }[] = [];
		if (bars.length === 0) return result;
		let currentText = '';
		let currentColor = '';
		bars.forEach((v, i) => {
			const level = Math.floor((v / 1000) * maxLevel);
			const rowLevel = level - (r * 8);
			const char = rowLevel <= 0 ? BLOCKS[0] : (rowLevel >= 8 ? BLOCKS[8] : BLOCKS[rowLevel]);
			let color = 'cyan';
			const pos = i / bars.length;
			if (pos < 0.25) color = 'blue';
			else if (pos > 0.75) color = 'magenta';
			else if (pos > 0.5) color = 'red';
			if (color === currentColor) {
				currentText += char;
			} else {
				if (currentText) result.push({ text: currentText, color: currentColor });
				currentText = char;
				currentColor = color;
			}
		});
		if (currentText) result.push({ text: currentText, color: currentColor });
		return result;
	}, [bars, r, height, maxLevel]);

	return (
		<Box flexDirection="row">
			{segments.map((s, i) => (
				<Text key={i} color={s.color}>{s.text}</Text>
			))}
		</Box>
	);
};

const Visualizer = ({ bars, height = 4 }: { bars: number[]; height?: number }) => {
	const rows = [];
	for (let r = height - 1; r >= 0; r--) {
		rows.push(<VisualizerRow key={r} bars={bars} r={r} height={height} />);
	}
	return <Box flexDirection="column">{rows}</Box>;
};

const ProgressBar = ({ current, total, width }: { current: number; total: number; width: number }) => {
	if (total === 0) return null;
	const percentage = Math.min(current / total, 1);
	const barWidth = Math.max(10, width - 15);
	const completed = Math.round(barWidth * percentage);
	const remaining = barWidth - completed;

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
	
	// Album art dimensions
	const artSize = Math.max(8, Math.min(16, Math.floor(dimensions.rows / 2)));
	const art = useAlbumArt(metadata.artUrl, artSize * 2, artSize);

	const padding = 6;
	const artWidth = art ? artSize * 2 + 2 : 0;
	const availableWidth = Math.max(20, dimensions.columns - padding - artWidth);
	const bars = useCava(CONFIG_PATH, availableWidth);
	const vizHeight = Math.max(2, Math.min(8, Math.floor(dimensions.rows / 4)));

	// Keybindings
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
			<Box flexDirection="row" flexGrow={1}>
				{art && (
					<Box borderStyle="single" borderColor="gray" marginRight={2} padding={0} alignSelf="center">
						<Text>{art}</Text>
					</Box>
				)}

				<Box flexDirection="column" flexGrow={1} justifyContent="center">
					<Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
						<Box flexDirection="column">
							<Text bold color="yellow">
								{metadata.title.length > availableWidth - 10 
									? metadata.title.slice(0, availableWidth - 13) + '...' 
									: metadata.title}
							</Text>
							<Text color="white" dimColor>{metadata.artist}</Text>
							<Text italic color="gray" dimColor>{metadata.album}</Text>
						</Box>
						<Box>
							<Text color="cyan" bold italic>LYRE</Text>
						</Box>
					</Box>

					<Box flexDirection="column" alignItems="center" marginBottom={1}>
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
						<Box>
							<Text color={metadata.status === 'Playing' ? 'green' : 'yellow'}>
								{metadata.status === 'Playing' ? '●' : '○'} {metadata.status}
							</Text>
							<Text color="gray" dimColor>  (Space: Play/Pause, H/L: Prev/Next)</Text>
						</Box>
						<Text color="gray" dimColor>v1.4.0</Text>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};
