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
import { Colors, Fonts, Layout, Radii, Spacing, Typography } from '@/theme';
import { toPersianDigits } from '@/utils/format';

const AVIN_LOGO = require('../../../assets/Avin-logo.png');

export default function AboutScreen() {
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader title="درباره برنامه" onBack={() => router.back()} />

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
            <Text style={styles.brandName}>{APP_INFO.name}</Text>
            <Text style={styles.tagline}>{APP_INFO.tagline}</Text>
            <View style={styles.versionPill}>
              <Text style={styles.versionText}>
                نسخه {toPersianDigits(APP_INFO.version)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <SettingsSection title="مشخصات برنامه">
          <SettingsRow title="معماری" valueText="آفلاین و محلی" />
          <SettingsRow title="موتور صوتی" valueText="پخش بومی پیشرفته" />
          <SettingsRow title="پایگاه‌داده" valueText="ذخیره‌سازی محلی سریع" />
          <SettingsRow title="حریم خصوصی" valueText="۱۰۰٪ روی دستگاه شما" isLast />
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176, 106, 255, 0.25)',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.xs,
  },
  brandName: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    lineHeight: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
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
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
});
