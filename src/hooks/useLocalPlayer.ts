import { useState, useEffect, useRef } from 'react';
import { execa } from 'execa';
import * as mm from 'music-metadata';
import net from 'net';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface LocalPlayerState {
	isActive: boolean;
	title: string;
	artist: string;
	album: string;
	artUrl: string;
	duration: number;
	position: number;
	status: 'Playing' | 'Paused' | 'Stopped';
	queue: string[];
	currentIndex: number;
	isShuffle: boolean;
	isLoop: boolean;
}

const IPC_PATH = path.join(os.tmpdir(), 'lyre-mpv.sock');
const ART_PATH = path.join(os.tmpdir(), 'lyre-art.jpg');

export const useLocalPlayer = () => {
	const [state, setState] = useState<LocalPlayerState>({
		isActive: false,
		title: '',
		artist: '',
		album: '',
		artUrl: '',
		duration: 0,
		position: 0,
		status: 'Stopped',
		queue: [],
		currentIndex: -1,
		isShuffle: false,
		isLoop: false
	});

	const processRef = useRef<any>(null);
	const socketRef = useRef<net.Socket | null>(null);
	const stateRef = useRef(state); // Keep track of state for the end-of-file event

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const sendCommand = (cmd: any[]) => {
		if (socketRef.current && !socketRef.current.destroyed) {
			socketRef.current.write(JSON.stringify({ command: cmd }) + '\n');
		}
	};

	const stop = () => {
		if (processRef.current) {
			processRef.current.kill('SIGTERM');
			processRef.current = null;
		}
		if (socketRef.current) {
			socketRef.current.destroy();
			socketRef.current = null;
		}
		setState(s => ({ ...s, isActive: false, status: 'Stopped', position: 0 }));
	};

	const playTrack = async (filePath: string) => {
		stop();
		
		if (fs.existsSync(IPC_PATH)) fs.unlinkSync(IPC_PATH);

		let newTitle = path.basename(filePath);
		let newArtist = 'Unknown Artist';
		let newAlbum = 'Unknown Album';
		let newArtUrl = '';
		let newDuration = 0;

		try {
			const metadata = await mm.parseFile(filePath);
			if (metadata.common.title) newTitle = metadata.common.title;
			if (metadata.common.artist) newArtist = metadata.common.artist;
			if (metadata.common.album) newAlbum = metadata.common.album;
			if (metadata.format.duration) newDuration = metadata.format.duration * 1000000;

			if (metadata.common.picture && metadata.common.picture.length > 0) {
				const pic = metadata.common.picture[0];
				if (pic) {
					fs.writeFileSync(ART_PATH, pic.data);
					newArtUrl = `file://${ART_PATH}`;
				}
			}
		} catch (e) {}

		setState(s => ({
			...s,
			isActive: true,
			title: newTitle,
			artist: newArtist,
			album: newAlbum,
			artUrl: newArtUrl,
			duration: newDuration,
			position: 0,
			status: 'Playing'
		}));

		const mpv = execa('mpv', [
			'--no-terminal',
			'--no-video',
			`--input-ipc-server=${IPC_PATH}`,
			filePath
		]);
		processRef.current = mpv;

		mpv.catch(() => {
			// Ignore SIGTERM
		}).finally(() => {
			// When MPV exits naturally (track ends), try to play next track
			if (processRef.current === mpv) {
				handleNextTrack();
			}
		});

		setTimeout(() => {
			if (!fs.existsSync(IPC_PATH)) return;
			const client = net.createConnection(IPC_PATH);
			socketRef.current = client;

			client.on('data', (data) => {
				const msgs = data.toString().split('\n').filter(Boolean);
				for (const msg of msgs) {
					try {
						const json = JSON.parse(msg);
						if (json.event === 'property-change' && json.name === 'time-pos') {
							setState(s => ({ ...s, position: (json.data || 0) * 1000000 }));
						}
						if (json.event === 'property-change' && json.name === 'pause') {
							setState(s => ({ ...s, status: json.data ? 'Paused' : 'Playing' }));
						}
					} catch (e) {}
				}
			});

			client.on('error', () => {});

			sendCommand(['observe_property', 1, 'time-pos']);
			sendCommand(['observe_property', 2, 'pause']);
		}, 500);
	};

	const handleNextTrack = () => {
		const s = stateRef.current;
		if (s.queue.length === 0) {
			stop();
			return;
		}

		let nextIdx = s.currentIndex + 1;
		if (s.isShuffle) {
			nextIdx = Math.floor(Math.random() * s.queue.length);
		}

		if (nextIdx >= s.queue.length) {
			if (s.isLoop) {
				nextIdx = 0;
			} else {
				stop();
				return;
			}
		}

		setState(s => ({ ...s, currentIndex: nextIdx }));
		const nextFile = s.queue[nextIdx];
		if (nextFile) {
			playTrack(nextFile);
		}
	};

	const handlePrevTrack = () => {
		const s = stateRef.current;
		if (s.queue.length === 0) return;

		let prevIdx = s.currentIndex - 1;
		if (prevIdx < 0) prevIdx = s.isLoop ? s.queue.length - 1 : 0;

		setState(s => ({ ...s, currentIndex: prevIdx }));
		const prevFile = s.queue[prevIdx];
		if (prevFile) {
			playTrack(prevFile);
		}
	};

	const playQueue = (queue: string[], startIndex: number) => {
		setState(s => ({ ...s, queue, currentIndex: startIndex }));
		const file = queue[startIndex];
		if (file) {
			playTrack(file);
		}
	};

	const togglePause = () => {
		if (state.isActive) sendCommand(['cycle', 'pause']);
	};

	const changeVolume = (dir: 'up' | 'down') => {
		if (state.isActive) sendCommand(['add', 'volume', dir === 'up' ? 5 : -5]);
	};
	
	const seek = (seconds: number) => {
		if (state.isActive) sendCommand(['seek', seconds]);
	};

	const toggleShuffle = () => {
		setState(s => ({ ...s, isShuffle: !s.isShuffle }));
	};

	const toggleLoop = () => {
		setState(s => ({ ...s, isLoop: !s.isLoop }));
	};

	useEffect(() => {
		return stop;
	}, []);

	return {
		localState: state,
		playQueue,
		togglePause,
		changeVolume,
		seek,
		nextTrack: handleNextTrack,
		prevTrack: handlePrevTrack,
		toggleShuffle,
		toggleLoop,
		stopLocal: stop
	};
};
