import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, spacing } from '../tokens';

// ============================================================================
// SMART ROOM PARSER (Kept here so HomeScreen.tsx doesn't break)
// ============================================================================
export const locateBuildingByRoom = (roomString?: string | null): string | null => {
  if (!roomString) return null;
  const clean = roomString.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.includes('CICS') || clean.includes('MAC') || clean.includes('IT')) return 'CICS';
  if (clean.includes('COE') || clean.includes('ENGR') || clean.includes('MECH') || clean.includes('EE')) return 'COE';
  if (clean.includes('CBAA') || clean.includes('ACT') || clean.includes('MKT')) return 'CBAA';
  if (clean.includes('LAW') || clean.includes('COL')) return 'COL';
  if (clean.includes('COA') || clean.includes('AGRI') || clean.includes('SOIL')) return 'COA';
  if (clean.includes('CSSH') || clean.includes('HUM') || clean.includes('HIST')) return 'CSSH';
  if (clean.includes('CPA') || clean.includes('PUB')) return 'CPA';
  if (clean.includes('LIB')) return 'LIB';
  if (clean.includes('GYM') || clean.includes('OVAL') || clean.includes('PE')) return 'GYM';

  return null;
};

interface CampusMapModalProps {
  visible: boolean;
  onClose: () => void;
  targetBuildingId: string | null;
}

export function CampusMapModal({ visible, onClose, targetBuildingId }: CampusMapModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>

        {/* TOP APP BAR */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + spacing.sm }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MSU Campus Map</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* COMING SOON CONTENT */}
        <View style={styles.contentContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcon name="map" size={64} color={palette.primary} />
          </View>

          <Text style={styles.title}>Feature Coming Soon</Text>

          <Text style={styles.subtitle}>
            We are currently designing a custom, high-resolution 2D schematic of the Mindanao State University campus to give you lightning-fast, offline navigation.
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.bg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.bg,
    borderBottomWidth: 1,
    borderColor: palette.border,
    zIndex: 10
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink
  },

  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 80, // Push it slightly above vertical center
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(197, 160, 89, 0.15)', // Tonal primary background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.surface,
    letterSpacing: 0.5,
  }
});