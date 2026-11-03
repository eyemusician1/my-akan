import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Alert, Keyboard, Text, TextInput, TouchableOpacity} from 'react-native';
import renderer from 'react-test-renderer';
import ImagePicker from 'react-native-image-crop-picker';
import {ScannerScreen} from '../src/screens/ScannerScreen';
import {scheduleRepository} from '../src/features/schedule/data';
import {recognizeWithBestOrientation} from '../src/features/scanner/services/recognizeSchedule';
import {parseCorText} from '../src/features/scanner/domain/corParser';
import {AppScreenProps} from '../src/navigation/types';
import {ManualEntryScreen} from '../src/screens/ManualEntryScreen';
import {UnitSelector} from '../src/features/schedule/components/UnitSelector';
import {scheduleService} from '../src/features/schedule/services/scheduleService';
import type Subject from '../src/core/database/models/Subject';

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
jest.mock('../src/features/scanner/services/recognizeSchedule', () => ({
  recognizeWithBestOrientation: jest.fn(),
  rotateImageFile: jest.fn(),
}));
jest.mock('react-native-image-crop-picker', () => ({
  __esModule: true,
  default: {
    openCamera: jest.fn(async () => ({
      path: 'camera.jpg',
      width: 1200,
      height: 1600,
    })),
    openPicker: jest.fn(async () => ({
      path: 'gallery.jpg',
      width: 1200,
      height: 1600,
    })),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');

let screen: renderer.ReactTestRenderer;
const replace = jest.fn();
const goBack = jest.fn();
const text =
  'Certificate of Registration\nCSC101\nIntroduction to Computing\n3\n301\nMWF 8am-9am';
const result = {
  text,
  angle: 0 as const,
  parsed: parseCorText(text),
  previewUri: 'recognized.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(scheduleRepository.getLatestSchedule)
    .mockResolvedValue(undefined);
  jest.mocked(recognizeWithBestOrientation).mockResolvedValue(result);
  jest
    .mocked(scheduleRepository.getTermSummary)
    .mockResolvedValue({declaredUnits: 24, subjectCount: 0, totalUnits: 0});
  jest
    .mocked(scheduleService.saveSubject)
    .mockResolvedValue({subject: {} as Subject, syncIssues: []});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
});
async function renderScanner(mode: 'camera' | 'gallery') {
  await renderer.act(async () => {
    screen = renderer.create(
      <ScannerScreen
        route={{key: 'scan', name: 'Scanner', params: {mode}}}
        navigation={
          {
            replace,
            goBack,
          } as unknown as AppScreenProps<'Scanner'>['navigation']
        }
      />,
    );
  });
}
function extractButton() {
  return screen.root
    .findAllByType(TouchableOpacity)
    .find(node =>
      node
        .findAllByType(Text)
        .some(label => label.props.children === 'Extract Schedule'),
    )!;
}

it.each(['camera', 'gallery'] as const)(
  'passes %s images through the same recognition and review flow',
  async mode => {
    await renderScanner(mode);
    await renderer.act(async () => {
      await extractButton().props.onPress();
    });
    expect(
      mode === 'camera' ? ImagePicker.openCamera : ImagePicker.openPicker,
    ).toHaveBeenCalled();
    expect(recognizeWithBestOrientation).toHaveBeenCalledWith(
      `${mode}.jpg`,
      0,
      1200,
      1600,
    );
    expect(replace).toHaveBeenCalledWith(
      'ManualEntry',
      expect.objectContaining({
        extractedSubjects: expect.arrayContaining([
          expect.objectContaining({
            code: 'CSC101',
            title: 'Introduction to Computing',
            startTime: '08:00 AM',
          }),
        ]),
      }),
    );
  },
);

it.each(['camera', 'gallery'] as const)(
  'keeps the redesigned units, validation and keyboard completion in %s review',
  async mode => {
    await renderScanner(mode);
    await renderer.act(async () => extractButton().props.onPress());
    const params = replace.mock
      .calls[0][1] as AppScreenProps<'ManualEntry'>['route']['params'];
    await renderer.act(async () => {
      screen.update(
        <ManualEntryScreen
          route={{key: 'review', name: 'ManualEntry', params}}
          navigation={
            {goBack} as unknown as AppScreenProps<'ManualEntry'>['navigation']
          }
        />,
      );
    });
    expect(screen.root.findByType(UnitSelector).props.value).toBe(3);
    const inputs = () => screen.root.findAllByType(TextInput);
    expect(
      inputs().find(node => node.props.accessibilityLabel === 'Enrolled units'),
    ).toBeDefined();
    renderer.act(() => screen.root.findByType(UnitSelector).props.onChange(6));
    const end = () =>
      inputs().find(node => node.props.accessibilityLabel === 'Ends time')!;
    const save = () =>
      screen.root
        .findAllByType(TouchableOpacity)
        .find(node =>
          node
            .findAllByType(Text)
            .some(label => label.props.children === 'Save & Finish Queue'),
        )!;
    renderer.act(() => end().props.onChangeText('09:99'));
    expect(save().props.disabled).toBe(true);
    renderer.act(() => end().props.onChangeText(''));
    const dismiss = jest
      .spyOn(Keyboard, 'dismiss')
      .mockImplementation(() => {});
    renderer.act(() => end().props.onChangeText('0930'));
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(save().props.disabled).toBe(false);
    await renderer.act(async () => save().props.onPress());
    expect(scheduleService.saveSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.objectContaining({units: 6, endTime: '09:30 AM'}),
      }),
    );
  },
);

it('opens image selection even when the previous semester is full', async () => {
  jest
    .mocked(scheduleRepository.getLatestSchedule)
    .mockResolvedValue({
      academicTerm: '1st Sem',
      totalSubjects: 3,
      subjects: {fetch: async () => [{units: 3}]},
    } as never);
  await renderScanner('gallery');
  expect(ImagePicker.openPicker).toHaveBeenCalled();
  expect(extractButton()).toBeDefined();
});

it('treats picker cancellation as cancellation without an error dialog', async () => {
  jest
    .mocked(ImagePicker.openPicker)
    .mockRejectedValueOnce({code: 'E_PICKER_CANCELLED'});
  await renderScanner('gallery');
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('does not navigate after leaving while recognition is still running', async () => {
  let resolve!: (value: typeof result) => void;
  jest.mocked(recognizeWithBestOrientation).mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      }),
  );
  await renderScanner('camera');
  let processing!: Promise<void>;
  renderer.act(() => {
    processing = extractButton().props.onPress();
  });
  renderer.act(() => screen.unmount());
  await renderer.act(async () => {
    resolve(result);
    await processing;
  });
  expect(replace).not.toHaveBeenCalled();
});

jest.mock('@react-navigation/native', () => ({NavigationContext: require('react').createContext(undefined)}));
