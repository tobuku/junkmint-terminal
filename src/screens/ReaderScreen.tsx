import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  useStripeTerminal,
  Reader,
} from '@stripe/stripe-terminal-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ReaderScreen({ navigation }: Props) {
  const [readers, setReaders] = useState<Reader.Type[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedReader, setConnectedReader] = useState<Reader.Type | null>(null);
  const [error, setError] = useState('');

  const { discoverReaders, connectBluetoothReader, cancelDiscovering } =
    useStripeTerminal();

  const handleDiscover = useCallback(async () => {
    setError('');
    setReaders([]);
    setScanning(true);
    const { error: discoverError } = await discoverReaders({
      discoveryMethod: 'bluetoothScan',
      simulated: __DEV__, // use simulated reader in dev
    });
    setScanning(false);
    if (discoverError) {
      setError(discoverError.message);
    }
  }, [discoverReaders]);

  const handleConnect = useCallback(
    async (reader: Reader.Type) => {
      setError('');
      setConnecting(true);
      await cancelDiscovering();
      const { reader: connected, error: connectError } =
        await connectBluetoothReader({
          reader,
          locationId: reader.locationId ?? undefined,
        });
      setConnecting(false);
      if (connectError) {
        setError(connectError.message);
        return;
      }
      if (connected) {
        setConnectedReader(connected);
      }
    },
    [connectBluetoothReader, cancelDiscovering],
  );

  // The SDK fires this callback as readers are discovered
  // We register it via the onUpdateDiscoveredReaders in StripeTerminalProvider
  // For now we handle it through the discover promise
  // TODO: wire onUpdateDiscoveredReaders if needed

  if (connectedReader) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <Text style={styles.connectedLabel}>Connected</Text>
          <Text style={styles.readerName}>
            {connectedReader.label || connectedReader.serialNumber}
          </Text>
          <Text style={styles.readerDetail}>
            Battery: {connectedReader.batteryLevel != null ? `${Math.round(connectedReader.batteryLevel * 100)}%` : 'N/A'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Charge')}
        >
          <Text style={styles.buttonText}>Collect Payment</Text>
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
        style={[styles.button, scanning && styles.buttonDisabled]}
        onPress={handleDiscover}
        disabled={scanning || connecting}
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
});
