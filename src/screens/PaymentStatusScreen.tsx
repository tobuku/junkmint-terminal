import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  PaymentStatus: {
    success: boolean;
    amountCents: number;
    message?: string;
  };
  [key: string]: any;
};

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentStatus'>;

export default function PaymentStatusScreen({ route, navigation }: Props) {
  const { success, amountCents, message } = route.params;
  const dollars = (amountCents / 100).toFixed(2);

  return (
    <View style={styles.container}>
      <View style={[styles.card, success ? styles.successCard : styles.failCard]}>
        <Text style={styles.icon}>{success ? 'OK' : 'X'}</Text>
        <Text style={styles.status}>
          {success ? 'Payment Successful' : 'Payment Failed'}
        </Text>
        <Text style={styles.amount}>${dollars}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Charge')}
      >
        <Text style={styles.buttonText}>New Payment</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Reader')}
      >
        <Text style={styles.secondaryButtonText}>Back to Reader</Text>
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
    fontSize: 32,
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
