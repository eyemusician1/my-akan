import {beforeEach, expect, it, jest} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {duePriorityStore} from '../src/features/finance/data/duePriorityStore';
import {
  getDropIndex,
  moveDue,
  orderDues,
} from '../src/features/finance/domain/duePriority';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
beforeEach(async () => {
  await AsyncStorage.clear();
});

it('moves a lower-priority due to the top without changing the other priorities', () => {
  expect(moveDue(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  expect(moveDue(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveDue(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
});

it('clamps drops at the list edges and waits until the next card midpoint', () => {
  expect(getDropIndex(1, -500, 94, 3)).toBe(0);
  expect(getDropIndex(1, 500, 94, 3)).toBe(2);
  expect(getDropIndex(1, 30, 94, 3)).toBe(1);
  expect(getDropIndex(1, 50, 94, 3)).toBe(2);
});

it('restores saved priorities, ignores deleted IDs and appends new dues', () => {
  const dues = [{id: 'new'}, {id: 'a'}, {id: 'b'}];
  expect(orderDues(dues, ['deleted', 'b', 'a']).map(due => due.id)).toEqual([
    'b',
    'a',
    'new',
  ]);
  expect(dues.map(due => due.id)).toEqual(['new', 'a', 'b']);
});

it('persists the order across visits', async () => {
  await duePriorityStore.save(['c', 'a', 'b']);
  expect(await duePriorityStore.load()).toEqual(['c', 'a', 'b']);
});

it('recovers malformed priority data and removes duplicates', async () => {
  await AsyncStorage.setItem('@academic_due_priority', 'broken');
  expect(await duePriorityStore.load()).toEqual([]);
  await AsyncStorage.setItem(
    '@academic_due_priority',
    '["a",null,"a",42,"b",""]',
  );
  expect(await duePriorityStore.load()).toEqual(['a', 'b']);
});

it('propagates write failures so the previous order can be restored', async () => {
  const write = jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('Storage full'));
  await expect(duePriorityStore.save(['a'])).rejects.toThrow('Storage full');
  write.mockRestore();
});
