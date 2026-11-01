import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {palette} from '../../../tokens';
import {BudgetAnalysis} from '../domain/budgetAnalysis';
import {formatMoney} from '../domain/money';

export function SpendingBreakdown({analysis}: {analysis: BudgetAnalysis}) {
  const [expanded, setExpanded] = useState(false);
  if (!analysis.categoryTotals.length) return null;
  return (
    <View>
      <TouchableOpacity
        style={styles.heading}
        accessibilityRole="button"
        accessibilityLabel="Spending insights"
        accessibilityState={{expanded}}
        onPress={() => setExpanded(value => !value)}>
        <Text style={styles.sectionLabel}>Spending insights</Text>
        <MaterialIcon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={22}
          color={palette.muted}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.card}>
          {analysis.categoryTotals.map(category => (
            <View key={category.id} style={styles.category}>
              <View style={styles.categoryRow}>
                <MaterialIcon
                  name={category.icon}
                  size={18}
                  color={palette.primary}
                />
                <Text style={styles.categoryLabel}>{category.name}</Text>
                <Text style={styles.categoryAmount}>
                  {formatMoney(category.amount)}
                </Text>
                <Text style={styles.share}>
                  {Math.round(category.share * 100)}%
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.fill, {width: `${category.share * 100}%`}]}
                />
              </View>
            </View>
          ))}
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Daily average</Text>
            <Text style={styles.footerValue}>
              {formatMoney(analysis.averageDailySpend)}
            </Text>
          </View>
          {analysis.totalDays > 1 && (
            <Text style={styles.projection}>
              Projected total: {formatMoney(analysis.projectedSpending)}.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  card: {borderRadius: 28, backgroundColor: palette.surface, padding: 20},
  category: {marginBottom: 18},
  categoryRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 9},
  categoryLabel: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink,
  },
  categoryAmount: {fontSize: 13, fontWeight: '700', color: palette.body},
  share: {width: 40, textAlign: 'right', fontSize: 11, color: palette.muted},
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.border,
    overflow: 'hidden',
  },
  fill: {height: 5, borderRadius: 3, backgroundColor: palette.primary},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 14,
  },
  footerLabel: {fontSize: 13, color: palette.body},
  footerValue: {fontSize: 14, fontWeight: '700', color: palette.ink},
  projection: {
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
    marginTop: 8,
  },
});
