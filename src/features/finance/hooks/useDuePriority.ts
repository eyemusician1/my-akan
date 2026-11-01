import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {duePriorityStore} from '../data/duePriorityStore';

export function useDuePriority() {
  const [order, setOrder] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);
  const busy = useRef(false);
  const orderRef = useRef(order);

  useEffect(() => {
    mounted.current = true;
    duePriorityStore
      .load()
      .then(ids => {
        if (mounted.current) {
          orderRef.current = ids;
          setOrder(ids);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted.current)
          Alert.alert(
            'Priorities unavailable',
            'Reopen Payments to load your saved order.',
          );
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const reorder = useCallback(
    async (ids: string[]) => {
      if (!mounted.current || !loaded || busy.current) return;
      const previous = orderRef.current;
      busy.current = true;
      orderRef.current = ids;
      setOrder(ids);
      setSaving(true);
      try {
        await duePriorityStore.save(ids);
      } catch {
        orderRef.current = previous;
        if (mounted.current) {
          setOrder(previous);
          Alert.alert(
            'Order not saved',
            'Your previous priorities have been restored.',
          );
        }
      } finally {
        busy.current = false;
        if (mounted.current) setSaving(false);
      }
    },
    [loaded],
  );

  return {order, loaded, saving, reorder};
}
