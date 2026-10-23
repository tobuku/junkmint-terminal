import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';
import { supabase } from './src/lib/supabase';
import { fetchConnectionToken as _fetchConnectionToken } from './src/lib/api';

async function fetchConnectionTokenWithLogging(): Promise<string> {
  try {
    console.log('[Terminal] Fetching connection token...');
    const token = await _fetchConnectionToken();
    console.log('[Terminal] Got connection token OK');
    return token;
  } catch (e: any) {
    console.error('[Terminal] Token fetch FAILED:', e.message);
    throw e;
  }
}
import type { Session } from '@supabase/supabase-js';

import LoginScreen from './src/screens/LoginScreen';
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      logLevel="verbose"
      tokenProvider={fetchConnectionTokenWithLogging}
    >
      <NavigationContainer>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            name="Reader"
            component={ReaderScreen}
            options={{ title: 'JunkMint Terminal' }}
          />
          <Stack.Screen
            name="Charge"
            component={ChargeScreen}
            options={{ title: 'Charge' }}
          />
          <Stack.Screen
            name="PaymentStatus"
            component={PaymentStatusScreen}
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
