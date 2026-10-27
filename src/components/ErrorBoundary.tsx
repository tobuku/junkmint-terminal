import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an error during startup.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 32,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
});
