import {useEffect, useState} from 'react';
import {AppState} from 'react-native';

/** Refresh calendar periods at local midnight and when returning from the background. */
export function useFinanceDate() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setToday(new Date());
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const nextMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );
    const timer = setTimeout(
      () => setToday(new Date()),
      Math.max(0, nextMidnight.getTime() - Date.now()) + 100,
    );
    return () => clearTimeout(timer);
  }, [today]);
  return today;
}
