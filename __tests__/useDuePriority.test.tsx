import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Alert} from 'react-native';
import renderer from 'react-test-renderer';
import {useDuePriority} from '../src/features/finance/hooks/useDuePriority';
import {duePriorityStore} from '../src/features/finance/data/duePriorityStore';

jest.mock('../src/features/finance/data/duePriorityStore', () => ({
  duePriorityStore: {load: jest.fn(), save: jest.fn()},
}));
let screen: renderer.ReactTestRenderer;
let priority: ReturnType<typeof useDuePriority>;
function Probe() {
  priority = useDuePriority();
  return null;
}

beforeEach(async () => {
  jest.resetAllMocks();
  jest.mocked(duePriorityStore.load).mockResolvedValue(['a', 'b']);
  jest.mocked(duePriorityStore.save).mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderer.act(async () => {
    screen = renderer.create(<Probe />);
  });
});
afterEach(() => {
  renderer.act(() => screen.unmount());
  jest.restoreAllMocks();
});

it('loads the saved order and persists a new priority', async () => {
  expect(priority.loaded).toBe(true);
  expect(priority.order).toEqual(['a', 'b']);
  await renderer.act(async () => {
    await priority.reorder(['b', 'a']);
  });
  expect(duePriorityStore.save).toHaveBeenCalledWith(['b', 'a']);
  expect(priority.order).toEqual(['b', 'a']);
});

it('restores the previous order when storage rejects a drop', async () => {
  jest
    .mocked(duePriorityStore.save)
    .mockRejectedValueOnce(new Error('Storage full'));
  await renderer.act(async () => {
    await priority.reorder(['b', 'a']);
  });
  expect(priority.order).toEqual(['a', 'b']);
  expect(priority.saving).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Order not saved',
    expect.any(String),
  );
});

it('blocks a second reorder while a priority write is in flight', async () => {
  let release!: () => void;
  jest.mocked(duePriorityStore.save).mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      }),
  );
  await renderer.act(async () => {
    const first = priority.reorder(['b', 'a']);
    await priority.reorder(['a', 'b']);
    expect(duePriorityStore.save).toHaveBeenCalledTimes(1);
    release();
    await first;
  });
  expect(priority.order).toEqual(['b', 'a']);
});
