import React from 'react';
import { FlexWidget, TextWidget, ColorProp } from 'react-native-android-widget';

export interface WidgetSubject {
  code: string;
  room: string;
  time: string;
  color?: ColorProp;
}

export interface ScheduleWidgetProps {
  dateHeader?: string;
  subjects?: WidgetSubject[];
}

export function ScheduleWidget({
  dateHeader = 'Today',
  subjects = [],
}: ScheduleWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#121212', // Trakn Deep Background
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'column',
      }}
    >
      {/* Header Row: Date + Quick Add FAB */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 14,
        }}
      >
        <TextWidget
          text={dateHeader}
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#FFFFFF',
            letterSpacing: -0.3,
          }}
        />

        {/* Trakn Gold FAB */}
        <FlexWidget
          clickAction="OPEN_APP_TO_ADD"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#C5A059', // Trakn Warm Gold
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#121212', // Dark Ink Text
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Content Area */}
      {subjects.length === 0 ? (
        <FlexWidget
          clickAction="OPEN_APP"
          style={{
            flex: 1,
            width: 'match_parent',
            backgroundColor: '#1C1C1E', // Tonal Card Background
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <TextWidget
            text="Nothing planned"
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: '#A0A2A8',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flexDirection: 'column',
            width: 'match_parent',
          }}
        >
          {subjects.slice(0, 3).map((subj, index) => (
            <FlexWidget
              key={index}
              clickAction="OPEN_APP"
              style={{
                width: 'match_parent',
                backgroundColor: '#1C1C1E',
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
                marginBottom: index < Math.min(subjects.length, 3) - 1 ? 8 : 0,
                borderLeftWidth: 4,
                borderLeftColor: (subj.color || '#C5A059') as ColorProp,
              }}
            >
              <TextWidget
                text={subj.code}
                style={{
                  fontSize: 15,
                  fontWeight: 'bold',
                  color: '#FFFBFE',
                }}
              />
              <TextWidget
                text={`${subj.time} • ${subj.room || 'TBA'}`}
                style={{
                  fontSize: 13,
                  color: '#A0A2A8',
                  marginTop: 2,
                }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}