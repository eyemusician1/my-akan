import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {WidgetTaskHandlerProps} from 'react-native-android-widget';
import {ScheduleWidget} from './ScheduleWidget';
import {loadWidgetSchedule} from '../core/widgets/widgetSync';
import {
  parseWidgetSchedule,
  WIDGET_CACHE_KEY,
  WidgetSchedule,
} from './scheduleData';

export async function widgetTaskHandler({
  widgetAction,
  widgetInfo,
  renderWidget,
}: WidgetTaskHandlerProps) {
  if (
    !['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'].includes(widgetAction)
  )
    return;
  let schedule: WidgetSchedule | null = null;
  try {
    schedule = parseWidgetSchedule(
      await AsyncStorage.getItem(WIDGET_CACHE_KEY),
    );
    // First install / old daily caches recover from the existing saved schedule.
    if (!schedule) schedule = await loadWidgetSchedule();
  } catch (error) {
    console.warn('Widget schedule unavailable', error);
  }
  renderWidget(
    <ScheduleWidget
      schedule={schedule ?? {version: 2, subjects: []}}
      height={widgetInfo.height}
      unavailable={!schedule}
    />,
  );
}
