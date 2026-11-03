import {useEffect, useState} from 'react';
import {AppState} from 'react-native';

/** Refresh calendar periods at local midnight and when returning from the background. */
export function useFinanceDate() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer) clearTimeout(timer);
    };
    const refresh = () => {
      clear();
      if (AppState.currentState && AppState.currentState !== 'active') return;
      const now = new Date();
      setToday(now);
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      timer = setTimeout(
        refresh,
        Math.max(0, nextMidnight.getTime() - now.getTime()) + 100,
      );
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
  }, []);
  return today;
}
