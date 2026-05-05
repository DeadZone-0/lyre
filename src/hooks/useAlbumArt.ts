import { useState, useEffect } from 'react';
import got from 'got';
import { Jimp } from 'jimp';

export interface Pixel {
	r: number;
	g: number;
	b: number;
}

export interface BraillePixel {
	char: string;
	color: string;
}

export const useAlbumArt = (url: string, width: number, height: number, mode: 'high-res' | 'ascii' | 'ultra-res') => {
	const [art, setArt] = useState<{ pixels: Pixel[][]; braille: BraillePixel[][]; ascii: string }>({ 
		pixels: [], braille: [], ascii: '' 
	});

	useEffect(() => {
		if (!url) {
			setArt({ pixels: [], braille: [], ascii: '' });
			return;
		}

		const fetchArt = async () => {
			try {
				const response = await got(url, { responseType: 'buffer' });
				// @ts-ignore
				const image = await Jimp.read(Buffer.from(response.body));
				
				if (mode === 'high-res') {
					image.resize({ w: width, h: height * 2 });
					const grid: Pixel[][] = [];
					for (let y = 0; y < image.bitmap.height; y++) {
						const row: Pixel[] = [];
						for (let x = 0; x < image.bitmap.width; x++) {
							const idx = (y * image.bitmap.width + x) * 4;
							row.push({
								r: image.bitmap.data[idx],
								g: image.bitmap.data[idx + 1],
								b: image.bitmap.data[idx + 2],
							});
						}
						grid.push(row);
					}
					setArt({ pixels: grid, braille: [], ascii: '' });
				} else if (mode === 'ultra-res') {
					// Braille mode with color
					image.resize({ w: width * 2, h: height * 4 });
					const brailleGrid: BraillePixel[][] = [];
					
					for (let y = 0; y < image.bitmap.height; y += 4) {
						const row: BraillePixel[] = [];
						for (let x = 0; x < image.bitmap.width; x += 2) {
							let charCode = 0;
							const dots = [
								[0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04],
								[1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20],
								[0, 3, 0x40], [1, 3, 0x80]
							];
							let tr = 0, tg = 0, tb = 0, count = 0;
							dots.forEach(([dx, dy, bit]) => {
								const py = y + dy;
								const px = x + dx;
								if (py < image.bitmap.height && px < image.bitmap.width) {
									const idx = (py * image.bitmap.width + px) * 4;
									const r = image.bitmap.data[idx];
									const g = image.bitmap.data[idx + 1];
									const b = image.bitmap.data[idx + 2];
									if ((r + g + b) / 3 > 120) charCode |= bit;
									tr += r; tg += g; tb += b;
									count++;
								}
							});
							const color = '#' + [Math.floor(tr/count), Math.floor(tg/count), Math.floor(tb/count)].map(x => x.toString(16).padStart(2, '0')).join('');
							row.push({ char: String.fromCharCode(0x2800 + charCode), color });
						}
						brailleGrid.push(row);
					}
					setArt({ pixels: [], braille: brailleGrid, ascii: '' });
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
					setArt({ pixels: [], braille: [], ascii: asciiResult });
				}
			} catch (error) {
				setArt({ pixels: [], braille: [], ascii: '' });
			}
		};

		fetchArt();
	}, [url, width, height, mode]);

	return art;
};
