import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { createPaymentIntent } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ChargeScreen({ navigation }: Props) {
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { retrievePaymentIntent, collectPaymentMethod, confirmPaymentIntent } = useStripeTerminal();

  function parseAmountCents(input: string): number | null {
    // Accept formats: "25", "25.00", "25.5"
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
      // 1. Create PaymentIntent on backend
      console.log('[Charge] Creating PaymentIntent for', cents, 'cents');
      const { clientSecret } = await createPaymentIntent(cents, memo || undefined);
      console.log('[Charge] Got clientSecret');

      // 2. Retrieve the PaymentIntent object from the SDK
      const { paymentIntent, error: retrieveError } = await retrievePaymentIntent(clientSecret);
      console.log('[Charge] Retrieve result:', { pi: paymentIntent?.id, status: paymentIntent?.status, error: retrieveError?.message });
      if (retrieveError || !paymentIntent) {
        setError(retrieveError?.message || 'Failed to retrieve payment intent');
        setLoading(false);
        return;
      }

      // 3. Collect payment method (reader prompts tap/insert/swipe)
      const { paymentIntent: collectedPI, error: collectError } = await collectPaymentMethod({ paymentIntent });
      console.log('[Charge] Collect result:', { pi: collectedPI?.id, status: collectedPI?.status, error: collectError?.message });
      if (collectError || !collectedPI) {
        setError(collectError?.message || 'Failed to collect payment method');
        setLoading(false);
        return;
      }

      // 4. Confirm the payment
      const { paymentIntent: confirmedPI, error: confirmError } = await confirmPaymentIntent({ paymentIntent: collectedPI });
      console.log('[Charge] Confirm result:', { pi: confirmedPI?.id, status: confirmedPI?.status, error: confirmError?.message });
      if (confirmError) {
        navigation.navigate('PaymentStatus', {
          success: false,
          message: confirmError.message,
          amountCents: cents,
        });
      } else {
        navigation.navigate('PaymentStatus', {
          success: true,
          amountCents: cents,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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
            autoFocus
          />
        </View>
        {displayAmount != null && (
          <Text style={styles.centsPreview}>
            = {displayAmount} cents
          </Text>
        )}

        <Text style={styles.label}>Memo (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Junk removal - 123 Main St"
          placeholderTextColor="#64748b"
          value={memo}
          onChangeText={setMemo}
        />

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
    marginBottom: 24,
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
  centsPreview: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  button: {
    backgroundColor: '#16a34a',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
