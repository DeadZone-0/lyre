import { useState, useEffect, useRef } from 'react';
import { execa } from 'execa';
import { log } from '../utils/logger.js';

export const useCava = (configPath: string, barsCount: number, deps: any[] = []) => {
	const [bars, setBars] = useState<number[]>(new Array(barsCount).fill(0));
	const bufferRef = useRef('');
	const lastUpdateRef = useRef(0);

	useEffect(() => {
		log(`Starting CAVA with config: ${configPath}`);
		const cava = execa('cava', ['-p', configPath]);

		cava.then(() => {
			log('CAVA process exited successfully');
		}).catch((error) => {
			if (error.isTerminated) {
				log('CAVA process terminated by Lyre');
				return;
			}
			log(`CAVA Error: ${error.message}`);
		});

		cava.stderr?.on('data', (data) => {
			log(`CAVA stderr: ${data.toString()}`);
		});

		cava.stdout?.on('data', (data: Buffer) => {
			if (lastUpdateRef.current === 0) {
				log('CAVA stdout received first frame');
			}
			bufferRef.current += data.toString();
			const lines = bufferRef.current.split('\n');
			bufferRef.current = lines.pop() || '';

			const now = Date.now();
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
		});

		return () => {
			if (!cava.killed) {
				cava.kill('SIGTERM');
			}
		};
	}, [configPath, barsCount, ...deps]);

	return bars;
};
