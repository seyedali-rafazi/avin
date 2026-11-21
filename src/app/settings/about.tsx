import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ScreenContainer,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
} from '@/components';
import { APP_INFO } from '@/constants/audio';
import { Colors, Layout, Radii, Spacing, Typography } from '@/theme';

const AVIN_LOGO = require('../../../assets/Avin-logo.png');

export default function AboutScreen() {
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader title="About" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandCardWrap}>
          <LinearGradient
            colors={[...Colors.heroGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandCard}
          >
            <Image
              source={AVIN_LOGO}
              style={styles.logoImage}
              contentFit="cover"
            />
            <Text style={Typography.greeting}>{APP_INFO.name}</Text>
            <Text style={styles.tagline}>{APP_INFO.tagline}</Text>
            <View style={styles.versionPill}>
              <Text style={styles.versionText}>Version {APP_INFO.version}</Text>
            </View>
          </LinearGradient>
        </View>

        <SettingsSection title="Application">
          <SettingsRow title="Architecture" valueText="Offline-First Local" />
          <SettingsRow title="Audio Engine" valueText="Expo Audio" />
          <SettingsRow title="Database" valueText="SQLite + Drizzle ORM" />
          <SettingsRow title="Privacy" valueText="100% On-Device" isLast />
        </SettingsSection>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xxl,
  },
  brandCardWrap: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.xl,
  },
  brandCard: {
    borderRadius: Radii.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.subtitle,
    textAlign: 'center',
  },
  versionPill: {
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
