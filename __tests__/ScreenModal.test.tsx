import React from 'react';
import {afterEach, expect, it, jest} from '@jest/globals';
import {Modal} from 'react-native';
import {NavigationContext} from '@react-navigation/native';
import renderer from 'react-test-renderer';
import {ScreenModal} from '../src/shared/components/ScreenModal';
jest.mock('@react-navigation/native', () => ({
  NavigationContext: require('react').createContext(undefined),
}));
let screen: renderer.ReactTestRenderer;
afterEach(() => {
  renderer.act(() => screen?.unmount());
});
it('hides an open sheet when a notification navigates away, and restores it on return', () => {
  let focused = true;
  const listeners: Record<string, () => void> = {};
  const remove = jest.fn();
  const navigation = {
    isFocused: () => focused,
    addListener: (type: string, callback: () => void) => {
      listeners[type] = callback;
      return remove;
    },
  };
  renderer.act(() => {
    screen = renderer.create(
      <NavigationContext.Provider value={navigation as never}>
        <ScreenModal visible />
      </NavigationContext.Provider>,
    );
  });
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  renderer.act(() => {
    focused = false;
    listeners.blur();
  });
  expect(screen.root.findByType(Modal).props.visible).toBe(false);
  renderer.act(() => {
    focused = true;
    listeners.focus();
  });
  expect(screen.root.findByType(Modal).props.visible).toBe(true);
  renderer.act(() => screen.unmount());
  expect(remove).toHaveBeenCalledTimes(2);
});
