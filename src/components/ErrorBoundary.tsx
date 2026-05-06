import React, { Component, type ReactNode } from 'react';
import { Box, Text } from 'ink';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return (
				<Box flexDirection="column" paddingX={1} paddingY={0}>
					<Text bold color="red">Lyre encountered an error</Text>
					<Text dimColor color="gray">{this.state.error?.message}</Text>
					<Text dimColor color="gray">Press Ctrl+C to exit</Text>
				</Box>
			);
		}

		return this.props.children;
	}
}
