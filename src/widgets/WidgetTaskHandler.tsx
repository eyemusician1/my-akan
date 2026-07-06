import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ScheduleWidget } from './ScheduleWidget';
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
        // Pull cached schedule data synced from WatermelonDB
        let subjects = [];
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
        const dateHeader = `${today.getDate()} ${dayNames[today.getDay()]}`;

        console.log(`[Widget] Rendering ${subjects.length} subjects for ${dateHeader}`);
        renderWidget(<ScheduleWidget dateHeader={dateHeader} subjects={subjects} />);
        break;

      case 'WIDGET_DELETED':
        console.log('[Widget] Widget deleted');
        break;

      case 'WIDGET_CLICK':
        console.log('[Widget] Widget clicked');
        break;
    }
  } catch (error) {
    console.error('[Widget] Error in widgetTaskHandler:', error);
    // Render an empty widget on error
    renderWidget(
      <ScheduleWidget dateHeader="Error" subjects={[]} />
    );
  }
}