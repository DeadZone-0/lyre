#!/usr/bin/env node
process.env['FORCE_COLOR'] = '3';
import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import path from 'path';
import os from 'os';
import { log } from './utils/logger.js';

if (process.argv.includes('--debug')) {
	console.log(`Debug mode enabled. Writing logs to ${path.join(os.homedir(), '.config', 'lyre', 'debug.log')}`);
}

const instance = render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);

const cleanup = (exitCode = 0) => {
	instance.unmount();
	process.exit(exitCode);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

process.on('uncaughtException', (error) => {
	log(`CRITICAL: Uncaught Exception: ${error.message}\n${error.stack}`);
	console.error('\nUnexpected error:', error.message);
	cleanup(1);
});
