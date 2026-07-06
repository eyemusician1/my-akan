import React from 'react';
import { FlexWidget, TextWidget, ColorProp } from 'react-native-android-widget';

export interface WidgetSubject {
  code: string;
  room: string;
  time: string;
  // Strictly typed as ColorProp so TypeScript accepts hex colors
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
        backgroundColor: '#1E1F22', // M3 Surface Dark
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'column',
      }}
    >
      {/* Top Header Row: Date + Quick Add FAB */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          // FIX: Changed from 'space_between' to 'space-between'
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
            color: '#E2E2E6',
            letterSpacing: -0.3,
          }}
        />

        {/* Circular M3 Accent FAB */}
        <FlexWidget
          clickAction="OPEN_APP_TO_ADD"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#A8C7FA', // M3 Primary Blue Accent
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#062E6F',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Content Area */}
      {subjects.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            backgroundColor: '#2A2C30', // Surface Container Tonal
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
                backgroundColor: '#2A2C30',
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
                marginBottom: index < Math.min(subjects.length, 3) - 1 ? 8 : 0,
                borderLeftWidth: 4,
                // FIX: Explicitly cast fallback to ColorProp to satisfy TypeScript compiler
                borderLeftColor: (subj.color || '#A8C7FA') as ColorProp,
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