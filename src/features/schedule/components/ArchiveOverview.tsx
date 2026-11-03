import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import withObservables from '@nozbe/with-observables';
import {database} from '../../../core/database';
import {palette} from '../../../tokens';
import {useVisibleNow} from '../../../shared/hooks/useVisibleNow';
import {observeArchive, SavedSchedule} from '../data/archive';
import {modificationDate, relativeTime} from '../domain/recent';

interface Actions {
  onOpenSchedule: (id: string) => void;
}

export function ArchiveContent({
  entries,
  onOpenSchedule,
}: Actions & {entries: SavedSchedule[]}) {
  const now = useVisibleNow();
  if (!entries.length)
    return (
      <View style={styles.empty}>
        <MaterialIcon name="inventory-2" size={32} color={palette.secondary} />
        <Text style={styles.emptyTitle}>No saved schedules</Text>
        <Text style={styles.date}>Add a schedule from +.</Text>
      </View>
    );
  return (
    <View style={styles.list}>
      {entries.map((entry, index) => {
        const modified = modificationDate(entry);
        const date = modified ?? entry.createdAt;
        const when =
          now.getTime() - date.getTime() < 7 * 86400000
            ? relativeTime(date, now)
            : date.toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
        return (
          <React.Fragment key={entry.id}>
            {index === 1 && <Text style={styles.section}>Previous</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${entry.academicTerm}, ${
                entry.subjectCount
              } subjects, ${entry.totalUnits} units${
                entry.current ? ', current schedule' : ''
              }`}
              onPress={() => onOpenSchedule(entry.id)}
              style={({pressed}) => [styles.card, pressed && styles.pressed]}>
              <View style={styles.icon}>
                <MaterialIcon
                  name="event-note"
                  size={25}
                  color={palette.primary}
                />
              </View>
              <View style={styles.details}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{entry.academicTerm}</Text>
                  {entry.current && <Text style={styles.badge}>Current</Text>}
                </View>
                <Text style={styles.stats}>
                  {entry.subjectCount}{' '}
                  {entry.subjectCount === 1 ? 'subject' : 'subjects'} ·{' '}
                  {entry.totalUnits} {entry.totalUnits === 1 ? 'unit' : 'units'}
                </Text>
                <Text style={styles.date}>
                  {modified ? 'Updated' : 'Saved'} {when}
                </Text>
              </View>
              <MaterialIcon
                name="chevron-right"
                size={22}
                color={palette.muted}
              />
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

export const ArchiveOverview = withObservables([], () => ({
  entries: observeArchive(database),
}))(ArchiveContent);

const styles = StyleSheet.create({
  list: {gap: 12},
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.muted,
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  pressed: {opacity: 0.75},
  icon: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(197,160,89,0.12)',
  },
  details: {flex: 1, minWidth: 0, gap: 6},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {fontSize: 18, fontWeight: '700', color: palette.ink, flexShrink: 1},
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.primary,
    backgroundColor: 'rgba(197,160,89,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  stats: {fontSize: 14, color: palette.body},
  date: {fontSize: 12, color: palette.muted},
  empty: {alignItems: 'center', gap: 12, paddingVertical: 48},
  emptyTitle: {fontSize: 18, fontWeight: '600', color: palette.ink},
});
