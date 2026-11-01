import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated} from 'react-native';

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  const showToast = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      animation.current?.stop();
      setMessage(text);
      opacity.setValue(0);
      translateY.setValue(15);
      animation.current = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
        }),
      ]);
      animation.current.start();

      timer.current = setTimeout(() => {
        animation.current = Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 15,
            duration: 200,
            useNativeDriver: true,
          }),
        ]);
        animation.current.start(({finished}) => {
          if (finished) setMessage(null);
        });
      }, 2500);
    },
    [opacity, translateY],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      animation.current?.stop();
    },
    [],
  );

  return {message, opacity, translateY, showToast};
}
