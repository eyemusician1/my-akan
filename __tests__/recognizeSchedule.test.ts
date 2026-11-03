import {beforeEach, expect, it, jest} from '@jest/globals';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import ImageResizer from 'react-native-image-resizer';
import {recognizeWithBestOrientation} from '../src/features/scanner/services/recognizeSchedule';
import corTable from './fixtures/corTable.json';
import corSideways from './fixtures/corSideways.json';

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {recognize: jest.fn()},
}));
jest.mock('react-native-image-resizer', () => ({
  __esModule: true,
  default: {createResizedImage: jest.fn()},
}));

const good = {
  text: 'Certificate of Registration\nCSC101\nA1\nIntroduction to Computing\n3\nMAC101\nMWF 8am-9am',
  blocks: [],
};
const photographedTable = {
  ...corTable,
  blocks: corTable.blocks.map(block => ({
    text: block.lines.map(line => line.text).join('\n'),
    recognizedLanguages: [],
    lines: block.lines.map(line => ({...line, recognizedLanguages: []})),
  })),
};
const sidewaysTable: typeof photographedTable = {
  ...corSideways,
  blocks: corSideways.blocks.map(block => ({
    text: block.lines.map(line => line.text).join('\n'),
    recognizedLanguages: [],
    lines: block.lines.map(line => ({...line, recognizedLanguages: []})),
  })),
};
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(ImageResizer.createResizedImage)
    .mockImplementation(
      async (_uri, width, height, _format, _quality, rotation) => ({
        uri: `image-${rotation ?? 0}.jpg`,
        path: '',
        width,
        height,
        size: 0,
        name: '',
      }),
    );
});

it('keeps a complete preferred orientation without unnecessary passes', async () => {
  jest.mocked(TextRecognition.recognize).mockResolvedValue(good);
  const result = await recognizeWithBestOrientation(
    'original.jpg',
    0,
    1600,
    2400,
  );
  expect(result.angle).toBe(0);
  expect(result.parsed.subjects[0]).toMatchObject({
    room: 'MAC101',
    code: 'CSC101',
  });
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(1);
});

it('does not mistake readable prose for a good orientation and selects structured schedule data', async () => {
  jest.mocked(TextRecognition.recognize).mockImplementation(async uri =>
    uri === 'image-90.jpg'
      ? good
      : {
          text: 'Lots of readable alphabetic prose with no actual class schedule',
          blocks: [],
        },
  );
  const result = await recognizeWithBestOrientation(
    'original.jpg',
    0,
    1600,
    2400,
  );
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(3);
  expect(result.angle).toBe(90);
  expect(result.previewUri).toBe('image-90.jpg');
});

it('retries detail at a readable orientation without rotating for missing units', async () => {
  let reads = 0;
  jest
    .mocked(TextRecognition.recognize)
    .mockImplementation(async () =>
      ++reads === 2
        ? good
        : {
            text: 'Certificate of Registration\nCSC101\nIntroduction to Computing\nMWF 8am-9am',
            blocks: [],
          },
    );
  const result = await recognizeWithBestOrientation('small.jpg', 0, 600, 800);
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(2);
  expect(result.parsed.subjects[0].review.fields).toEqual([]);
});

it('reads a large COR in one bounded pass despite uncertain cells', async () => {
  jest.mocked(TextRecognition.recognize).mockResolvedValue(photographedTable);
  const result = await recognizeWithBestOrientation(
    'photo.jpg',
    270,
    2193,
    3985,
  );
  expect(result.parsed.subjects).toHaveLength(8);
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(1);
  expect(ImageResizer.createResizedImage).toHaveBeenCalledWith(
    'photo.jpg',
    2400,
    1321,
    'JPEG',
    95,
    270,
    undefined,
    false,
    {mode: 'contain', onlyScaleDown: false},
  );
});

it('stops at a readable table after correcting a sideways photo', async () => {
  jest
    .mocked(TextRecognition.recognize)
    .mockResolvedValueOnce({text: '', blocks: []})
    .mockResolvedValue(photographedTable);
  const result = await recognizeWithBestOrientation('photo.jpg', 0, 2193, 3985);
  expect(result.angle).toBe(270);
  expect(result.parsed.subjects[0].title).toBe('NoSQL Databases');
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(2);
});

it('uses ML Kit word directions to read a sideways COR without another OCR pass', async () => {
  jest.mocked(TextRecognition.recognize).mockResolvedValue(sidewaysTable);
  const result = await recognizeWithBestOrientation('photo.jpg', 0, 2193, 3985);
  expect(result.angle).toBe(270);
  expect(result.parsed.subjects).toHaveLength(8);
  expect(result.parsed.subjects.find(s => s.code === 'ITD110')).toMatchObject({
    section: 'EeFf',
    title: 'NoSQL Databases',
  });
  expect(TextRecognition.recognize).toHaveBeenCalledTimes(1);
});

it('reports native recognition failure instead of returning a fake empty result', async () => {
  jest
    .mocked(TextRecognition.recognize)
    .mockRejectedValue(new Error('Native failure'));
  await expect(
    recognizeWithBestOrientation('broken.jpg', 0, 1600, 2400),
  ).rejects.toThrow('Text recognition failed');
});
