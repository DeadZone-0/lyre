import { useState, useEffect } from 'react';
import got from 'got';

export interface LyricLine {
	time: number; // milliseconds
	text: string;
}

export const useLyrics = (title: string, artist: string, duration: number) => {
	const [lyrics, setLyrics] = useState<LyricLine[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!title || title === 'Unknown Title') {
			setLyrics([]);
			return;
		}

		let cancelled = false;

		const fetchLyrics = async () => {
			setIsLoading(true);
			try {
				const durationSec = Math.floor(duration / 1000000);
				const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&duration=${durationSec}`;

				const response: any = await got(url).json();

				if (cancelled) return;

				if (response.syncedLyrics) {
					const lines = parseLRC(response.syncedLyrics);
					setLyrics(lines);
				} else {
					setLyrics([]);
				}
			} catch {
				if (!cancelled) setLyrics([]);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		fetchLyrics();

		return () => { cancelled = true; };
	}, [title, artist, duration]);

	return { lyrics, isLoading };
};

const parseLRC = (lrc: string): LyricLine[] => {
	const lines = lrc.split('\n');
	const result: LyricLine[] = [];
	const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

	lines.forEach(line => {
		const match = timeRegex.exec(line);
		if (match) {
			const mins = parseInt(match[1]!);
			const secs = parseInt(match[2]!);
			const msStr = match[3]!;
			const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3));
			
			const totalMs = (mins * 60 + secs) * 1000 + ms;
			const text = line.replace(timeRegex, '').trim();
			
			if (text) {
				result.push({ time: totalMs, text });
			}
		}
	});

	return result.sort((a, b) => a.time - b.time);
};
