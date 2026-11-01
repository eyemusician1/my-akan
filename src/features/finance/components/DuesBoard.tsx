import React, {useMemo, useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import type Due from '../../../core/database/models/Due';
import {palette, spacing} from '../../../tokens';
import {formatMoney} from '../domain/money';
import {moveDue} from '../domain/duePriority';
import {useDueDrag} from '../hooks/useDueDrag';

export const DUE_CARD_HEIGHT = 84;
export const DUE_SLOT_HEIGHT = DUE_CARD_HEIGHT + 10;

interface Props {
  dues: Due[];
  disabled: boolean;
  reorderDisabled: boolean;
  onAdd: () => void;
  onInfo: () => void;
  onToggle: (due: Due) => void;
  onDelete: (due: Due) => void;
  onReorder: (ids: string[]) => void;
  onDragChange: (active: boolean) => void;
}

function DueBody({
  due,
  rank,
  disabled,
  onToggle,
  onDelete,
  children,
}: {
  due: Due;
  rank?: number;
  disabled: boolean;
  onToggle: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <>
      {rank !== undefined && (
        <Text style={[styles.rank, rank === 0 && styles.nextRank]}>
          {rank === 0 ? 'Next' : String(rank + 1).padStart(2, '0')}
        </Text>
      )}
      <View style={styles.details}>
        <Text
          numberOfLines={1}
          style={[styles.title, due.isPaid && styles.paidText]}>
          {due.title}
        </Text>
        <Text style={[styles.amount, due.isPaid && styles.paidText]}>
          {formatMoney(due.amount)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        disabled={disabled}
        style={styles.action}
        accessibilityRole="checkbox"
        accessibilityState={{checked: due.isPaid, disabled}}
        accessibilityLabel={`Mark ${due.title} as ${
          due.isPaid ? 'unpaid' : 'paid'
        }`}>
        <MaterialIcon
          name={due.isPaid ? 'check-circle' : 'radio-button-unchecked'}
          size={23}
          color={due.isPaid ? palette.primary : palette.muted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        disabled={disabled}
        style={styles.action}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${due.title}`}>
        <MaterialIcon name="close" size={18} color={palette.muted} />
      </TouchableOpacity>
      {children}
    </>
  );
}

function DraggableDue({
  due,
  index,
  count,
  disabled,
  reorderDisabled,
  active,
  lifted,
  position,
  scale,
  onBegin,
  onMove,
  onFinish,
  onAccessibleMove,
  onToggle,
  onDelete,
}: {
  due: Due;
  index: number;
  count: number;
  disabled: boolean;
  reorderDisabled: boolean;
  active: boolean;
  lifted: boolean;
  position: Animated.Value;
  scale: Animated.Value;
  onBegin: (index: number, pageY: number) => boolean;
  onMove: (distance: number, pageY: number) => void;
  onFinish: (cancelled: boolean) => void;
  onAccessibleMove: (from: number, to: number) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const current = useRef({
    index,
    count,
    reorderDisabled,
    onBegin,
    onMove,
    onFinish,
  });
  current.current = {index, count, reorderDisabled, onBegin, onMove, onFinish};
  const started = useRef(false);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !current.current.reorderDisabled && current.current.count > 1,
        onPanResponderGrant: event => {
          started.current = current.current.onBegin(
            current.current.index,
            event.nativeEvent.pageY,
          );
        },
        onPanResponderMove: (_event, gesture) => {
          if (started.current)
            current.current.onMove(gesture.dy, gesture.moveY);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (started.current) {
            current.current.onMove(gesture.dy, gesture.moveY);
            current.current.onFinish(false);
          }
          started.current = false;
        },
        onPanResponderTerminate: () => {
          if (started.current) current.current.onFinish(true);
          started.current = false;
        },
        onPanResponderTerminationRequest: () => !started.current,
      }),
    [],
  );

  return (
    <Animated.View
      testID={`due-card-${due.id}`}
      style={[
        styles.dueCard,
        {top: 0},
        index === 0 && styles.nextCard,
        lifted && styles.draggingCard,
        {transform: [{translateY: position}, {scale: lifted ? scale : 1}]},
      ]}>
      <DueBody
        due={due}
        rank={index}
        disabled={disabled || active}
        onToggle={onToggle}
        onDelete={onDelete}>
        <View
          {...responder.panHandlers}
          style={styles.handle}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Priority ${index + 1}, ${due.title}`}
          accessibilityHint="Drag up or down to change payment priority"
          accessibilityState={{disabled: reorderDisabled || count < 2}}
          accessibilityValue={{min: 1, max: count, now: index + 1}}
          accessibilityActions={
            reorderDisabled || count < 2
              ? []
              : [
                  {name: 'increment', label: 'Move up'},
                  {name: 'decrement', label: 'Move down'},
                ]
          }
          onAccessibilityAction={event => {
            if (reorderDisabled) return;
            const name = event.nativeEvent.actionName;
            if (name === 'increment') onAccessibleMove(index, index - 1);
            if (name === 'decrement') onAccessibleMove(index, index + 1);
          }}>
          <MaterialIcon
            name="drag-indicator"
            size={22}
            color={
              reorderDisabled || count < 2 ? palette.border : palette.muted
            }
          />
        </View>
      </DueBody>
    </Animated.View>
  );
}

export function DuesBoard({
  dues,
  disabled,
  reorderDisabled,
  onAdd,
  onInfo,
  onToggle,
  onDelete,
  onReorder,
  onDragChange,
}: Props) {
  const pending = dues.filter(due => !due.isPaid);
  const paid = dues.filter(due => due.isPaid);
  const [showPaid, setShowPaid] = useState(false);
  const {height: screenHeight} = useWindowDimensions();
  const contentHeight = Math.max(0, pending.length * DUE_SLOT_HEIGHT - 10);
  const listHeight = Math.min(
    contentHeight,
    DUE_SLOT_HEIGHT * 3.3,
    screenHeight * 0.42,
  );
  const pendingIds = pending.map(due => due.id);
  const drag = useDueDrag({
    ids: pendingIds,
    disabled: disabled || reorderDisabled,
    slotHeight: DUE_SLOT_HEIGHT,
    contentHeight,
    listHeight,
    screenHeight,
    onReorder,
    onDragChange,
  });

  return (
    <View style={styles.board}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Academic dues</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="About academic dues"
          style={styles.infoButton}
          onPress={onInfo}>
          <MaterialIcon name="info-outline" size={17} color={palette.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAdd}
          disabled={disabled}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Add Fee">
          <MaterialIcon name="add" size={16} color={palette.primary} />
          <Text style={styles.addLabel}>Fee</Text>
        </TouchableOpacity>
      </View>
      {pending.length > 0 ? (
        <>
          <View style={styles.laneHeader}>
            <Text style={styles.laneTitle}>To pay · {pending.length}</Text>
            {pending.length > 1 && (
              <Text style={styles.hint}>Drag to reorder</Text>
            )}
          </View>
          <View ref={drag.viewport} collapsable={false}>
            <ScrollView
              ref={drag.scroller}
              style={{height: listHeight}}
              nestedScrollEnabled
              scrollEnabled={!drag.activeId}
              scrollEventThrottle={16}
              onScroll={event => {
                drag.onScroll(event.nativeEvent.contentOffset.y);
              }}>
              <View style={{height: contentHeight}}>
                {drag.activeId && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.dropIndicator,
                      {top: drag.dropIndex * DUE_SLOT_HEIGHT},
                    ]}
                  />
                )}
                {pending.map((due, index) => (
                  <DraggableDue
                    key={due.id}
                    due={due}
                    index={index}
                    count={pending.length}
                    disabled={disabled || !!drag.activeId}
                    reorderDisabled={reorderDisabled || disabled}
                    active={drag.activeId === due.id}
                    lifted={
                      drag.activeId === due.id || drag.settlingId === due.id
                    }
                    position={drag.position(due.id, index)}
                    scale={drag.scale}
                    onBegin={drag.begin}
                    onMove={drag.move}
                    onFinish={drag.finish}
                    onAccessibleMove={(from, to) => {
                      if (to >= 0 && to < pending.length && !drag.activeId)
                        onReorder(moveDue(pendingIds, from, to));
                    }}
                    onToggle={() => onToggle(due)}
                    onDelete={() => onDelete(due)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <MaterialIcon
            name="check-circle-outline"
            size={20}
            color={palette.muted}
          />
          <Text style={styles.emptyText}>Nothing to pay</Text>
        </View>
      )}
      {paid.length > 0 && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Paid dues"
            accessibilityState={{expanded: showPaid}}
            onPress={() => setShowPaid(value => !value)}
            style={styles.paidHeader}>
            <Text style={styles.hint}>Paid · {paid.length}</Text>
            <MaterialIcon
              name={showPaid ? 'expand-less' : 'expand-more'}
              size={20}
              color={palette.muted}
            />
          </TouchableOpacity>
          {showPaid &&
            paid.map(due => (
              <View key={due.id} style={styles.paidCard}>
                <DueBody
                  due={due}
                  disabled={disabled}
                  onToggle={() => onToggle(due)}
                  onDelete={() => onDelete(due)}
                />
              </View>
            ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {marginBottom: spacing.lg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: palette.body,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  infoButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(197,160,89,0.15)',
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
    marginLeft: 3,
  },
  laneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 3,
  },
  laneTitle: {fontSize: 12, fontWeight: '600', color: palette.body},
  hint: {fontSize: 11, color: palette.muted},
  dueCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: DUE_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    paddingLeft: 10,
    paddingRight: 2,
  },
  nextCard: {borderColor: 'rgba(122,28,28,0.3)', backgroundColor: '#F3EADF'},
  draggingCard: {
    zIndex: 10,
    elevation: 7,
    shadowColor: palette.ink,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderColor: palette.primary,
  },
  rank: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: palette.muted,
    marginRight: 8,
  },
  nextRank: {color: palette.primary},
  details: {flex: 1, minWidth: 0},
  title: {fontSize: 14, fontWeight: '600', color: palette.ink},
  amount: {fontSize: 13, fontWeight: '600', color: palette.body, marginTop: 5},
  action: {
    width: 34,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: DUE_CARD_HEIGHT - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidText: {textDecorationLine: 'line-through', color: palette.muted},
  dropIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: DUE_CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: 'rgba(197,160,89,0.08)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(122,28,28,0.25)',
    zIndex: 0,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    backgroundColor: palette.surface,
    borderRadius: 20,
  },
  emptyText: {fontSize: 13, color: palette.muted},
  paidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: palette.surface,
    padding: 12,
    marginBottom: 8,
  },
});
