import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {palette, spacing} from '../../../tokens';
import {BudgetAnalysis, formatBudgetRange} from '../domain/budgetAnalysis';
import {formatMoney} from '../domain/money';
import {BUDGET_PERIODS, BudgetSettings} from '../domain/types';

interface Props {
  settings: BudgetSettings;
  analysis: BudgetAnalysis;
  onPress: () => void;
  disabled?: boolean;
}

export function BudgetCard({settings, analysis, onPress, disabled}: Props) {
  const label = BUDGET_PERIODS.find(
    period => period.value === settings.period,
  )!.label;
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Safe to spend today ${formatMoney(
        analysis.safeToSpend,
      )}. ${label} budget. Edit budget`}
      accessibilityHint="Change the amount, budget period, or unpaid fee reserve"
      accessibilityState={{disabled: !!disabled}}>
      <View style={styles.topRow}>
        <View style={styles.periodPill}>
          <Text style={styles.periodText}>{label}</Text>
        </View>
        <View style={styles.editHint}>
          <MaterialIcon name="edit" size={15} color={palette.surface} />
        </View>
      </View>
      <Text style={styles.subtitle}>Safe to spend today</Text>
      <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
        {formatMoney(analysis.safeToSpend)}
      </Text>
      <Text style={styles.periodRange}>
        {formatBudgetRange(analysis.start, analysis.end)}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {width: `${Math.min(100, analysis.budgetUsed * 100)}%`},
          ]}
        />
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Spent {formatMoney(analysis.totalSpent)}
        </Text>
        <Text style={styles.footerText}>
          {settings.period === 'daily'
            ? 'Today'
            : analysis.daysRemaining === 1
            ? 'Last day'
            : `${analysis.daysRemaining} days left`}
        </Text>
      </View>
      {settings.reserveDues && (
        <Text style={styles.reserveNote}>
          {formatMoney(analysis.reservedDues)} reserved for fees
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.primary,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: palette.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  periodPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  periodText: {fontSize: 12, fontWeight: '700', color: palette.surface},
  editHint: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 48,
    fontWeight: '800',
    color: palette.surface,
    textAlign: 'center',
    letterSpacing: -2,
  },
  periodRange: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: {fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)'},
  reserveNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
