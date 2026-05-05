import { useState, useEffect } from 'react';
import terminalImage from 'terminal-image';
import got from 'got';
import fs from 'fs/promises';

export const useAlbumArt = (url: string, width: number, height: number) => {
	const [art, setArt] = useState<string>('');

	useEffect(() => {
		if (!url) {
			setArt('');
			return;
		}

		const fetchArt = async () => {
			try {
				let imageBuffer: Buffer | Uint8Array;

				if (url.startsWith('http')) {
					imageBuffer = await got(url).buffer() as Buffer;
				} else if (url.startsWith('file://')) {
					const filePath = url.replace('file://', '');
					imageBuffer = await fs.readFile(filePath);
				} else {
					// Assume local path
					imageBuffer = await fs.readFile(url);
				}

				if (imageBuffer && imageBuffer.length > 0) {
					const imageString = await terminalImage.buffer(imageBuffer, {
						width,
						height,
					});
					setArt(imageString);
				}
			} catch (error) {
				// Silently fail, but we could add logging to a file for debugging
				// await fs.appendFile('debug.log', `Error fetching art: ${error}\n`);
				setArt('');
			}
		};

		fetchArt();
	}, [url, width, height]);

	return art;
};
