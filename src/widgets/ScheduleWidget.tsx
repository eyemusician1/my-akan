import React from 'react';
import {FlexWidget, ListWidget, TextWidget} from 'react-native-android-widget';
import {palette} from '../tokens';
import {
  ADD_SCHEDULE_URI,
  SCHEDULE_URI,
  WidgetSchedule,
  widgetAgenda,
  widgetDateLabel,
  widgetTimeLabel,
} from './scheduleData';

interface Props {
  schedule: WidgetSchedule;
  now?: Date;
  height?: number;
  unavailable?: boolean;
}

export function ScheduleWidget({
  schedule,
  now = new Date(),
  height = 180,
  unavailable = false,
}: Props) {
  const agenda = widgetAgenda(schedule, now);
  const listHeight = Math.max(40, height - 64);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: palette.bg,
        borderRadius: 24,
        padding: 10,
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{uri: SCHEDULE_URI}}
          accessibilityLabel={`${widgetDateLabel(now)}. View schedule`}
          style={{flex: 1, height: 44, justifyContent: 'center'}}>
          <TextWidget
            text={widgetDateLabel(now)}
            maxLines={1}
            truncate="END"
            style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: palette.ink,
            }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{uri: ADD_SCHEDULE_URI}}
          accessibilityLabel="Add subject"
          style={{
            width: 44,
            height: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <FlexWidget
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: palette.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <TextWidget
              text="+"
              allowFontScaling={false}
              style={{fontSize: 25, color: palette.bg, textAlign: 'center'}}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
      <ListWidget style={{width: 'match_parent', height: listHeight}}>
        {agenda.flatMap((day, dayIndex) => [
          ...(dayIndex
            ? [
                <TextWidget
                  key={`${day.key}-date`}
                  text={day.label}
                  clickAction="OPEN_URI"
                  clickActionData={{uri: SCHEDULE_URI}}
                  accessibilityLabel={`${day.label}. View schedule`}
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: palette.body,
                    paddingTop: 10,
                    paddingBottom: 6,
                    paddingLeft: 3,
                  }}
                />,
              ]
            : []),
          ...(day.subjects.length
            ? day.subjects.map((subject, index) => (
                <FlexWidget
                  key={`${day.key}-${subject.id}`}
                  clickAction="OPEN_URI"
                  clickActionData={{uri: SCHEDULE_URI}}
                  accessibilityLabel={`${day.label}. ${subject.code}, ${
                    subject.title
                  }. ${widgetTimeLabel(subject)}${
                    subject.room ? `, ${subject.room}` : ''
                  }. View schedule`}
                  style={{
                    width: 'match_parent',
                    paddingBottom: 4,
                  }}>
                  <FlexWidget
                    style={{
                      width: 'match_parent',
                      borderRadius: 12,
                      backgroundColor: index % 2 ? '#eee2cf' : '#ecdada',
                      paddingHorizontal: 9,
                      paddingVertical: 7,
                    }}>
                    <TextWidget
                      text={subject.code || subject.title}
                      maxLines={1}
                      truncate="END"
                      style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: palette.primary,
                      }}
                    />
                    <TextWidget
                      text={`${widgetTimeLabel(subject)}${
                        subject.room ? ` · ${subject.room}` : ''
                      }`}
                      maxLines={1}
                      truncate="END"
                      style={{fontSize: 11, color: palette.body, marginTop: 2}}
                    />
                  </FlexWidget>
                </FlexWidget>
              ))
            : [
                <FlexWidget
                  key={`${day.key}-empty`}
                  clickAction="OPEN_URI"
                  clickActionData={{uri: SCHEDULE_URI}}
                  accessibilityLabel={
                    unavailable
                      ? 'Open Trakn to refresh schedule'
                      : 'No classes today. View schedule'
                  }
                  style={{
                    width: 'match_parent',
                    backgroundColor: palette.surface,
                    borderRadius: 12,
                    padding: 12,
                  }}>
                  <TextWidget
                    text={
                      unavailable ? 'Open Trakn to refresh' : 'No classes today'
                    }
                    style={{fontSize: 13, color: palette.body}}
                  />
                </FlexWidget>,
              ]),
        ])}
      </ListWidget>
    </FlexWidget>
  );
}
