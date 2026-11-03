import React, {memo, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import withObservables from '@nozbe/with-observables';
import {Q} from '@nozbe/watermelondb';
import {database} from '../../../core/database';
import type Schedule from '../../../core/database/models/Schedule';
import type Subject from '../../../core/database/models/Subject';
import ScheduleActivity from '../../../core/database/models/ScheduleActivity';
import {palette} from '../../../tokens';
import {useVisibleNow} from '../../../shared/hooks/useVisibleNow';
import {
  classDayLabel,
  modificationDate,
  nextClass,
  relativeTime,
} from '../domain/recent';

interface Actions {
  onOpenSchedule: (id: string) => void;
  onOpenSubject: (id: string) => void;
}
interface Props extends Actions {
  schedule?: Schedule;
  subjects: Subject[];
  activities: ScheduleActivity[];
}

export const RecentContent = memo(function RecentContent({
  schedule,
  subjects,
  activities,
  onOpenSchedule,
  onOpenSubject,
}: Props) {
  const [activityExpanded, setActivityExpanded] = useState(true);
  const now = useVisibleNow();
  const updatedAt = schedule ? modificationDate(schedule) : undefined;
  const upcoming = useMemo(() => nextClass(subjects, now), [subjects, now]);
  const activity = activities.length
    ? activities
    : [...subjects]
        .filter(subject => subject.createdAt?.getTime() > 0)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 4)
        .map(subject => ({
          id: subject.id,
          label: `${subject.code} added`,
          detail: subject.title,
          kind: 'added',
          createdAt: subject.createdAt,
        }));
  return (
    <View style={styles.content}>
      {schedule ? (
        <View style={styles.row}>
          <Text style={styles.caption}>
            {updatedAt ? 'Updated' : 'Added'}{' '}
            {relativeTime(updatedAt ?? schedule.createdAt, now)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View schedule"
            onPress={() => onOpenSchedule(schedule.id)}
            hitSlop={8}
            style={({pressed}) => [
              styles.scheduleLink,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.scheduleLinkText}>View schedule</Text>
            <MaterialIcon
              name="chevron-right"
              size={20}
              color={palette.primary}
            />
          </Pressable>
        </View>
      ) : (
        <View style={styles.empty}>
          <MaterialIcon name="event-note" size={30} color={palette.secondary} />
          <Text style={styles.term}>Your schedule starts here</Text>
        </View>
      )}

      {schedule &&
        (upcoming ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${upcoming.subject.code}`}
            onPress={() => onOpenSubject(upcoming.subject.id)}
            style={({pressed}) => [styles.nextCard, pressed && styles.pressed]}>
            <View style={styles.row}>
              <Text style={styles.nextLabel}>
                {upcoming.ongoing ? 'IN CLASS' : 'UP NEXT'}
              </Text>
              <MaterialIcon
                name="north-east"
                size={22}
                color={palette.surface}
              />
            </View>
            <Text
              style={styles.nextCode}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}>
              {upcoming.subject.code}
            </Text>
            <Text style={styles.nextTitle} numberOfLines={2}>
              {upcoming.subject.title}
            </Text>
            <View style={styles.nextFooter}>
              <Text style={styles.nextMeta}>
                {classDayLabel(upcoming.startsAt, now)} ·{' '}
                {upcoming.subject.startTime} – {upcoming.subject.endTime}
              </Text>
              <Text style={styles.nextMeta} numberOfLines={2}>
                {upcoming.subject.room || 'Room TBA'}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.freeCard}>
            <MaterialIcon
              name="event-available"
              size={22}
              color={palette.primary}
            />
            <Text style={styles.freeText}>No upcoming classes</Text>
          </View>
        ))}

      {(schedule || activity.length > 0) && (
        <View style={styles.activitySection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Activity"
            accessibilityState={{expanded: activityExpanded}}
            onPress={() => setActivityExpanded(value => !value)}
            style={({pressed}) => [
              styles.activityHeading,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.sectionTitle}>ACTIVITY</Text>
            <MaterialIcon
              name={activityExpanded ? 'expand-less' : 'expand-more'}
              size={22}
              color={palette.muted}
            />
          </Pressable>
          {activityExpanded &&
            (activity.length ? (
              <View style={styles.activityCard}>
                {activity.map((item, index) => (
                  <View
                    key={item.id}
                    style={[styles.activityRow, index > 0 && styles.divider]}>
                    <View style={styles.activityIcon}>
                      <MaterialIcon
                        name={
                          item.kind === 'added'
                            ? 'add'
                            : item.kind === 'removed' ||
                              item.kind === 'schedule_removed'
                            ? 'remove'
                            : 'edit'
                        }
                        size={20}
                        color={palette.primary}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.activityTitle} numberOfLines={2}>
                        {item.label}
                      </Text>
                      <Text style={styles.activityDetail} numberOfLines={1}>
                        {item.detail}
                      </Text>
                    </View>
                    <Text style={styles.age}>
                      {relativeTime(item.createdAt, now)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.caption}>Changes will appear here.</Text>
            ))}
        </View>
      )}
    </View>
  );
});

const ActiveRecent = withObservables(
  ['schedule'],
  ({schedule}: {schedule: Schedule}) => ({
    schedule: schedule.observe(),
    subjects: schedule.subjects.observeWithColumns([
      'code',
      'title',
      'days',
      'start_time',
      'end_time',
      'room',
    ]),
  }),
)(RecentContent);

const RecentOverviewUI = memo(function RecentOverviewUI({
  schedules,
  activities,
  ...actions
}: Actions & {schedules: Schedule[]; activities: ScheduleActivity[]}) {
  return schedules[0] ? (
    <ActiveRecent
      {...actions}
      schedule={schedules[0]}
      activities={activities}
    />
  ) : (
    <RecentContent {...actions} subjects={[]} activities={activities} />
  );
});

export const RecentOverview = withObservables([], () => ({
  schedules: database
    .get<Schedule>('schedules')
    .query(Q.sortBy('created_at', Q.desc), Q.take(1))
    .observe(),
  activities: database
    .get<ScheduleActivity>('schedule_activities')
    .query(Q.sortBy('created_at', Q.desc), Q.take(4))
    .observe(),
}))(RecentOverviewUI);

const styles = StyleSheet.create({
  content: {gap: 18},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  grow: {flex: 1, minWidth: 0},
  term: {fontSize: 20, fontWeight: '700', color: palette.ink},
  caption: {fontSize: 13, lineHeight: 20, color: palette.muted, flexShrink: 1},
  scheduleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    flexShrink: 0,
    gap: 2,
  },
  scheduleLinkText: {fontSize: 14, fontWeight: '600', color: palette.primary},
  nextCard: {padding: 24, borderRadius: 32, backgroundColor: palette.primary},
  nextLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.surface,
    letterSpacing: 1.3,
  },
  nextCode: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: palette.surface,
    marginTop: 24,
  },
  nextTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: palette.surface,
    marginTop: 5,
  },
  nextFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(250,246,239,0.2)',
    paddingTop: 14,
    marginTop: 20,
    gap: 5,
  },
  nextMeta: {fontSize: 14, lineHeight: 21, color: palette.surface},
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: palette.muted,
  },
  activitySection: {marginTop: 4},
  activityHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 44,
  },
  activityCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  divider: {borderTopWidth: 1, borderTopColor: palette.border},
  activityIcon: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(197,160,89,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: palette.ink,
  },
  activityDetail: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.muted,
    marginTop: 4,
  },
  age: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: palette.muted,
    maxWidth: 90,
    flexShrink: 0,
    textAlign: 'right',
  },
  freeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 24,
  },
  freeText: {fontSize: 15, lineHeight: 22, color: palette.body},
  empty: {alignItems: 'center', gap: 12, paddingVertical: 40},
  pressed: {opacity: 0.8},
});
