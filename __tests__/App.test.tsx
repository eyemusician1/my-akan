/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it, expect, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

// This smoke test covers the app shell. Feature behavior is tested separately
// without loading native camera, SQLite, notification or widget modules.
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));
jest.mock('../src/navigation/AppNavigator', () => ({
  AppNavigator: () => null,
}));

it('renders correctly', () => {
  let app: renderer.ReactTestRenderer;
  renderer.act(() => {
    app = renderer.create(<App />);
  });
  expect(app!.root.findByType(App)).toBeDefined();
  renderer.act(() => app!.unmount());
});
