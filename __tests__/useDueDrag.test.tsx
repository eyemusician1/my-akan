import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {Animated} from 'react-native';
import renderer from 'react-test-renderer';
import {useDueDrag} from '../src/features/finance/hooks/useDueDrag';

let screen: renderer.ReactTestRenderer;
let drag: ReturnType<typeof useDueDrag>;
let renders: number;
const onReorder = jest.fn();
const onDragChange = jest.fn();
function Probe({
  ids = ['a', 'b', 'c'],
  disabled = false,
}: {
  ids?: string[];
  disabled?: boolean;
}) {
  renders++;
  drag = useDueDrag({
    ids,
    disabled,
    slotHeight: 94,
    contentHeight: 272,
    listHeight: 272,
    screenHeight: 800,
    onReorder,
    onDragChange,
  });
  // Initialize the same native positions as the card views.
  ids.forEach((id, index) => drag.position(id, index));
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  renders = 0;
  jest.spyOn(Animated, 'timing').mockImplementation((value, config) => ({
    start: callback => {
      if (value instanceof Animated.Value)
        value.setValue(config.toValue as number);
      callback?.({finished: true});
    },
    stop: () => {},
    reset: () => {},
  }));
  renderer.act(() => {
    screen = renderer.create(<Probe />);
  });
});
afterEach(() => {
  renderer.act(() => screen.unmount());
  jest.restoreAllMocks();
});

it('moves within a slot without rerendering the board', () => {
  renderer.act(() => {
    drag.begin(1, 400);
  });
  const before = renders;
  for (let dy = 1; dy <= 20; dy++) {
    renderer.act(() => {
      drag.move(dy, 400 + dy);
    });
  }
  expect(renders).toBe(before);
  expect(drag.dropIndex).toBe(1);
  expect(onReorder).not.toHaveBeenCalled();
});

it('opens a live gap using native animations and saves only the final drop', () => {
  renderer.act(() => {
    drag.begin(2, 400);
  });
  renderer.act(() => {
    drag.move(-190, 210);
  });
  expect(drag.dropIndex).toBe(0);
  expect(Animated.timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      toValue: 94,
      useNativeDriver: true,
      isInteraction: false,
    }),
  );
  expect(onReorder).not.toHaveBeenCalled();
  renderer.act(() => {
    drag.finish(false);
  });
  expect(onReorder).toHaveBeenCalledTimes(1);
  expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b']);
});

it('resets the preview when a drag is cancelled', () => {
  renderer.act(() => {
    drag.begin(2, 400);
  });
  renderer.act(() => {
    drag.move(-190, 210);
  });
  renderer.act(() => {
    drag.finish(true);
  });
  expect(drag.activeId).toBeNull();
  expect(onReorder).not.toHaveBeenCalled();
  expect(onDragChange).toHaveBeenLastCalledWith(false);
});

it('blocks pickups when another payment operation is busy', () => {
  renderer.act(() => {
    screen.update(<Probe disabled />);
  });
  expect(drag.begin(1, 400)).toBe(false);
  expect(onReorder).not.toHaveBeenCalled();
});

it('returns the settled card to its previous slot when saving the order rolls back', () => {
  let completeDrop: ((result: {finished: boolean}) => void) | undefined;
  jest.mocked(Animated.timing).mockImplementation((value, config) => ({
    start: callback => {
      if (config.duration === 150) completeDrop = callback;
      else {
        if (value instanceof Animated.Value)
          value.setValue(config.toValue as number);
        callback?.({finished: true});
      }
    },
    stop: () => {},
    reset: () => {},
  }));
  renderer.act(() => {
    drag.begin(2, 400);
  });
  renderer.act(() => {
    drag.move(-190, 210);
  });
  renderer.act(() => {
    drag.finish(false);
  });
  renderer.act(() => {
    screen.update(<Probe ids={['c', 'a', 'b']} />);
  });
  renderer.act(() => {
    screen.update(<Probe ids={['a', 'b', 'c']} />);
  });
  jest.mocked(Animated.timing).mockClear();
  renderer.act(() => {
    completeDrop?.({finished: true});
  });
  expect(Animated.timing).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({toValue: 188, useNativeDriver: true}),
  );
});
