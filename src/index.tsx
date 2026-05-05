#!/usr/bin/env node
process.env['FORCE_COLOR'] = '3';
import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';

render(<App />);
