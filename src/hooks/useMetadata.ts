import { useState, useEffect } from 'react';
import { execa } from 'execa';
import { log } from '../utils/logger.js';

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
		let timer: NodeJS.Timeout;
		let cancelled = false;

		const updateMetadata = async () => {
			if (cancelled) return;
			
			try {
				const argsMetadata = playerName ? ['-p', playerName, 'metadata'] : ['metadata'];
				const { stdout } = await execa('playerctl', [
					...argsMetadata,
					'--format',
					'{{title}}|||{{artist}}|||{{album}}|||{{position}}|||{{mpris:length}}|||{{mpris:artUrl}}',
				]);
				
				if (cancelled) return;

				const [title, artist, album, positionStr, durationStr, artUrl] = stdout.split('|||');
				
				const argsStatus = playerName ? ['-p', playerName, 'status'] : ['status'];
				const { stdout: status } = await execa('playerctl', argsStatus).catch(() => ({ stdout: 'Stopped' }));

				if (cancelled) return;

				const newMetadata = {
					title: title || 'Unknown Title',
					artist: artist || 'Unknown Artist',
					album: album || 'Unknown Album',
					status: status.trim() || 'Stopped',
					position: Number(positionStr) || 0,
					duration: Number(durationStr) || 0,
					artUrl: artUrl || '',
				};

				setMetadata(prev => {
					const hasChanged = 
						prev.title !== newMetadata.title ||
						prev.artist !== newMetadata.artist ||
						prev.album !== newMetadata.album ||
						prev.status !== newMetadata.status ||
						prev.position !== newMetadata.position ||
						prev.duration !== newMetadata.duration ||
						prev.artUrl !== newMetadata.artUrl;
					
					return hasChanged ? newMetadata : prev;
				});
			} catch (error: any) {
				if (!error.message.includes('No players found') && !cancelled) {
					log(`Metadata Error: ${error.message}`);
				}
			} finally {
				if (!cancelled) {
					timer = setTimeout(updateMetadata, 1000);
				}
			}
		};

		updateMetadata();

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [playerName]);

	return metadata;
};
