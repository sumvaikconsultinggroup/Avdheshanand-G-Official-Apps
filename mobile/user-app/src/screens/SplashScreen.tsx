import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { colors } from '../theme';

const LOGO_SOURCE = require('../../assets/images/avdheshanandg-mission-logo.png');

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const omScale = new Animated.Value(0.5);
  const omOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      // Om symbol appears and scales
      Animated.parallel([
        Animated.spring(omScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(omOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Text fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(800),
    ]).start(() => onComplete());
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoCircle,
          {
            transform: [{ scale: omScale }],
            opacity: omOpacity,
          },
        ]}
      >
        <Image source={LOGO_SOURCE} resizeMode="contain" style={styles.logo} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.omSymbol,
          {
            transform: [{ scale: omScale }],
            opacity: omOpacity,
          },
        ]}
      >
        ॐ
      </Animated.Text>
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.title}>Swami Avdheshanand</Text>
        <Text style={styles.subtitle}>Hari Om Tat Sat</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.parchment,
  },
  logoCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0D8AF',
    shadowColor: colors.gold.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 116,
    height: 116,
  },
  omSymbol: {
    fontSize: 64,
    color: colors.gold.main,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.maroon,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
