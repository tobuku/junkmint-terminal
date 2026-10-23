import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: Props) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleBackToJunkMint() {
    Linking.openURL('https://junkmint.com');
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inner}>
        <Text style={styles.title}>JunkMint Terminal</Text>
        <Text style={styles.subtitle}>Tap-to-Pay Payment Processing</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Reader')}
        >
          <Text style={styles.primaryButtonText}>Connect Reader</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Charge')}
        >
          <Text style={styles.primaryButtonText}>Collect Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.junkMintButton}
          onPress={handleBackToJunkMint}
        >
          <Text style={styles.junkMintButtonText}>Back to JunkMint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  junkMintButton: {
    backgroundColor: '#16a34a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  junkMintButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signOutButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signOutText: { color: '#94a3b8', fontSize: 16 },
});
