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
      <View style={[styles.card, success ? styles.successCard : styles.failCard]}>
        <Text style={styles.icon}>{success ? '\u2713' : '\u2717'}</Text>
        <Text style={styles.status}>
          {success ? 'Payment Successful' : 'Payment Failed'}
        </Text>
        <Text style={styles.amount}>${dollars}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      {returnUrl ? (
        <TouchableOpacity
          style={styles.returnButton}
          onPress={handleReturnToJunkMint}
        >
          <Text style={styles.returnButtonText}>
            {success ? 'Return to JunkMint' : 'Back to JunkMint'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Charge')}
      >
        <Text style={styles.buttonText}>New Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.secondaryButtonText}>Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  successCard: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
  },
  failCard: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  icon: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  status: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  message: {
    color: '#fca5a5',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: '#16a34a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: { color: '#94a3b8', fontSize: 16 },
});
