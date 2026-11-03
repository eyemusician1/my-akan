import {expect, it} from '@jest/globals';
import {orientOcrDocument} from '../src/features/scanner/domain/ocrOrientation';
import {parseCorDocument} from '../src/features/scanner/domain/corParser';
import corSideways from './fixtures/corSideways.json';

it('rebuilds the photographed sideways table in reading order', () => {
  const {document, correction} = orientOcrDocument(corSideways, 1321, 2400);
  expect(correction).toBe(270);
  const {subjects} = parseCorDocument(document);
  expect(subjects).toHaveLength(8);
  expect(subjects[0]).toMatchObject({
    code: 'ITD110',
    section: 'EeFf',
    title: 'NoSQL Databases',
  });
  expect(subjects[4]).toMatchObject({
    code: 'ITE192',
    section: '*MACATO',
    title: 'CAPSTONE 2',
  });
  expect(subjects[6]).toMatchObject({
    code: 'ITE193',
    section: 'MN',
    title: 'Special Topics in IT',
    days: ['Fri'],
  });
  expect(subjects[7]).toMatchObject({
    code: 'STTO71',
    section: 'CcUu2',
    title: 'Probability and Statistical Inference for Computing',
  });
  expect(orientOcrDocument(document, 2400, 1321).correction).toBe(0);
});

it('leaves text-only OCR unchanged when no direction evidence is available', () => {
  const document = {text: 'CSC101\nComputing'};
  expect(orientOcrDocument(document, 1000, 1500)).toEqual({
    document,
    correction: 0,
  });
});
