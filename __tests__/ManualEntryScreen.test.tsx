import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Keyboard, Text, TextInput, TouchableOpacity} from 'react-native';
import renderer from 'react-test-renderer';
import {ManualEntryScreen} from '../src/screens/ManualEntryScreen';
import {scheduleRepository} from '../src/features/schedule/data';
import {scheduleService} from '../src/features/schedule/services/scheduleService';
import {parseCorText} from '../src/features/scanner/domain/corParser';
import {AppScreenProps} from '../src/navigation/types';
import type Subject from '../src/core/database/models/Subject';
import type Schedule from '../src/core/database/models/Schedule';

jest.setTimeout(30000);
jest.mock('../src/features/schedule/data', () => ({
  scheduleRepository: {
    getLatestSchedule: jest.fn(),
    getTermSummary: jest.fn(),
    findSubject: jest.fn(),
  },
}));
jest.mock('../src/features/schedule/services/scheduleService', () => ({
  scheduleService: {saveSubject: jest.fn()},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');

let screen: renderer.ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(scheduleRepository.getLatestSchedule)
    .mockResolvedValue(undefined);
  jest
    .mocked(scheduleRepository.getTermSummary)
    .mockResolvedValue({declaredUnits: 24, subjectCount: 0, totalUnits: 0});
  jest
    .mocked(scheduleService.saveSubject)
    .mockResolvedValue({subject: {} as Subject, syncIssues: []});
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
});

async function renderForm(
  params?: AppScreenProps<'ManualEntry'>['route']['params'],
) {
  await renderer.act(async () => {
    screen = renderer.create(
      <ManualEntryScreen
        navigation={
          {
            goBack: jest.fn(),
          } as unknown as AppScreenProps<'ManualEntry'>['navigation']
        }
        route={{key: 'entry', name: 'ManualEntry', params}}
      />,
    );
  });
}
function input(label: string) {
  return screen.root
    .findAllByType(TextInput)
    .find(
      node =>
        node.props.placeholder === label ||
        node.props.accessibilityLabel === label,
    )!;
}
function button(label: string | number) {
  return screen.root
    .findAllByType(TouchableOpacity)
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label),
    )!;
}
function fillDetails() {
  input('Subject Code').props.onChangeText('CSC101');
  input('Descriptive Title').props.onChangeText('Computing');
}

it('keeps invalid minutes visible and prevents saving instead of clamping them', async () => {
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Mon class day').props.onPress();
    input('Starts time').props.onChangeText('8:99');
    input('Ends time').props.onChangeText('0930');
  });
  renderer.act(() => input('Starts time').props.onBlur());
  expect(input('Starts time').props.value).toBe('08:99');
  expect(button('Save & Finish').props.disabled).toBe(true);
  expect(scheduleService.saveSubject).not.toHaveBeenCalled();
});

it('adds the colon to four-digit times and saves the canonical format', async () => {
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Mon class day').props.onPress();
    input('Starts time').props.onChangeText('0830');
    input('Ends time').props.onChangeText('1000');
  });
  expect(input('Starts time').props.value).toBe('08:30');
  expect(button('Save & Finish').props.disabled).toBe(false);
  await renderer.act(async () => {
    button('Save & Finish').props.onPress();
  });
  expect(scheduleService.saveSubject).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: expect.objectContaining({
        startTime: '08:30 AM',
        endTime: '10:00 AM',
        days: ['Mon'],
      }),
    }),
  );
});

it('infers PM across noon and honors an explicit AM override', async () => {
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Mon class day').props.onPress();
    input('Starts time').props.onChangeText('1100');
    input('Ends time').props.onChangeText('0100');
  });
  expect(button('Ends period PM')).toBeDefined();
  expect(button('Save & Finish').props.disabled).toBe(false);
  await renderer.act(async () => button('Save & Finish').props.onPress());
  expect(scheduleService.saveSubject).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: expect.objectContaining({
        startTime: '11:00 AM',
        endTime: '01:00 PM',
      }),
    }),
  );
  renderer.act(() => button('Ends period PM').props.onPress());
  expect(button('Save & Finish').props.disabled).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children ===
          'The end time must be later than the start time.',
      ),
  ).toBe(true);
});

it('requires units and actual days/times when the scan has missing fields', async () => {
  await renderForm({
    extractedSubjects: parseCorText('CSC101\nIntroduction to Computing')
      .subjects,
  });
  expect(input('Subject Code').props.value).toBe('CSC101');
  expect(button('Save & Finish Queue').props.disabled).toBe(true);
  renderer.act(() => button('3 units').props.onPress());
  expect(button('Save & Finish Queue').props.disabled).toBe(true);
  expect(button('Set schedule to TBA')).toBeUndefined();
  renderer.act(() => {
    button('Sun class day').props.onPress();
    input('Starts time').props.onChangeText('0800');
    input('Ends time').props.onChangeText('1000');
  });
  expect(button('Save & Finish Queue').props.disabled).toBe(false);
  await renderer.act(async () => button('Save & Finish Queue').props.onPress());
  expect(scheduleService.saveSubject).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: expect.objectContaining({days: ['Sun']}),
    }),
  );
});

it('limits extra digits during incremental typing and rejects incomplete/equal times', async () => {
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Fri class day').props.onPress();
  });
  for (const text of ['0', '08', '080', '08:00', '08:000000']) {
    renderer.act(() => input('Starts time').props.onChangeText(text));
  }
  expect(input('Starts time').props.value).toBe('08:00');
  expect(input('Starts time').props.maxLength).toBe(5);
  renderer.act(() => input('Ends time').props.onChangeText('080'));
  expect(button('Save & Finish').props.disabled).toBe(true);
  renderer.act(() => input('Ends time').props.onChangeText('0800'));
  expect(button('Save & Finish').props.disabled).toBe(true);
  expect(button('Ends period AM')).toBeDefined();
});

it('recalculates the automatic end period when the start period changes', async () => {
  await renderForm();
  renderer.act(() => {
    input('Starts time').props.onChangeText('0800');
    input('Ends time').props.onChangeText('1000');
  });
  expect(button('Ends period AM')).toBeDefined();
  renderer.act(() => button('Starts period AM').props.onPress());
  expect(button('Ends period PM')).toBeDefined();
});

it('preserves explicit scanned periods instead of repairing a reversed range', async () => {
  const [subject] = parseCorText(
    'Subject Code | Title | Units | Days | Time\nCSC101 | Computing | 3 | F | 8am-9am',
  ).subjects;
  await renderForm({extractedSubjects: [subject]});
  renderer.act(() => input('Starts time').props.onChangeText('1000'));
  expect(button('Ends period AM')).toBeDefined();
  expect(button('Save & Finish Queue').props.disabled).toBe(true);
});

it('does not treat a zero declared unit target as a completed schedule', async () => {
  await renderForm();
  renderer.act(() => input('Enrolled units').props.onChangeText('0'));
  expect(button('Save & Finish').props.disabled).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Target Reached!'),
  ).toBe(false);
});

it('dismisses after the final complete, valid clock entry, and not while editing text', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Mon class day').props.onPress();
  });
  dismiss.mockClear();
  renderer.act(() => input('Starts time').props.onChangeText('0800'));
  renderer.act(() => input('Ends time').props.onChangeText('09'));
  expect(dismiss).not.toHaveBeenCalled();
  renderer.act(() => input('Ends time').props.onChangeText('0930'));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(button('Save & Finish').props.disabled).toBe(false);
  dismiss.mockClear();
  renderer.act(() =>
    input('Descriptive Title').props.onChangeText('Computing fundamentals'),
  );
  renderer.act(() => input('Ends time').props.onChangeText('09:45'));
  expect(dismiss).not.toHaveBeenCalled();
});

it('keeps the keyboard open for invalid times or missing subject details', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  await renderForm();
  renderer.act(() => {
    fillDetails();
    button('Fri class day').props.onPress();
  });
  dismiss.mockClear();
  renderer.act(() => input('Starts time').props.onChangeText('1000'));
  renderer.act(() => input('Ends time').props.onChangeText('1000'));
  expect(dismiss).not.toHaveBeenCalled();
  renderer.act(() => input('Ends time').props.onChangeText(''));
  renderer.act(() => input('Descriptive Title').props.onChangeText(''));
  renderer.act(() => input('Ends time').props.onChangeText('1130'));
  expect(dismiss).not.toHaveBeenCalled();
  expect(button('Save & Finish').props.disabled).toBe(true);
});

it('offers direct unit selection and applies the term limit', async () => {
  await renderForm();
  expect(button('3 units').props.accessibilityState.checked).toBe(true);
  renderer.act(() => button('6 units').props.onPress());
  expect(button('6 units').props.accessibilityState.checked).toBe(true);
  await renderer.act(async () => button('Summer').props.onPress());
  renderer.act(() => input('Enrolled units').props.onChangeText('18'));
  expect(input('Enrolled units').props.value).toBe('6');
});

it('does not auto-close while writing a TBA title; Done reveals Save', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  await renderForm();
  renderer.act(() => fillDetails());
  expect(dismiss).not.toHaveBeenCalled();
  expect(input('Descriptive Title').props.returnKeyType).toBe('done');
  renderer.act(() => input('Descriptive Title').props.onSubmitEditing());
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('blocks saves on a failed units load and lets the user retry', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .mocked(scheduleRepository.getTermSummary)
    .mockRejectedValueOnce(new Error('Storage busy'));
  await renderForm();
  renderer.act(() => fillDetails());
  expect(button('Save & Finish').props.disabled).toBe(true);
  await renderer.act(async () => button('Retry loading units').props.onPress());
  expect(button('Retry loading units')).toBeUndefined();
  expect(button('Save & Finish').props.disabled).toBe(false);
});

it('keeps a manually chosen term when a slower recent-term lookup finishes', async () => {
  let finishLookup!: (schedule: Schedule) => void;
  jest.mocked(scheduleRepository.getLatestSchedule).mockReturnValueOnce(
    new Promise(resolve => {
      finishLookup = resolve;
    }),
  );
  await renderForm();
  await renderer.act(async () => button('Summer').props.onPress());
  await renderer.act(async () =>
    finishLookup({academicTerm: '2nd Sem'} as Schedule),
  );
  expect(scheduleRepository.getTermSummary).toHaveBeenLastCalledWith('Summer');
  expect(button('Summer').props.accessibilityState.checked).toBe(true);
});

it('shows saving feedback and blocks repeated submissions while a write is pending', async () => {
  let finishSave!: () => void;
  jest.mocked(scheduleService.saveSubject).mockReturnValueOnce(
    new Promise(resolve => {
      finishSave = () => resolve({subject: {} as Subject, syncIssues: []});
    }),
  );
  await renderForm();
  renderer.act(() => fillDetails());
  const submit = button('Save & Finish').props.onPress;
  renderer.act(() => {
    submit();
    submit();
  });
  expect(scheduleService.saveSubject).toHaveBeenCalledTimes(1);
  expect(button('Saving…').props.accessibilityState.busy).toBe(true);
  await renderer.act(async () => finishSave());
  expect(input('Descriptive Title').props.value).toBe('Computing');
});

it('lets a student start the next semester while keeping the completed one saved', async () => {
  jest
    .mocked(scheduleRepository.getLatestSchedule)
    .mockResolvedValue({academicTerm: '1st Sem'} as Schedule);
  jest
    .mocked(scheduleRepository.getTermSummary)
    .mockImplementation(async term =>
      term === '1st Sem'
        ? {declaredUnits: 3, subjectCount: 1, totalUnits: 3}
        : {declaredUnits: undefined, subjectCount: 0, totalUnits: 0},
    );
  await renderForm();
  expect(button('2nd Sem').props.disabled).toBe(false);
  await renderer.act(async () => button('2nd Sem').props.onPress());
  renderer.act(() => {
    input('Enrolled units').props.onChangeText('6');
    fillDetails();
  });
  expect(button('Save & Finish').props.disabled).toBe(false);
  await renderer.act(async () => button('Save & Finish').props.onPress());
  expect(scheduleService.saveSubject).toHaveBeenCalledWith(
    expect.objectContaining({academicTerm: '2nd Sem', declaredUnits: 6}),
  );
});

it('keeps the chosen semester and redesigned units through the scanned subject queue', async () => {
  jest
    .mocked(scheduleRepository.getTermSummary)
    .mockResolvedValue({
      declaredUnits: undefined,
      subjectCount: 0,
      totalUnits: 0,
    });
  const subjects = parseCorText(
    'Subject Code | Title | Units | Days | Time\nCSC101 | Computing | 3 | F | 8am-9am\nMAT101 | Mathematics | 3 | F | 9am-10am',
  ).subjects;
  expect(subjects).toHaveLength(2);
  await renderForm({extractedSemester: '1st Sem', extractedSubjects: subjects});
  await renderer.act(async () => button('2nd Sem').props.onPress());
  renderer.act(() => input('Enrolled units').props.onChangeText('0'));
  expect(button('Save & Next Subject').props.disabled).toBe(true);
  renderer.act(() => input('Enrolled units').props.onChangeText('6'));
  await renderer.act(async () => button('Save & Next Subject').props.onPress());
  expect(input('Subject Code').props.value).toBe('MAT101');
  expect(button('3 units').props.accessibilityState.checked).toBe(true);
  expect(button('1st Sem').props.disabled).toBe(true);
  expect(button('2nd Sem').props.accessibilityState.checked).toBe(true);
  await renderer.act(async () => button('Save & Finish Queue').props.onPress());
  expect(scheduleService.saveSubject).toHaveBeenCalledTimes(2);
  for (const [saved] of jest.mocked(scheduleService.saveSubject).mock.calls) {
    expect(saved.academicTerm).toBe('2nd Sem');
    expect(saved.declaredUnits).toBe(6);
  }
});

jest.mock('@react-navigation/native', () => ({NavigationContext: require('react').createContext(undefined)}));
