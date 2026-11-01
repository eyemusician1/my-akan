import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderCallbacks,
  PanResponderGestureState,
  Text,
  TouchableOpacity,
} from 'react-native';
import renderer from 'react-test-renderer';
import {
  DuesBoard,
  DUE_SLOT_HEIGHT,
} from '../src/features/finance/components/DuesBoard';
import type Due from '../src/core/database/models/Due';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');

let screen: renderer.ReactTestRenderer;
let responders: PanResponderCallbacks[];
const onReorder = jest.fn();
const onDragChange = jest.fn();
const dues = [
  {id: 'a', title: 'Lab fee', amount: 100, isPaid: false},
  {id: 'b', title: 'Field trip', amount: 200, isPaid: false},
  {id: 'c', title: 'Manual', amount: 300, isPaid: false},
  {id: 'paid', title: 'Old fee', amount: 50, isPaid: true},
] as Due[];
const event = {nativeEvent: {pageY: 500}} as GestureResponderEvent;
const gesture = {dy: 0, moveY: 500} as PanResponderGestureState;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  responders = [];
  jest.spyOn(PanResponder, 'create').mockImplementation(config => {
    responders.push(config);
    return {panHandlers: {}};
  });
  renderer.act(() => {
    screen = renderer.create(
      <DuesBoard
        dues={dues}
        disabled={false}
        reorderDisabled={false}
        onReorder={onReorder}
        onDragChange={onDragChange}
        onInfo={() => {}}
        onAdd={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    );
  });
});
afterEach(() => {
  renderer.act(() => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('picks up immediately and drops a fee at the top of the payment queue', () => {
  renderer.act(() => {
    responders[2].onPanResponderGrant?.(event, gesture);
  });
  expect(onDragChange).toHaveBeenLastCalledWith(true);
  renderer.act(() =>
    responders[2].onPanResponderMove?.(event, {
      ...gesture,
      dy: -2 * DUE_SLOT_HEIGHT,
      moveY: 300,
    }),
  );
  renderer.act(() =>
    responders[2].onPanResponderRelease?.(event, {
      ...gesture,
      dy: -2 * DUE_SLOT_HEIGHT,
      moveY: 300,
    }),
  );
  expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
  expect(onDragChange).toHaveBeenLastCalledWith(false);
});

it('leaves priorities unchanged after a tap or cancelled drag', () => {
  renderer.act(() => {
    responders[1].onPanResponderGrant?.(event, gesture);
    jest.advanceTimersByTime(50);
    responders[1].onPanResponderRelease?.(event, gesture);
  });
  expect(onReorder).not.toHaveBeenCalled();
  renderer.act(() => {
    responders[1].onPanResponderGrant?.(event, gesture);
    jest.advanceTimersByTime(230);
  });
  renderer.act(() =>
    responders[1].onPanResponderMove?.(event, {
      ...gesture,
      dy: -DUE_SLOT_HEIGHT,
    }),
  );
  renderer.act(() => responders[1].onPanResponderTerminate?.(event, gesture));
  expect(onReorder).not.toHaveBeenCalled();
});

it('uses the final touch position for a quick drag and release', () => {
  renderer.act(() => responders[1].onPanResponderGrant?.(event, gesture));
  renderer.act(() =>
    responders[1].onPanResponderRelease?.(event, {
      ...gesture,
      dy: -DUE_SLOT_HEIGHT,
      moveY: 400,
    }),
  );
  expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
});

it('allows a screen-reader action to move a fee up', () => {
  const handle = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'adjustable' &&
      node.props.accessibilityLabel === 'Priority 2, Field trip',
  )[0];
  renderer.act(() =>
    handle.props.onAccessibilityAction({
      nativeEvent: {actionName: 'increment'},
    }),
  );
  expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
});

it('cancels a drag if a fee is removed or paid while it is being moved', () => {
  renderer.act(() => {
    responders[2].onPanResponderGrant?.(event, gesture);
    jest.advanceTimersByTime(230);
  });
  renderer.act(() => {
    screen.update(
      <DuesBoard
        dues={dues.filter(due => due.id !== 'b')}
        disabled={false}
        reorderDisabled={false}
        onReorder={onReorder}
        onDragChange={onDragChange}
        onInfo={() => {}}
        onAdd={() => {}}
        onToggle={() => {}}
        onDelete={() => {}}
      />,
    );
  });
  expect(onDragChange).toHaveBeenLastCalledWith(false);
  expect(onReorder).not.toHaveBeenCalled();
});

it('keeps paid fees folded away from the priority queue', () => {
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Old fee'),
  ).toBe(false);
  const toggle = screen.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Paid dues')!;
  renderer.act(() => toggle.props.onPress());
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Old fee'),
  ).toBe(true);
});
