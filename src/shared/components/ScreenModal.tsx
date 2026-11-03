import React, {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import {Modal, ModalProps} from 'react-native';
import {
  NavigationContext,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';

const StandaloneContext = createContext<
  NavigationProp<ParamListBase> | undefined
>(undefined);

/** Hide a sheet when a notification opens another screen, retaining its draft state. */
export function ScreenModal(props: ModalProps) {
  const navigation = useContext(NavigationContext ?? StandaloneContext);
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!navigation) return () => {};
      const focus = navigation.addListener('focus', notify);
      const blur = navigation.addListener('blur', notify);
      return () => {
        focus();
        blur();
      };
    },
    [navigation],
  );
  const snapshot = useCallback(
    () => navigation?.isFocused() ?? true,
    [navigation],
  );
  const focused = useSyncExternalStore(subscribe, snapshot, snapshot);
  return <Modal {...props} visible={(props.visible ?? true) && focused} />;
}
