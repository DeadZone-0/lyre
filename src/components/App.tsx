import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useCava } from '../hooks/useCava.js';
import { useMetadata } from '../hooks/useMetadata.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../../cava.conf');

const BLOCKS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const VisualizerRow = ({ bars, r, height }: { bars: number[]; r: number; height: number }) => {
	const maxLevel = height * 8;
	
	// Group bars by color to reduce component count
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

	const availableWidth = Math.max(20, dimensions.columns - 4);
	const bars = useCava(CONFIG_PATH, availableWidth);
	const metadata = useMetadata();
	const vizHeight = Math.max(2, Math.min(8, Math.floor(dimensions.rows / 4)));

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
			<Box flexDirection="row" justifyContent="space-between" marginBottom={0}>
				<Box flexDirection="column">
					<Text bold color="yellow">
						{metadata.title.length > dimensions.columns - 15 
							? metadata.title.slice(0, dimensions.columns - 18) + '...' 
							: metadata.title}
					</Text>
					<Text color="white" dimColor>{metadata.artist}</Text>
				</Box>
				<Box>
					<Text color="cyan" bold italic>LYRE</Text>
				</Box>
			</Box>

			<Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
				<Visualizer bars={bars} height={vizHeight} />
			</Box>

			<Box marginBottom={0} justifyContent="center" width="100%">
				<ProgressBar 
					current={metadata.position} 
					total={metadata.duration} 
					width={dimensions.columns - 6} 
				/>
			</Box>

			<Box justifyContent="space-between" width="100%">
				<Box>
					<Text color={metadata.status === 'Playing' ? 'green' : 'yellow'}>
						{metadata.status === 'Playing' ? '●' : '○'} {metadata.status}
					</Text>
				</Box>
				<Text color="gray" dimColor>v1.2.1</Text>
			</Box>
		</Box>
	);
};
