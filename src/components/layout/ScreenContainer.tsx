import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '@/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  edges = ['top'],
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
