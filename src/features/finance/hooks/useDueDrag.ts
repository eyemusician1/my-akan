import {useEffect, useRef, useState} from 'react';
import {Animated, Easing, ScrollView, View} from 'react-native';
import {getDropIndex, moveDue} from '../domain/duePriority';

interface Options {
  ids: string[];
  disabled: boolean;
  slotHeight: number;
  contentHeight: number;
  listHeight: number;
  screenHeight: number;
  onReorder: (ids: string[]) => void;
  onDragChange: (active: boolean) => void;
}

interface Drag {
  id: string;
  from: number;
  ids: string[];
  dy: number;
  startOffset: number;
  pageY: number;
  target: number;
}

/** Keep per-frame movement in Animated values; React only updates at slot crossings. */
export function useDueDrag(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const idsKey = JSON.stringify(options.ids);
  const positions = useRef(new Map<string, Animated.Value>());
  const destinations = useRef(new Map<string, number>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState(0);
  const settling = useRef<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const scroller = useRef<ScrollView>(null);
  const viewport = useRef<View>(null);
  const bounds = useRef({top: 0, height: 0});
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const lastFrameTime = useRef<number | null>(null);
  const mounted = useRef(true);

  function position(id: string, index: number) {
    let value = positions.current.get(id);
    if (!value) {
      value = new Animated.Value(index * latest.current.slotHeight);
      positions.current.set(id, value);
      destinations.current.set(id, index * latest.current.slotHeight);
    }
    return value;
  }

  function slide(value: Animated.Value, toValue: number, duration = 130) {
    value.stopAnimation();
    return Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
  }

  function moveOtherCards(ids: string[], skip?: string) {
    ids.forEach((id, index) => {
      const value = position(id, index);
      const target = index * latest.current.slotHeight;
      if (id !== skip && destinations.current.get(id) !== target) {
        destinations.current.set(id, target);
        slide(value, target).start();
      }
    });
  }

  function stopScroll() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    lastFrameTime.current = null;
  }

  function distance() {
    const current = drag.current;
    return current ? current.dy + offset.current - current.startOffset : 0;
  }

  function updatePosition() {
    const current = drag.current;
    if (!current) return;
    const {slotHeight} = latest.current;
    const y = Math.max(
      0,
      Math.min(
        (current.ids.length - 1) * slotHeight,
        current.from * slotHeight + distance(),
      ),
    );
    position(current.id, current.from).setValue(y);
    const target = getDropIndex(
      current.from,
      distance(),
      slotHeight,
      current.ids.length,
    );
    if (target !== current.target) {
      current.target = target;
      setDropIndex(target);
      moveOtherCards(moveDue(current.ids, current.from, target), current.id);
    }
  }

  function edgeVelocity() {
    const current = drag.current;
    if (!current || !bounds.current.height) return 0;
    const bottom = Math.min(
      bounds.current.top + bounds.current.height,
      latest.current.screenHeight - 24,
    );
    const edge = 42;
    if (current.pageY < bounds.current.top + edge)
      return (
        -Math.min(1, (bounds.current.top + edge - current.pageY) / edge) * 650
      );
    if (current.pageY > bottom - edge)
      return Math.min(1, (current.pageY - bottom + edge) / edge) * 650;
    return 0;
  }

  function scrollFrame(timestamp: number) {
    frame.current = null;
    if (!drag.current) return;
    const velocity = edgeVelocity();
    const elapsed = Math.min(
      32,
      lastFrameTime.current === null ? 16 : timestamp - lastFrameTime.current,
    );
    lastFrameTime.current = timestamp;
    const maxOffset = Math.max(
      0,
      latest.current.contentHeight - latest.current.listHeight,
    );
    const next = Math.max(
      0,
      Math.min(maxOffset, offset.current + (velocity * elapsed) / 1000),
    );
    if (!velocity || next === offset.current) {
      lastFrameTime.current = null;
      return;
    }
    offset.current = next;
    scroller.current?.scrollTo({y: next, animated: false});
    updatePosition();
    frame.current = requestAnimationFrame(scrollFrame);
  }

  function scheduleScroll() {
    if (frame.current === null && edgeVelocity())
      frame.current = requestAnimationFrame(scrollFrame);
  }

  function finish(cancelled: boolean) {
    const current = drag.current;
    stopScroll();
    if (!current) return;
    updatePosition();
    drag.current = null;
    setActiveId(null);
    latest.current.onDragChange(false);
    const valid =
      !cancelled &&
      JSON.stringify(current.ids) === JSON.stringify(latest.current.ids);
    const target = valid
      ? current.target
      : latest.current.ids.indexOf(current.id);
    const next = valid
      ? moveDue(current.ids, current.from, current.target)
      : latest.current.ids;
    moveOtherCards(next, current.id);
    scale.stopAnimation();
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
    if (target >= 0) {
      settling.current = current.id;
      setSettlingId(current.id);
      destinations.current.set(current.id, target * latest.current.slotHeight);
      slide(
        position(current.id, current.from),
        target * latest.current.slotHeight,
        150,
      ).start(() => {
        if (mounted.current && settling.current === current.id) {
          settling.current = null;
          setSettlingId(null);
        }
      });
    }
    if (valid && current.target !== current.from)
      latest.current.onReorder(next);
  }

  useEffect(() => {
    if (
      drag.current &&
      (JSON.stringify(drag.current.ids) !== idsKey || options.disabled)
    )
      finish(true);
    if (!drag.current)
      moveOtherCards(options.ids, settling.current ?? undefined);
    const ids = new Set(options.ids);
    for (const [id, value] of positions.current) {
      if (!ids.has(id)) {
        value.stopAnimation();
        positions.current.delete(id);
        destinations.current.delete(id);
      }
    }
    // Native values persist across renders; record changes cancel an active gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, options.disabled, settlingId]);

  useEffect(() => {
    mounted.current = true;
    const values = positions.current;
    return () => {
      mounted.current = false;
      stopScroll();
      scale.stopAnimation();
      values.forEach(value => value.stopAnimation());
      latest.current.onDragChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function begin(index: number, pageY: number) {
    const current = latest.current;
    if (
      current.disabled ||
      drag.current ||
      current.ids.length < 2 ||
      !current.ids[index]
    )
      return false;
    // A new pickup can interrupt the previous settling animation.
    settling.current = null;
    setSettlingId(null);
    const id = current.ids[index];
    position(id, index).stopAnimation();
    position(id, index).setValue(index * current.slotHeight);
    destinations.current.delete(id);
    drag.current = {
      id,
      from: index,
      ids: [...current.ids],
      dy: 0,
      startOffset: offset.current,
      pageY,
      target: index,
    };
    setActiveId(id);
    setDropIndex(index);
    scale.setValue(1);
    Animated.timing(scale, {
      toValue: 1.02,
      duration: 90,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
    current.onDragChange(true);
    viewport.current?.measureInWindow((_x, top, _width, height) => {
      if (drag.current?.id === id) {
        bounds.current = {top, height};
        scheduleScroll();
      }
    });
    return true;
  }

  function move(dy: number, pageY: number) {
    if (!drag.current) return;
    drag.current.dy = dy;
    drag.current.pageY = pageY;
    updatePosition();
    scheduleScroll();
  }

  return {
    activeId,
    settlingId,
    dropIndex,
    scale,
    scroller,
    viewport,
    position,
    begin,
    move,
    finish,
    onScroll: (y: number) => {
      offset.current = Math.max(0, y);
    },
  };
}
