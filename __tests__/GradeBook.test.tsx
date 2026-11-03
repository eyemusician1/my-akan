import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {Alert, Pressable, Text} from 'react-native';
import renderer from 'react-test-renderer';
import {GradeBookContent} from '../src/features/grades/components/GradeBook';
import {GradePicker} from '../src/features/grades/components/GradePicker';
import {GradeCalculatorContent} from '../src/features/grades/components/GradeCalculator';
import {GradeBookTerm} from '../src/features/grades/domain/gpa';

jest.mock('../src/core/database', () => ({database: {}}));
jest.mock(
  '@nozbe/with-observables',
  () => () => (component: unknown) => component,
);
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0}),
}));
const terms: GradeBookTerm[] = [
  {
    id: 'first',
    academicTerm: '1st Sem',
    subjects: [
      {
        id: 'one',
        scheduleId: 'first',
        code: 'CSC101',
        title: 'Computing',
        units: 3,
        grade: 1,
      },
      {
        id: 'two',
        scheduleId: 'first',
        code: 'PE1',
        title: 'Physical Education',
        units: 1,
        grade: null,
      },
    ],
  },
];
let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
});
function button(label: string) {
  return screen.root
    .findAllByType(Pressable)
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label),
    )!;
}
function text() {
  return screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
}

it('gates calculation until all grades are entered and saves only a selected grade', async () => {
  const save = jest.fn(async () => {}),
    calculate = jest.fn();
  renderer.act(() => {
    screen = renderer.create(
      <GradeBookContent
        terms={terms}
        onSaveGrade={save}
        onCalculate={calculate}
      />,
    );
  });
  expect(button('Calculate GPA').props.disabled).toBe(true);
  renderer.act(() => button('Grade for PE1: not set').props.onPress());
  await renderer.act(async () => {
    await button('Set grade 3.00').props.onPress();
  });
  expect(save).toHaveBeenCalledWith('two', 3);
  const complete = [
    {
      ...terms[0],
      subjects: terms[0].subjects.map(item => ({
        ...item,
        grade: item.grade ?? 3,
      })),
    },
  ];
  renderer.act(() =>
    screen.update(
      <GradeBookContent
        terms={complete}
        onSaveGrade={save}
        onCalculate={calculate}
      />,
    ),
  );
  expect(button('Calculate GPA').props.disabled).toBe(false);
  renderer.act(() => button('Calculate GPA').props.onPress());
  expect(calculate).toHaveBeenCalledWith('first');
});
it('keeps the picker open and reports a failed grade save', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const save = jest
    .fn(async () => {})
    .mockRejectedValueOnce(new Error('Disk full'));
  renderer.act(() => {
    screen = renderer.create(
      <GradeBookContent
        terms={terms}
        onSaveGrade={save}
        onCalculate={jest.fn()}
      />,
    );
  });
  renderer.act(() => button('Grade for PE1: not set').props.onPress());
  await renderer.act(async () => {
    await button('Set grade 2.00').props.onPress();
  });
  expect(alert).toHaveBeenCalledWith('Grade not saved', 'Disk full');
  expect(button('Set grade 2.00')).toBeDefined();
  await renderer.act(async () => {
    await button('Set grade 2.00').props.onPress();
  });
  expect(save).toHaveBeenCalledTimes(2);
  expect(screen.root.findByType(GradePicker).props.subject).toBeNull();
});
it('ignores queued taps during a save and opens the next subject immediately afterwards', async () => {
  let finish!: () => void;
  const save = jest.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  renderer.act(() => {
    screen = renderer.create(
      <GradeBookContent
        terms={terms}
        onSaveGrade={save}
        onCalculate={jest.fn()}
      />,
    );
  });
  renderer.act(() => button('Grade for PE1: not set').props.onPress());
  let pending!: Promise<void>;
  renderer.act(() => {
    pending = button('Set grade 1.25').props.onPress();
    button('Set grade 2.00').props.onPress();
    button('Close grade picker').props.onPress();
    button('Grade for CSC101: 1.00').props.onPress();
  });
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith('two', 1.25);
  expect(screen.root.findByType(GradePicker).props).toMatchObject({
    saving: true,
    subject: {id: 'two'},
  });
  await renderer.act(async () => {
    finish();
    await pending;
  });
  expect(screen.root.findByType(GradePicker).props).toMatchObject({
    saving: false,
    subject: null,
  });
  for (let i = 0; i < 5; i++) {
    renderer.act(() => button('Grade for CSC101: 1.00').props.onPress());
    expect(screen.root.findByType(GradePicker).props.subject.id).toBe('one');
    renderer.act(() => button('Close grades').props.onPress());
    expect(screen.root.findByType(GradePicker).props.subject).toBeNull();
  }
});
it('shows the unit-weighted semester result and invalidates it after a grade changes', () => {
  const complete = [
    {
      ...terms[0],
      subjects: terms[0].subjects.map(item => ({
        ...item,
        grade: item.grade ?? 3,
      })),
    },
  ];
  renderer.act(() => {
    screen = renderer.create(
      <GradeCalculatorContent
        terms={complete}
        initialScheduleId="first"
        autoCalculate
        onLogGrades={jest.fn()}
      />,
    );
  });
  expect(text()).toContain('Semester GPA');
  expect(text()).toContain('1.50');
  const changed = [
    {
      ...complete[0],
      subjects: complete[0].subjects.map(item => ({...item, grade: 2})),
    },
  ];
  renderer.act(() =>
    screen.update(
      <GradeCalculatorContent terms={changed} onLogGrades={jest.fn()} />,
    ),
  );
  expect(text()).not.toContain('1.50');
  renderer.act(() => button('Calculate GPA').props.onPress());
  expect(text()).toContain('2.00');
});
it('offers CGPA across completed terms and keeps missing grades out of the final average', () => {
  const complete = {
    id: 'past',
    academicTerm: '2nd Sem',
    subjects: [
      {
        ...terms[0].subjects[0],
        id: 'past-course',
        scheduleId: 'past',
        units: 6,
        grade: 2.5,
      },
    ],
  };
  renderer.act(() => {
    screen = renderer.create(
      <GradeCalculatorContent
        terms={[...terms, complete]}
        onLogGrades={jest.fn()}
      />,
    );
  });
  expect(button('Calculate GPA').props.disabled).toBe(true);
  renderer.act(() => button('CGPA').props.onPress());
  expect(button('Calculate CGPA').props.disabled).toBe(false);
  renderer.act(() => button('Calculate CGPA').props.onPress());
  expect(text()).toContain('2.50');
  expect(text()).toContain('excluded');
});

jest.mock('@react-navigation/native', () => ({NavigationContext: require('react').createContext(undefined)}));
