import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radii, Spacing, Typography } from '@/theme';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AppModal({ visible, onClose, title, children }: AppModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="بستن"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          pointerEvents="box-none"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    direction: 'rtl',
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    direction: 'rtl',
  },
  title: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.md,
  },
});
