import { useState, useEffect, useRef } from 'react';
import { execa } from 'execa';

export const useCava = (configPath: string, barsCount: number) => {
	const [bars, setBars] = useState<number[]>(new Array(barsCount).fill(0));
	const bufferRef = useRef('');
	const lastUpdateRef = useRef(0);

	useEffect(() => {
		const cava = execa('cava', ['-p', configPath]);

		// Prevent "Unexpected error" crash on exit by catching the termination
		cava.catch((error) => {
			if (error.isTerminated) return;
			// Only log actual non-termination errors if needed
		});

		cava.stdout?.on('data', (data: Buffer) => {
			bufferRef.current += data.toString();
			const lines = bufferRef.current.split('\n');
			bufferRef.current = lines.pop() || '';

			const now = Date.now();
			// Cap updates to ~30fps to match cava config and save CPU
			if (lines.length > 0 && now - lastUpdateRef.current > 30) {
				const lastCompleteFrame = lines[lines.length - 1];
				if (!lastCompleteFrame) return;

				const values = lastCompleteFrame
					.split(';')
					.filter(Boolean)
					.map(v => Number(v));

				if (values.length > 0) {
					const sampled = new Array(barsCount).fill(0).map((_, i) => {
						const idx = Math.floor((i / barsCount) * values.length);
						return values[idx] || 0;
					});
					setBars(sampled);
					lastUpdateRef.current = now;
				}
			}
			
			// Clear performance buffer if it exists to prevent memory warnings
			if (typeof performance !== 'undefined' && performance.clearMeasures) {
				performance.clearMeasures();
				performance.clearMarks();
			}
		});

		return () => {
			if (!cava.killed) {
				cava.kill('SIGTERM');
			}
		};
	}, [configPath, barsCount]);

	return bars;
};
