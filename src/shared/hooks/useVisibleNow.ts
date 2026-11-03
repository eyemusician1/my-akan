import {useCallback, useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

/** One minute-aligned clock; stop work when the screen or app is hidden. */
export function useVisibleNow() {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const clear = () => {
        if (timer) clearTimeout(timer);
      };
      const refresh = () => {
        clear();
        if (AppState.currentState && AppState.currentState !== 'active') return;
        setNow(new Date());
        timer = setTimeout(refresh, 60000 - (Date.now() % 60000) + 50);
      };
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
        else clear();
      });
      refresh();
      return () => {
        clear();
        subscription.remove();
      };
    }, []),
  );
  return now;
}
