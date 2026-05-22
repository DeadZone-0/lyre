import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_FILE = path.join(os.homedir(), '.config', 'lyre', 'debug.log');

export const log = (message: string) => {
    if (!process.argv.includes('--debug')) return;
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    
    try {
        const logDir = path.dirname(LOG_FILE);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, formattedMessage);
    } catch (e) {
        // Silently fail if we can't write logs
    }
};
