import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { supabase } from './src/lib/supabase';
import { fetchConnectionToken } from './src/lib/api';
import type { Session } from '@supabase/supabase-js';
import type { NavigationContainerRef } from '@react-navigation/native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import ChargeScreen from './src/screens/ChargeScreen';
import PaymentStatusScreen from './src/screens/PaymentStatusScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#0f172a' },
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const pendingDeepLink = useRef<{ amount?: number; memo?: string; returnUrl?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s),
    );

    return () => subscription.unsubscribe();
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
    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle deep link while app is running
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

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
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
    <StripeTerminalProvider
      logLevel="error"
      tokenProvider={fetchConnectionToken}
    >
      <NavigationContainer
        ref={navigationRef}
        onReady={onNavigationReady}
        linking={{
          prefixes: ['junkmint-terminal://'],
          config: {
            screens: {
              Charge: 'charge',
            },
          },
        }}
      >
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'JunkMint Terminal', headerShown: false }}
          />
          <Stack.Screen
            name="Reader"
            component={ReaderScreen}
            options={{ title: 'Connect Reader' }}
          />
          <Stack.Screen
            name="Charge"
            component={ChargeScreen as any}
            options={{ title: 'Charge' }}
          />
          <Stack.Screen
            name="PaymentStatus"
            component={PaymentStatusScreen as any}
            options={{ title: 'Result', headerBackVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeTerminalProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
