import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Checkmark path length (M12,24 L22,34 L38,16) — measured ~37
const CHECK_LENGTH = 37;
// Circle circumference (r=22) — 2 * PI * 22
const CIRCLE_LENGTH = 2 * Math.PI * 22;

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

  // Animation values
  const checkDash = useRef(new Animated.Value(CHECK_LENGTH)).current;
  const circleDash = useRef(new Animated.Value(CIRCLE_LENGTH)).current;
  const svgScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const [animationDone, setAnimationDone] = useState(!success);

  useEffect(() => {
    if (!success) return;

    // Phase 1: Checkmark draws (600ms)
    // Phase 2: Circle sweeps (800ms, starts at 400ms)
    // Phase 3: Scale bounce + glow (300ms, after circle)
    // Phase 4: Content reveals (400ms, after bounce)
    Animated.sequence([
      // Phases 1+2 overlap
      Animated.parallel([
        Animated.timing(checkDash, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(circleDash, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Phase 3: bounce + glow
      Animated.parallel([
        Animated.sequence([
          Animated.timing(svgScale, {
            toValue: 1.15,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(svgScale, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: content reveal
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setAnimationDone(true));
  }, []);

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
      {success ? (
        <>
          {/* Animated checkmark area */}
          <Animated.View style={[styles.animationArea, { transform: [{ scale: svgScale }] }]}>
            {/* Glow rings */}
            <Animated.View style={[styles.glowRing3, styles.glowGreen, { opacity: Animated.multiply(glowOpacity, 0.08) }]} />
            <Animated.View style={[styles.glowRing2, styles.glowGreen, { opacity: Animated.multiply(glowOpacity, 0.15) }]} />
            <Animated.View style={[styles.glowRing1, styles.glowGreen, { opacity: Animated.multiply(glowOpacity, 0.25) }]} />
            <Svg width={120} height={120} viewBox="0 0 50 50">
              <AnimatedCircle
                cx={25}
                cy={25}
                r={22}
                stroke="#4ade80"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_LENGTH}
                strokeDashoffset={circleDash}
                rotation={-90}
                origin="25,25"
              />
              <AnimatedPath
                d="M 12 26 L 21 35 L 38 16"
                stroke="#4ade80"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={CHECK_LENGTH}
                strokeDashoffset={checkDash}
              />
            </Svg>
          </Animated.View>

          {/* Content fades in after animation */}
          <Animated.View style={[styles.contentArea, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
            <Text style={styles.status}>Payment Successful!</Text>
            <Text style={styles.subtitle}>Your transaction has been completed securely.</Text>
            <Text style={styles.amount}>${dollars}</Text>
            {renderButtons()}
          </Animated.View>
        </>
      ) : (
        <>
          {/* Static failed state */}
          <View style={styles.glowContainer}>
            <View style={[styles.glowRing3, styles.glowRed]} />
            <View style={[styles.glowRing2, styles.glowRed]} />
            <View style={[styles.glowRing1, styles.glowRed]} />
            <View style={[styles.iconCircle, styles.iconCircleFail]}>
              <Text style={[styles.icon, styles.iconFail]}>{'\u2717'}</Text>
            </View>
          </View>
          <Text style={styles.status}>Payment Failed</Text>
          <Text style={styles.subtitle}>{message || 'The transaction could not be completed.'}</Text>
          <Text style={styles.amount}>${dollars}</Text>
          {renderButtons()}
        </>
      )}
    </View>
  );

  function renderButtons() {
    return (
      <>
        {returnUrl ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleReturnToJunkMint}>
            <Text style={styles.primaryButtonText}>
              {success ? 'Return to JunkMint' : 'Back to JunkMint'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Charge')}>
          <Text style={styles.secondaryButtonText}>New Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.tertiaryButtonText}>Home</Text>
        </TouchableOpacity>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationArea: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  contentArea: {
    width: '100%',
    alignItems: 'center',
  },
  // Failed state - static glow
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
  },
  glowRing2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  glowRing1: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  glowGreen: {
    backgroundColor: '#4ade80',
  },
  glowRed: {
    backgroundColor: '#f87171',
    opacity: 0.15,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  iconCircleFail: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: '#f87171',
  },
  icon: {
    fontSize: 40,
    fontWeight: '800',
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
