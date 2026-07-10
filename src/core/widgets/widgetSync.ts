import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { database } from '../database';
import Schedule from '../database/models/Schedule';
import Subject from '../database/models/Subject';
import { WidgetSubject } from '../../widgets/ScheduleWidget';
import { ScheduleWidget } from '../../widgets/ScheduleWidget';

export async function syncScheduleToWidget() {
  try {
    const today = new Date();
    const dayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const currentDay = dayMap[today.getDay()];
    const dateHeader = `${today.getDate()} ${currentDay}`;

    // 1. Fetch the latest active academic term from WatermelonDB
    const schedules = await database.get<Schedule>('schedules').query(Q.sortBy('created_at', Q.desc)).fetch();
    let formattedSubjects: WidgetSubject[] = [];

    if (schedules.length > 0) {
      const activeSchedule = schedules[0];
      const subjects = await activeSchedule.subjects.fetch();

      // 2. Filter subjects scheduled for today
      formattedSubjects = subjects
        .filter((s: Subject) => s.days && s.days.includes(currentDay))
        .map((s: Subject) => ({
          code: s.code,
          room: s.room || 'TBA',
          time: s.startTime ? s.startTime.replace(/\s*[AaPp][Mm]/i, '') : 'TBA',
          color: '#A8C7FA', // Google M3 Accent Blue
        }));
    }

    // 3. Save to local storage for offline headless recovery
    // This cache is read by the WidgetTaskHandler on every widget update cycle
    await AsyncStorage.setItem('@widget_schedule_cache', JSON.stringify(formattedSubjects));

    // 4. Redraw any installed widget immediately so it does not stay on the initial blank frame
    await requestWidgetUpdate({
      widgetName: 'RNWidgetProvider',
      renderWidget: async () =>
        React.createElement(ScheduleWidget, { dateHeader, subjects: formattedSubjects }),
    });

    console.log(`[WidgetSync] Updated cache with ${formattedSubjects.length} classes for ${currentDay}`);
    console.log('[WidgetSync] Widget will refresh on next update cycle (30 minutes)');

  } catch (error) {
    console.error('[WidgetSync] Failed to sync schedule to widget:', error);
  }
}