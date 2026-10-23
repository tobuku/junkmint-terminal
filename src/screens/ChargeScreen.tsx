import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { createPaymentIntent } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ Charge: { amountCents?: number; memo?: string; returnUrl?: string } }, 'Charge'>;
};

export default function ChargeScreen({ navigation, route }: Props) {
  const deepLinkAmount = route.params?.amountCents;
  const deepLinkMemo = route.params?.memo;
  const returnUrl = route.params?.returnUrl;

  const [amount, setAmount] = useState(
    deepLinkAmount ? (deepLinkAmount / 100).toFixed(2) : ''
  );
  const [memo, setMemo] = useState(deepLinkMemo || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { retrievePaymentIntent, collectPaymentMethod, confirmPaymentIntent } = useStripeTerminal();

  // If amount came from deep link, show it's pre-filled
  const isAutoPopulated = !!deepLinkAmount;

  function parseAmountCents(input: string): number | null {
    const cleaned = input.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  }

  async function handleCollect() {
    setError('');
    const cents = parseAmountCents(amount);
    if (!cents) {
      setError('Enter a valid dollar amount.');
      return;
    }
    if (cents < 50) {
      setError('Minimum charge is $0.50.');
      return;
    }

    setLoading(true);
    try {
      const { clientSecret } = await createPaymentIntent(cents, memo || undefined);

      const { paymentIntent, error: retrieveError } = await retrievePaymentIntent(clientSecret);
      if (retrieveError || !paymentIntent) {
        setError(retrieveError?.message || 'Failed to retrieve payment intent');
        setLoading(false);
        return;
      }

      const { paymentIntent: collectedPI, error: collectError } = await collectPaymentMethod({ paymentIntent });
      if (collectError || !collectedPI) {
        setError(collectError?.message || 'Failed to collect payment method');
        setLoading(false);
        return;
      }

      const { paymentIntent: confirmedPI, error: confirmError } = await confirmPaymentIntent({ paymentIntent: collectedPI });
      if (confirmError) {
        navigation.navigate('PaymentStatus', {
          success: false,
          message: confirmError.message,
          amountCents: cents,
          returnUrl,
        });
      } else {
        navigation.navigate('PaymentStatus', {
          success: true,
          amountCents: cents,
          paymentIntentId: confirmedPI?.id,
          returnUrl,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (returnUrl) {
      const sep = returnUrl.includes('?') ? '&' : '?';
      Linking.openURL(`${returnUrl}${sep}payment=cancelled`);
    } else {
      navigation.navigate('Home');
    }
  }

  const displayAmount = parseAmountCents(amount);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Collect Payment</Text>

        {isAutoPopulated && (
          <Text style={styles.autoLabel}>Amount from JunkMint</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#64748b"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus={!isAutoPopulated}
          />
        </View>

        {memo ? (
          <>
            <Text style={styles.label}>Memo</Text>
            <Text style={styles.memoText}>{memo}</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Memo (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Junk removal - 123 Main St"
              placeholderTextColor="#64748b"
              value={memo}
              onChangeText={setMemo}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCollect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Charge {displayAmount ? `$${(displayAmount / 100).toFixed(2)}` : ''}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>
            {returnUrl ? 'Cancel - Back to JunkMint' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  autoLabel: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  error: {
    color: '#f87171',
    marginBottom: 16,
    fontSize: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
  },
  dollar: { color: '#94a3b8', fontSize: 28, fontWeight: '600' },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    padding: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    fontSize: 16,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  memoText: {
    color: '#cbd5e1',
    fontSize: 16,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#16a34a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelText: { color: '#94a3b8', fontSize: 16 },
});
