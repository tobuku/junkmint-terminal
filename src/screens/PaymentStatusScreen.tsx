import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{
    PaymentStatus: {
      success: boolean;
      amountCents: number;
      message?: string;
      paymentIntentId?: string;
      returnUrl?: string;
    };
  }, 'PaymentStatus'>;
};

export default function PaymentStatusScreen({ route, navigation }: Props) {
  const { success, amountCents, message, paymentIntentId, returnUrl } = route.params;
  const dollars = (amountCents / 100).toFixed(2);

  function handleReturnToJunkMint() {
    if (returnUrl) {
      const sep = returnUrl.includes('?') ? '&' : '?';
      const params = success
        ? `payment=success&amountCents=${amountCents}${paymentIntentId ? `&paymentIntentId=${paymentIntentId}` : ''}`
        : 'payment=failed';
      Linking.openURL(`${returnUrl}${sep}${params}`);
    } else {
      Linking.openURL('https://junkmint.com');
    }
  }

  return (
    <View style={styles.container}>
      {/* Radial glow effect */}
      <View style={styles.glowContainer}>
        <View style={[styles.glowRing3, success ? styles.glowGreen : styles.glowRed]} />
        <View style={[styles.glowRing2, success ? styles.glowGreen : styles.glowRed]} />
        <View style={[styles.glowRing1, success ? styles.glowGreen : styles.glowRed]} />
        <View style={[styles.iconCircle, success ? styles.iconCircleSuccess : styles.iconCircleFail]}>
          <Text style={[styles.icon, success ? styles.iconSuccess : styles.iconFail]}>
            {success ? '\u2713' : '\u2717'}
          </Text>
        </View>
      </View>

      <Text style={styles.status}>
        {success ? 'Payment Successful!' : 'Payment Failed'}
      </Text>
      <Text style={styles.subtitle}>
        {success
          ? 'Your transaction has been completed securely.'
          : message || 'The transaction could not be completed.'}
      </Text>
      <Text style={styles.amount}>${dollars}</Text>

      {returnUrl ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReturnToJunkMint}
        >
          <Text style={styles.primaryButtonText}>
            {success ? 'Return to JunkMint' : 'Back to JunkMint'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Charge')}
      >
        <Text style={styles.secondaryButtonText}>New Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tertiaryButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.tertiaryButtonText}>Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  glowRing3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
  },
  glowRing2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.15,
  },
  glowRing1: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.25,
  },
  glowGreen: {
    backgroundColor: '#4ade80',
  },
  glowRed: {
    backgroundColor: '#f87171',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: '#4ade80',
  },
  iconCircleFail: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: '#f87171',
  },
  icon: {
    fontSize: 40,
    fontWeight: '800',
  },
  iconSuccess: {
    color: '#4ade80',
  },
  iconFail: {
    color: '#f87171',
  },
  status: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  amount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#4ade80',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#0a0a0a',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  secondaryButtonText: { color: '#4ade80', fontSize: 16, fontWeight: '600' },
  tertiaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  tertiaryButtonText: { color: '#94a3b8', fontSize: 16 },
});
