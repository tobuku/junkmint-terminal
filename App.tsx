import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { supabase, supabaseConfigured } from './src/lib/supabase';
import { fetchConnectionToken } from './src/lib/api';
import ErrorBoundary from './src/components/ErrorBoundary';
import type { Session } from '@supabase/supabase-js';
import type { NavigationContainerRef } from '@react-navigation/native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import ChargeScreen from './src/screens/ChargeScreen';
import PaymentStatusScreen from './src/screens/PaymentStatusScreen';

const Stack = createNativeStackNavigator();

const SESSION_TIMEOUT_MS = 12000;

const screenOptions = {
  headerStyle: { backgroundColor: '#0a0a0a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#0a0a0a' },
};

function parseDeepLink(url: string): { amount?: number; memo?: string; returnUrl?: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'charge') return null;
    const amount = parsed.searchParams.get('amount');
    const memo = parsed.searchParams.get('memo');
    const returnUrl = parsed.searchParams.get('returnUrl');
    return {
      amount: amount ? parseInt(amount, 10) : undefined,
      memo: memo || undefined,
      returnUrl: returnUrl || undefined,
    };
  } catch {
    return null;
  }
}

function ConfigErrorScreen() {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Configuration Error</Text>
      <Text style={styles.errorMessage}>
        The app is missing required configuration. Please reinstall or contact support.
      </Text>
    </View>
  );
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const pendingDeepLink = useRef<{ amount?: number; memo?: string; returnUrl?: string } | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      setStartupError(true);
      return;
    }

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      setLoading(false);
    }, SESSION_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!timedOut) {
          clearTimeout(timeout);
          setSession(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!timedOut) {
          clearTimeout(timeout);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  function handleDeepLink(url: string) {
    const params = parseDeepLink(url);
    if (!params) return;

    const nav = navigationRef.current;
    if (nav && nav.isReady()) {
      nav.navigate('Charge', {
        amountCents: params.amount,
        memo: params.memo,
        returnUrl: params.returnUrl,
      });
    } else {
      pendingDeepLink.current = params;
    }
  }

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  function onNavigationReady() {
    if (pendingDeepLink.current) {
      const params = pendingDeepLink.current;
      pendingDeepLink.current = null;
      navigationRef.current?.navigate('Charge', {
        amountCents: params.amount,
        memo: params.memo,
        returnUrl: params.returnUrl,
      });
    }
  }

  if (startupError) {
    return <ConfigErrorScreen />;
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  if (!session) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <StripeTerminalProvider logLevel="error" tokenProvider={fetchConnectionToken}>
      <NavigationContainer ref={navigationRef} onReady={onNavigationReady} linking={{
        prefixes: ['junkmint-terminal://'],
        config: { screens: { Charge: 'charge' } },
      }}>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'JunkMint Terminal', headerShown: false }} />
          <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: 'Connect Reader' }} />
          <Stack.Screen name="Charge" component={ChargeScreen as any} options={{ title: 'Charge' }} />
          <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen as any} options={{ title: 'Result', headerBackVisible: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeTerminalProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});
