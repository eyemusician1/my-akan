import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { ScheduleWidget } from '../../widgets/ScheduleWidget';
import React from 'react';

export async function syncScheduleToWidget(subjects: any[]) {
  try {
    const today = new Date();
    const dayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const currentDay = dayMap[today.getDay()];

    // Filter classes happening today
    const todaysClasses = subjects
      .filter((s) => s.days && s.days.includes(currentDay))
      .map((s) => ({
        code: s.code,
        room: s.room,
        time: s.startTime,
        color: '#A8C7FA',
      }));

    // Save to cache for headless widget access
    await AsyncStorage.setItem('@widget_schedule_cache', JSON.stringify(todaysClasses));

    // Request native widget redraw
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateHeader = `${today.getDate()} ${dayNames[today.getDay()]}`;

    await requestWidgetUpdate({
      widgetName: 'ScheduleWidget',
      renderWidget: () => <ScheduleWidget dateHeader={dateHeader} subjects={todaysClasses} />,
    });
  } catch (error) {
    console.error('Failed to sync widget:', error);
  }
}