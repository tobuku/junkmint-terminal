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
import { fetchLocationId } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ReaderScreen({ navigation }: Props) {
  const [readers, setReaders] = useState<Reader.Type[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedReader, setConnectedReader] = useState<Reader.Type | null>(null);
  const [initialized, setInitialized] = useState(false);
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

  const handleDisconnect = useCallback(async () => {
    setError('');
    try {
      await disconnectReader();
      setConnectedReader(null);
    } catch (e: any) {
      setError(e.message || 'Failed to disconnect');
    }
  }, [disconnectReader]);

  const handleDiscover = useCallback(async () => {
    setError('');
    setReaders([]);

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
      // Not connected — that's fine
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
          style={styles.button}
          onPress={() => navigation.navigate('Charge')}
        >
          <Text style={styles.buttonText}>Collect Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
        >
          <Text style={styles.disconnectText}>Disconnect Reader</Text>
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
        style={[styles.button, (scanning || !initialized) && styles.buttonDisabled]}
        onPress={handleDiscover}
        disabled={scanning || connecting || !initialized}
      >
        {scanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Scan for Readers</Text>
        )}
      </TouchableOpacity>

      {connecting && (
        <View style={styles.connectingRow}>
          <ActivityIndicator color="#2563eb" />
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
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
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
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { marginTop: 24 },
  readerRow: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  readerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  readerDetail: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 32 },
  connectedCard: {
    backgroundColor: '#064e3b',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#059669',
  },
  connectedLabel: {
    color: '#34d399',
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
  disconnectButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  disconnectText: { color: '#94a3b8', fontSize: 16 },
});
