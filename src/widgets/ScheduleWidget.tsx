import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';

interface WidgetSubject {
  code: string;
  room: string;
  time: string;
  color: string;
}

interface ScheduleWidgetProps {
  dateHeader: string;
  subjects: WidgetSubject[];
}

export function ScheduleWidget({ dateHeader = 'Today', subjects = [] }: ScheduleWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1E1F22',
        borderRadius: 28,
        padding: 20,
        flexDirection: 'column',
        justifyContent: 'flex_start',
      }}
    >
      {/* Top Header Row (Date + FAB) - Google Inspired */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space_between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 20,
        }}
      >
        {/* Date Display */}
        <TextWidget
          text={dateHeader}
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: '#FFFBFE',
            letterSpacing: -0.5,
          }}
        />

        {/* Floating Action Button - Light Blue (+) */}
        <FlexWidget
          clickAction="OPEN_APP_TO_ADD"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#A8C7FA',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 4,
          }}
        >
          <TextWidget
            text="+"
            style={{
              fontSize: 28,
              fontWeight: '400',
              color: '#1F2937',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Main Content Area */}
      {subjects.length === 0 ? (
        /* Empty State - Google Inspired */
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            backgroundColor: '#2C2F36',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
        >
          <TextWidget
            text="Nothing"
            style={{
              fontSize: 28,
              fontWeight: '500',
              color: '#FFFBFE',
              textAlign: 'center',
              lineHeight: 36,
            }}
          />
          <TextWidget
            text="planned"
            style={{
              fontSize: 28,
              fontWeight: '500',
              color: '#FFFBFE',
              textAlign: 'center',
            }}
          />
        </FlexWidget>
      ) : (
        /* Events List */
        <FlexWidget
          style={{
            flexDirection: 'column',
            width: 'match_parent',
            flex: 1,
          }}
        >
          {subjects.slice(0, 3).map((subj, index) => (
            <FlexWidget
              key={index}
              clickAction="OPEN_APP"
              style={{
                width: 'match_parent',
                backgroundColor: '#2C2F36',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: index < subjects.slice(0, 3).length - 1 ? 10 : 0,
                borderLeftWidth: 5,
                borderLeftColor: subj.color || '#A8C7FA',
              }}
            >
              <TextWidget
                text={subj.code}
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFBFE',
                  marginBottom: 4,
                }}
              />
              <TextWidget
                text={`${subj.time}${subj.room ? ' • ' + subj.room : ''}`}
                style={{
                  fontSize: 13,
                  color: '#9CA3AF',
                }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}