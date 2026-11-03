import React from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Q} from '@nozbe/watermelondb';
import {requestWidgetUpdate} from 'react-native-android-widget';
import {database} from '../database';
import Schedule from '../database/models/Schedule';
import {ScheduleWidget} from '../../widgets/ScheduleWidget';
import {
  makeWidgetSchedule,
  WIDGET_CACHE_KEY,
  WIDGET_NAME,
} from '../../widgets/scheduleData';

export async function loadWidgetSchedule() {
  const schedules = await database
    .get<Schedule>('schedules')
    .query(Q.sortBy('created_at', Q.desc), Q.take(1))
    .fetch();
  const subjects = schedules[0] ? await schedules[0].subjects.fetch() : [];
  const schedule = makeWidgetSchedule(subjects);
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(schedule));
  return schedule;
}
export async function syncScheduleToWidget() {
  if (Platform.OS !== 'android') return;
  const schedule = await loadWidgetSchedule();
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: info =>
      React.createElement(ScheduleWidget, {schedule, height: info.height}),
  });
}
