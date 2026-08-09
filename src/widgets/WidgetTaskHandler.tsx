import React from 'react';
import { Linking } from 'react-native';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ScheduleWidget, WidgetSubject } from './ScheduleWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function widgetTaskHandler({
  widgetAction,
  clickAction,
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
        }

        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dateHeader = `${today.getDate()} ${dayNames[today.getDay()]}`;

        renderWidget(<ScheduleWidget dateHeader={dateHeader} subjects={subjects} />);
        break;

      case 'WIDGET_CLICK':
        // Wake up the main application UI when the widget is tapped
        if (clickAction === 'OPEN_APP' || clickAction === 'OPEN_APP_TO_ADD') {
          Linking.openURL('trakn://home').catch(err =>
            console.error('[Widget] Failed to open app:', err)
          );
        }
        break;
    }
  } catch (error) {
    console.error('[Widget] Error in widgetTaskHandler:', error);
  }
}