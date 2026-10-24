import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { createPaymentIntent } from '../lib/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ Charge: { amountCents?: number; memo?: string; returnUrl?: string } }, 'Charge'>;
};

function ProcessingOverlay() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  return (
    <View style={overlayStyles.container}>
      <View style={overlayStyles.content}>
        <Animated.View
          style={[
            overlayStyles.pulseCircle,
            { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
          ]}
        />
        <View style={overlayStyles.innerCircle}>
          <Text style={overlayStyles.cardIcon}>{'\u25B3'}</Text>
        </View>
        <Text style={overlayStyles.title}>Processing Payment...</Text>
        <Text style={overlayStyles.subtitle}>Present card to reader</Text>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#4ade80',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderWidth: 2,
    borderColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  cardIcon: {
    fontSize: 36,
    color: '#4ade80',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
  },
});

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

        {deepLinkMemo ? (
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
          <Text style={styles.buttonText}>
            Charge {displayAmount ? `$${(displayAmount / 100).toFixed(2)}` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>
            {returnUrl ? 'Cancel - Back to JunkMint' : 'Cancel'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && <ProcessingOverlay />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  autoLabel: {
    color: '#4ade80',
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
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
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
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  memoText: {
    color: '#cbd5e1',
    fontSize: 16,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  button: {
    backgroundColor: '#4ade80',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0a0a0a', fontSize: 18, fontWeight: '700' },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  cancelText: { color: '#4ade80', fontSize: 16, fontWeight: '600' },
});
