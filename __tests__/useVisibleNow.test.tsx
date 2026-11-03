import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {AppState, AppStateStatus, Text} from 'react-native';
import renderer from 'react-test-renderer';
import {useVisibleNow} from '../src/shared/hooks/useVisibleNow';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(callback, [callback]),
}));
let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});
function Clock() {
  const now = useVisibleNow();
  return <Text>{now.toISOString()}</Text>;
}

it('refreshes at the minute boundary, sleeps in background, and catches up on return', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 10, 2, 9, 0, 10));
  let notify!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      notify = listener;
      return {remove};
    });
  AppState.currentState = 'active';
  renderer.act(() => {
    screen = renderer.create(<Clock />);
  });
  const before = screen.root.findByType(Text).props.children;
  renderer.act(() => jest.advanceTimersByTime(50100));
  expect(screen.root.findByType(Text).props.children).not.toBe(before);
  const visible = screen.root.findByType(Text).props.children;
  renderer.act(() => {
    AppState.currentState = 'background';
    notify('background');
  });
  expect(jest.getTimerCount()).toBe(0);
  renderer.act(() => jest.advanceTimersByTime(600000));
  expect(screen.root.findByType(Text).props.children).toBe(visible);
  renderer.act(() => {
    AppState.currentState = 'active';
    notify('active');
  });
  expect(screen.root.findByType(Text).props.children).not.toBe(visible);
  renderer.act(() => screen.unmount());
  expect(jest.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledTimes(1);
});
