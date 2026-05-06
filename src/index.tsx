#!/usr/bin/env node
process.env['FORCE_COLOR'] = '3';
import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

const instance = render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);

const cleanup = () => {
	instance.unmount();
	process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

process.on('uncaughtException', (error) => {
	console.error('\nUnexpected error:', error.message);
	cleanup();
});
