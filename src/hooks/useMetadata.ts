import { useState, useEffect } from 'react';
import { execa } from 'execa';

export interface Metadata {
	title: string;
	artist: string;
	album: string;
	status: string;
	position: number;
	duration: number;
	artUrl: string;
}

export const useMetadata = (playerName?: string) => {
	const [metadata, setMetadata] = useState<Metadata>({
		title: 'Unknown Title',
		artist: 'Unknown Artist',
		album: 'Unknown Album',
		status: 'Stopped',
		position: 0,
		duration: 0,
		artUrl: '',
	});

	useEffect(() => {
		const updateMetadata = async () => {
			try {
				const argsMetadata = playerName ? ['-p', playerName, 'metadata'] : ['metadata'];
				const { stdout } = await execa('playerctl', [
					...argsMetadata,
					'--format',
					'{{title}}|||{{artist}}|||{{album}}|||{{position}}|||{{mpris:length}}|||{{mpris:artUrl}}',
				]);
				const [title, artist, album, positionStr, durationStr, artUrl] = stdout.split('|||');
				
				const argsStatus = playerName ? ['-p', playerName, 'status'] : ['status'];
				const { stdout: status } = await execa('playerctl', argsStatus).catch(() => ({ stdout: 'Stopped' }));

				setMetadata({
					title: title || 'Unknown Title',
					artist: artist || 'Unknown Artist',
					album: album || 'Unknown Album',
					status: status.trim() || 'Stopped',
					position: Number(positionStr) || 0,
					duration: Number(durationStr) || 0,
					artUrl: artUrl || '',
				});
			} catch (error) {
				// Player not running or other error
			}
		};

		const interval = setInterval(updateMetadata, 1000);
		updateMetadata();

		return () => clearInterval(interval);
	}, [playerName]);

	return metadata;
};
