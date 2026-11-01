import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {palette, spacing} from '../../../tokens';

export function DuesInfo({onClose}: {onClose: () => void}) {
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialIcon
            name="account-balance-wallet"
            size={28}
            color={palette.primary}
          />
        </View>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close academic dues help"
          style={styles.close}>
          <MaterialIcon name="close" size={25} color={palette.ink} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Academic dues</Text>
      <Text style={styles.subtitle}>Your next payments, in order.</Text>
      <View style={styles.steps}>
        <HelpRow
          icon="drag-indicator"
          title="Drag to prioritize"
          detail="The top fee is next to pay."
        />
        <HelpRow
          icon="check-circle-outline"
          title="Mark as paid"
          detail="Completed fees move to Paid."
        />
        <HelpRow
          icon="menu-book"
          title="Log the payment"
          detail="Add it as an Academic expense."
        />
      </View>
      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        style={styles.button}>
        <Text style={styles.buttonText}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

function HelpRow({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialIcon name={icon} size={21} color={palette.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(197,160,89,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: palette.muted,
    marginTop: 6,
    marginBottom: spacing.xl,
  },
  steps: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: 16,
    gap: 20,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(197,160,89,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {flex: 1},
  rowTitle: {fontSize: 14, fontWeight: '700', color: palette.ink},
  detail: {fontSize: 12, lineHeight: 18, color: palette.body, marginTop: 3},
  button: {
    backgroundColor: palette.primary,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  buttonText: {fontSize: 16, fontWeight: '700', color: palette.surface},
});
