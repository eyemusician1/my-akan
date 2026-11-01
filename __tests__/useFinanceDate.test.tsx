import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {AppState, AppStateStatus} from 'react-native';
import renderer from 'react-test-renderer';
import {useFinanceDate} from '../src/features/finance/hooks/useFinanceDate';

let screen: renderer.ReactTestRenderer;
let value: Date;
let onStateChange: (state: AppStateStatus) => void;
const remove = jest.fn();

function Probe() {
  value = useFinanceDate();
  return null;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 1, 23, 59, 59, 900));
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
      onStateChange = listener;
      return {remove};
    });
  renderer.act(() => {
    screen = renderer.create(<Probe />);
  });
});
afterEach(() => {
  renderer.act(() => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('refreshes the date at midnight while the screen stays open', () => {
  expect(value.getDate()).toBe(1);
  renderer.act(() => {
    jest.advanceTimersByTime(250);
  });
  expect(value.getDate()).toBe(2);
});

it('refreshes immediately when resuming the app on another day', () => {
  jest.setSystemTime(new Date(2026, 11, 1, 9));
  renderer.act(() => onStateChange('active'));
  expect(value.getMonth()).toBe(11);
  expect(value.getDate()).toBe(1);
});
