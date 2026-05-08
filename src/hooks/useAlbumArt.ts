import { useState, useEffect } from 'react';
import got from 'got';
import { Jimp } from 'jimp';
import chalk from 'chalk';

export const useAlbumArt = (url: string, width: number, height: number, mode: 'high-res' | 'ascii') => {
	const [artString, setArtString] = useState<string>('');

	useEffect(() => {
		if (!url) {
			setArtString('');
			return;
		}

		let cancelled = false;

		const fetchArt = async () => {
			try {
				const response = await got(url, { responseType: 'buffer' });
				if (cancelled) return;

				// @ts-ignore
				const image = await Jimp.read(Buffer.from(response.body));
				if (cancelled) return;

				// Sharpen
				image.convolute([[0, -1, 0], [-1, 5, -1], [0, -1, 0]]);

				if (mode === 'high-res') {
					image.resize({ w: width, h: height * 2 });
					let result = '';
					for (let y = 0; y < image.bitmap.height; y += 2) {
						for (let x = 0; x < image.bitmap.width; x++) {
							const idx1 = (y * image.bitmap.width + x) * 4;
							const r1 = image.bitmap.data[idx1];
							const g1 = image.bitmap.data[idx1 + 1];
							const b1 = image.bitmap.data[idx1 + 2];

							const hasBottom = (y + 1) < image.bitmap.height;
							const idx2 = ((y + 1) * image.bitmap.width + x) * 4;
							const r2 = hasBottom ? image.bitmap.data[idx2] : 0;
							const g2 = hasBottom ? image.bitmap.data[idx2 + 1] : 0;
							const b2 = hasBottom ? image.bitmap.data[idx2 + 2] : 0;

							if (hasBottom) {
								result += chalk.rgb(r1, g1, b1).bgRgb(r2, g2, b2)('▀');
							} else {
								result += chalk.rgb(r1, g1, b1)('▀');
							}
						}
						if (y < image.bitmap.height - 2) result += '\n';
					}
					if (!cancelled) setArtString(result);
				} else {
					image.resize({ w: width, h: height });
					image.greyscale();
					const chars = ' .:-=+*#%@';
					let asciiResult = '';
					for (let y = 0; y < image.bitmap.height; y++) {
						for (let x = 0; x < image.bitmap.width; x++) {
							const idx = (y * image.bitmap.width + x) * 4;
							const brightness = image.bitmap.data[idx];
							const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
							asciiResult += chars[charIdx];
						}
						if (y < image.bitmap.height - 1) asciiResult += '\n';
					}
					if (!cancelled) setArtString(asciiResult);
				}
			} catch {
				if (!cancelled) setArtString('');
			}
		};

		fetchArt();

		return () => { cancelled = true; };
	}, [url, width, height, mode]);

	return artString;
};
