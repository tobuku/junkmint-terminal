import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import {
  useStripeTerminal,
  Reader,
} from '@stripe/stripe-terminal-react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { fetchLocationId } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const LAST_READER_KEY = 'junkmint_last_reader_serial';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ReaderScreen({ navigation }: Props) {
  const [readers, setReaders] = useState<Reader.Type[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedReader, setConnectedReader] = useState<Reader.Type | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [error, setError] = useState('');

  const { initialize, discoverReaders, connectReader, disconnectReader, cancelDiscovering } =
    useStripeTerminal({
      onUpdateDiscoveredReaders: (updatedReaders) => {
        setReaders(updatedReaders);
      },
    });

  useEffect(() => {
    initialize().then(() => {
      setInitialized(true);
    }).catch((e: any) => {
      setError(`SDK init failed: ${e?.message || e}`);
    });
  }, [initialize]);

  // Auto-reconnect to last known reader
  useEffect(() => {
    if (!initialized) return;

    let cancelled = false;

    async function tryAutoReconnect() {
      // Brief delay to ensure SDK is fully ready after initialize() resolves
      await new Promise((r) => setTimeout(r, 1000));
      if (cancelled) return;

      const savedSerial = await SecureStore.getItemAsync(LAST_READER_KEY);
      if (!savedSerial || cancelled) return;

      if (Platform.OS === 'ios') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
      }

      setAutoConnecting(true);
      try {
        await disconnectReader();
      } catch (_) {}

      if (cancelled) return;

      // Start discovery and wait for the saved reader to appear
      const { error: discoverError } = await discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: false,
      });

      if (discoverError || cancelled) {
        setAutoConnecting(false);
      }
    }

    tryAutoReconnect();
    return () => { cancelled = true; };
  }, [initialized]);

  // When readers update during auto-connect, look for saved reader
  useEffect(() => {
    if (!autoConnecting || readers.length === 0) return;

    async function connectToSaved() {
      const savedSerial = await SecureStore.getItemAsync(LAST_READER_KEY);
      if (!savedSerial) {
        setAutoConnecting(false);
        return;
      }

      const match = readers.find((r) => r.serialNumber === savedSerial);
      if (!match) return; // Keep waiting for more readers

      await cancelDiscovering();
      setConnecting(true);
      try {
        let locationId = match.locationId;
        if (!locationId || locationId === 'tml_simulated') {
          locationId = await fetchLocationId();
        }

        const { reader: connected, error: connectError } = await connectReader({
          reader: match,
          discoveryMethod: 'bluetoothScan',
          locationId,
        });

        if (connectError) {
          setError(`Auto-connect failed: ${connectError.message}`);
        } else if (connected) {
          setConnectedReader(connected);
        }
      } catch (e: any) {
        setError(`Auto-connect failed: ${e.message}`);
      } finally {
        setConnecting(false);
        setAutoConnecting(false);
      }
    }

    connectToSaved();
  }, [readers, autoConnecting]);

  const handleDisconnect = useCallback(async () => {
    setError('');
    try {
      await disconnectReader();
      setConnectedReader(null);
      await SecureStore.deleteItemAsync(LAST_READER_KEY);
    } catch (e: any) {
      setError(e.message || 'Failed to disconnect');
    }
  }, [disconnectReader]);

  const handleDiscover = useCallback(async () => {
    setError('');
    setReaders([]);
    setAutoConnecting(false);

    if (Platform.OS === 'ios') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to scan for readers.');
        return;
      }
    }

    setScanning(true);
    try {
      await disconnectReader();
    } catch (_) {
      // Not connected
    }
    try {
      const { error: discoverError } = await discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: false,
      });
      setScanning(false);
      if (discoverError) {
        setError(discoverError.message);
      }
    } catch (e: any) {
      setScanning(false);
      setError(e.message || 'Discovery failed');
    }
  }, [discoverReaders, disconnectReader]);

  const handleConnect = useCallback(
    async (reader: Reader.Type) => {
      setError('');
      setConnecting(true);
      await cancelDiscovering();
      try {
        let locationId = reader.locationId;
        if (!locationId || locationId === 'tml_simulated') {
          locationId = await fetchLocationId();
        }

        const { reader: connected, error: connectError } =
          await connectReader({
            reader,
            discoveryMethod: 'bluetoothScan',
            locationId,
          });
        setConnecting(false);
        if (connectError) {
          setError(connectError.message);
          return;
        }
        if (connected) {
          setConnectedReader(connected);
          await SecureStore.setItemAsync(LAST_READER_KEY, reader.serialNumber);
        }
      } catch (e: any) {
        setConnecting(false);
        setError(e.message || 'Connection failed');
      }
    },
    [connectReader, cancelDiscovering],
  );

  if (connectedReader) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <Text style={styles.connectedLabel}>Connected</Text>
          <Text style={styles.readerName}>
            {connectedReader.label || connectedReader.serialNumber}
          </Text>
          <Text style={styles.readerDetail}>
            {connectedReader.deviceType}
            {connectedReader.batteryLevel != null
              ? ` | Battery: ${Math.round(connectedReader.batteryLevel * 100)}%`
              : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Charge')}
        >
          <Text style={styles.primaryButtonText}>Collect Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleDisconnect}
        >
          <Text style={styles.secondaryButtonText}>Disconnect Reader</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeText}>Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (autoConnecting) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.autoConnectText}>Reconnecting to reader...</Text>
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 24 }]}
          onPress={() => {
            setAutoConnecting(false);
            cancelDiscovering();
          }}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Reader</Text>
      <Text style={styles.subtitle}>
        Discover your Stripe M2 reader via Bluetooth
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryButton, (scanning || !initialized) && styles.buttonDisabled]}
        onPress={handleDiscover}
        disabled={scanning || connecting || !initialized}
      >
        {scanning ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.primaryButtonText}>Scan for Readers</Text>
        )}
      </TouchableOpacity>

      {connecting && (
        <View style={styles.connectingRow}>
          <ActivityIndicator color="#4ade80" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}

      <FlatList
        data={readers}
        keyExtractor={(item) => item.serialNumber}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.readerRow}
            onPress={() => handleConnect(item)}
            disabled={connecting}
          >
            <Text style={styles.readerName}>
              {item.label || item.serialNumber}
            </Text>
            <Text style={styles.readerDetail}>{item.deviceType}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !scanning ? (
            <Text style={styles.emptyText}>
              No readers found. Tap "Scan" to search.
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  error: {
    color: '#f87171',
    marginBottom: 16,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#4ade80',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  list: { marginTop: 24 },
  readerRow: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  readerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  readerDetail: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 32 },
  connectedCard: {
    backgroundColor: '#1a1a2e',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  connectedLabel: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  connectingText: { color: '#94a3b8', marginLeft: 8 },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  secondaryButtonText: { color: '#94a3b8', fontSize: 16 },
  homeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  homeText: { color: '#64748b', fontSize: 16 },
  autoConnectText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },
});
