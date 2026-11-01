import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {
  Alert,
  Animated,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import renderer from 'react-test-renderer';
import {PaymentsScreenUI} from '../src/screens/PaymentsScreen';
import {BudgetCard} from '../src/features/finance/components/BudgetCard';
import {DuesBoard} from '../src/features/finance/components/DuesBoard';
import {DuesInfo} from '../src/features/finance/components/DuesInfo';
import {budgetStore} from '../src/features/finance/data/budgetStore';
import {DEFAULT_BUDGET} from '../src/features/finance/domain/types';
import {AppScreenProps} from '../src/navigation/types';
import type Expense from '../src/core/database/models/Expense';
import type Due from '../src/core/database/models/Due';

// React Native lazily transforms the first modal/control imports on Windows.
jest.setTimeout(30000);

jest.mock(
  '@nozbe/with-observables',
  () => () => (Component: unknown) => Component,
);
jest.mock('../src/core/database', () => ({database: {}}));
jest.mock('../src/features/finance/data', () => ({
  financeRepository: {
    addExpense: jest.fn(),
    addDue: jest.fn(),
    toggleDue: jest.fn(),
    deleteExpense: jest.fn(),
    deleteDue: jest.fn(),
  },
}));
jest.mock('../src/features/finance/data/budgetStore', () => ({
  budgetStore: {load: jest.fn(), save: jest.fn()},
}));
jest.mock('../src/features/finance/data/duePriorityStore', () => ({
  duePriorityStore: {
    load: jest.fn(async () => []),
    save: jest.fn(async () => {}),
  },
}));
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

let screen: renderer.ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 2, 12));
  jest.mocked(budgetStore.load).mockResolvedValue(DEFAULT_BUDGET);
  jest.mocked(budgetStore.save).mockResolvedValue(undefined);
  jest.spyOn(Animated, 'parallel').mockImplementation(() => ({
    start: callback => callback?.({finished: true}),
    stop: () => {},
    reset: () => {},
  }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderScreen(expenses: Expense[] = [], dues: Due[] = []) {
  await renderer.act(async () => {
    screen = renderer.create(
      <PaymentsScreenUI
        expenses={expenses}
        dues={dues}
        navigation={
          {
            goBack: jest.fn(),
          } as unknown as AppScreenProps<'Finance'>['navigation']
        }
      />,
    );
  });
}

function button(label: string) {
  return screen.root
    .findAllByType(TouchableOpacity)
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label),
    )!;
}

it('makes the hero card open budget settings and removes the header settings button', async () => {
  await renderScreen();
  expect(screen.root.findAll(node => node.props.name === 'tune')).toHaveLength(
    0,
  );
  renderer.act(() =>
    screen.root
      .findByType(BudgetCard)
      .findByType(TouchableOpacity)
      .props.onPress(),
  );
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  expect(button('Daily budget period')).toBeDefined();
  expect(button('Weekly budget period').props.accessibilityState.checked).toBe(
    true,
  );
  expect(button('Monthly budget period')).toBeDefined();
});

it('shows one main balance without the repeated remaining-budget summary', async () => {
  jest.setSystemTime(new Date(2026, 10, 1, 12));
  jest
    .mocked(budgetStore.load)
    .mockResolvedValue({...DEFAULT_BUDGET, amount: 15000});
  await renderScreen();
  const texts = screen.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(texts.filter(text => text === '₱15,000.00')).toHaveLength(1);
  expect(texts).not.toContain('Budget remaining');
  expect(texts).not.toContain('Before fee reserves');
  expect(screen.root.findByType(DuesBoard)).toBeDefined();
});

it('opens academic dues help in the styled sheet and dismisses it with Got it', async () => {
  await renderScreen();
  renderer.act(() => button('About academic dues').props.onPress());
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  expect(screen.root.findByType(DuesInfo)).toBeDefined();
  expect(Alert.alert).not.toHaveBeenCalled();
  await renderer.act(async () => {
    button('Got it').props.onPress();
  });
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
});

it('saves the selected period and amount, then updates the card', async () => {
  await renderScreen();
  renderer.act(() => screen.root.findByType(BudgetCard).props.onPress());
  renderer.act(() => {
    button('Monthly budget period').props.onPress();
    screen.root.findByType(TextInput).props.onChangeText('6000');
  });
  await renderer.act(async () => {
    await button('Save Budget').props.onPress();
  });
  expect(budgetStore.save).toHaveBeenCalledWith({
    ...DEFAULT_BUDGET,
    amount: 6000,
    period: 'monthly',
  });
  expect(screen.root.findByType(BudgetCard).props.settings.period).toBe(
    'monthly',
  );
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
});

it('persists an optional fee reserve and reflects it in the daily allowance', async () => {
  await renderScreen(
    [],
    [{id: 'fee', title: 'Lab fee', amount: 200, isPaid: false} as Due],
  );
  renderer.act(() => screen.root.findByType(BudgetCard).props.onPress());
  renderer.act(() => screen.root.findByType(Switch).props.onValueChange(true));
  await renderer.act(async () => {
    await button('Save Budget').props.onPress();
  });
  expect(budgetStore.save).toHaveBeenCalledWith({
    ...DEFAULT_BUDGET,
    reserveDues: true,
  });
  expect(screen.root.findByType(BudgetCard).props.analysis.reservedDues).toBe(
    200,
  );
  expect(screen.root.findByType(BudgetCard).props.analysis.safeToSpend).toBe(
    185.71,
  );
});

it('keeps the existing budget and form open when saving fails', async () => {
  jest.mocked(budgetStore.save).mockRejectedValueOnce(new Error('Disk full'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await renderScreen();
  renderer.act(() => screen.root.findByType(BudgetCard).props.onPress());
  renderer.act(() =>
    screen.root.findByType(TextInput).props.onChangeText('900'),
  );
  await renderer.act(async () => {
    await button('Save Budget').props.onPress();
  });
  expect(Alert.alert).toHaveBeenCalledWith('Update failed', expect.any(String));
  expect(screen.root.findByType(BudgetCard).props.settings.amount).toBe(1500);
  expect(screen.root.findByType(TextInput).props.value).toBe('900');
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  warn.mockRestore();
});

it('keeps older spending accessible without adding it to the current budget total', async () => {
  await renderScreen([
    {
      id: 'new',
      title: 'Lunch',
      amount: 100,
      category: 'food',
      icon: 'lunch-dining',
      createdAt: new Date(2026, 10, 2, 11),
    } as Expense,
    {
      id: 'old',
      title: 'Older trip',
      amount: 500,
      category: 'transport',
      icon: 'directions-transit',
      createdAt: new Date(2026, 9, 26),
    } as Expense,
  ]);
  expect(screen.root.findByType(BudgetCard).props.analysis.totalSpent).toBe(
    100,
  );
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Older trip'),
  ).toBe(false);
  renderer.act(() => button('View all').props.onPress());
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Older trip'),
  ).toBe(true);
  expect(screen.root.findByType(BudgetCard).props.analysis.totalSpent).toBe(
    100,
  );
});
