import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ScheduleWidget, WidgetSubject } from './ScheduleWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function widgetTaskHandler({
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps) {
  try {
    switch (widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED':
        let subjects: WidgetSubject[] = [];
        try {
          const cachedData = await AsyncStorage.getItem('@widget_schedule_cache');
          if (cachedData) {
            subjects = JSON.parse(cachedData);
          }
        } catch (parseError) {
          console.warn('Widget cache parse error:', parseError);
          subjects = [];
        }

        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Format matches Google Calendar widget: "30 Tue"
        const dateHeader = `${today.getDate()} ${dayNames[today.getDay()]}`;

        renderWidget(<ScheduleWidget dateHeader={dateHeader} subjects={subjects} />);
        break;

      case 'WIDGET_DELETED':
      case 'WIDGET_CLICK':
        break;
    }
  } catch (error) {
    console.error('Widget task handler execution error:', error);
  }
}