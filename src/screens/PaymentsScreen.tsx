import {ScreenModal as Modal} from '../shared/components/ScreenModal';
import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Animated,
  Switch,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import withObservables from '@nozbe/with-observables';
import {Q} from '@nozbe/watermelondb';

import {palette, spacing} from '../tokens';
import {database} from '../core/database';
import Expense from '../core/database/models/Expense';
import Due from '../core/database/models/Due';
import {DuesInfo} from '../features/finance/components/DuesInfo';
import {DuesBoard} from '../features/finance/components/DuesBoard';
import {orderDues} from '../features/finance/domain/duePriority';
import {useDuePriority} from '../features/finance/hooks/useDuePriority';
import {BudgetCard} from '../features/finance/components/BudgetCard';
import {SpendingBreakdown} from '../features/finance/components/SpendingBreakdown';
import {financeRepository} from '../features/finance/data';
import {budgetStore} from '../features/finance/data/budgetStore';
import {
  analyzeBudget,
  getBudgetInsight,
} from '../features/finance/domain/budgetAnalysis';
import {formatMoney, parseAmount} from '../features/finance/domain/money';
import {
  BUDGET_PERIODS,
  BudgetPeriod,
  BudgetSettings,
  DEFAULT_BUDGET,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
} from '../features/finance/domain/types';
import {useFinanceDate} from '../features/finance/hooks/useFinanceDate';
import {BudgetNotifications} from '../core/notifications/BudgetNotifications';
import {AppScreenProps} from '../navigation/types';
import {
  enterBottomSheet,
  exitBottomSheet,
  SHEET_CLOSED_OFFSET,
} from '../shared/animations/bottomSheet';

interface PaymentsScreenProps {
  navigation: AppScreenProps<'Finance'>['navigation'];
  expenses: Expense[];
  dues: Due[];
}

export const PaymentsScreenUI = ({
  navigation,
  expenses,
  dues,
}: PaymentsScreenProps) => {
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [budgetSettings, setBudgetSettings] =
    useState<BudgetSettings>(DEFAULT_BUDGET);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const mutationInProgress = useRef(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const {height: screenHeight} = useWindowDimensions();
  const financeDate = useFinanceDate();
  const priority = useDuePriority();
  const [isDraggingDue, setIsDraggingDue] = useState(false);
  const orderedDues = useMemo(
    () => orderDues(dues, priority.order),
    [dues, priority.order],
  );

  // Modal Visibility States
  const [activeModal, setActiveModal] = useState<
    'expense' | 'settings' | 'due' | 'duesInfo' | null
  >(null);

  // Animation Refs
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(
    new Animated.Value(SHEET_CLOSED_OFFSET),
  ).current;

  // Input States
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);

  const [budgetInput, setBudgetInput] = useState('');
  const [periodInput, setPeriodInput] = useState<BudgetPeriod>('weekly');
  const [reserveDuesInput, setReserveDuesInput] = useState(false);
  const [dueTitle, setDueTitle] = useState('');
  const [dueAmount, setDueAmount] = useState('');

  useEffect(() => {
    let mounted = true;
    budgetStore
      .load()
      .then(settings => {
        if (mounted) setBudgetSettings(settings);
      })
      .catch(error => {
        console.warn('Failed to load budget settings', error);
        if (mounted)
          Alert.alert(
            'Budget unavailable',
            'Could not load your saved budget. The default weekly amount is shown.',
          );
      })
      .finally(() => {
        if (mounted) setSettingsLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // --- CUSTOM SPRING MODAL ANIMATIONS ---
  const openAnimatedModal = (
    type: 'expense' | 'settings' | 'due' | 'duesInfo',
  ) => {
    setActiveModal(type);
    enterBottomSheet(modalOpacity, modalTranslateY).start();
  };

  const closeAnimatedModal = () =>
    new Promise<void>(resolve => {
      Keyboard.dismiss();
      exitBottomSheet(modalOpacity, modalTranslateY).start(() => {
        setActiveModal(null);
        resolve();
      });
    });

  const analysis = useMemo(
    () => analyzeBudget(expenses, dues, budgetSettings, new Date()),
    [expenses, dues, budgetSettings, financeDate],
  );
  useEffect(() => {
    if (settingsLoaded) BudgetNotifications.check(analysis, budgetSettings)
      .catch(error => console.warn('Budget alert could not update', error));
  }, [analysis, budgetSettings, settingsLoaded]);
  const insight = getBudgetInsight(analysis, budgetSettings);
  const insightColors =
    insight.tone === 'danger'
      ? {color: '#D32F2F', bg: 'rgba(211,47,47,0.08)'}
      : insight.tone === 'warning'
      ? {color: '#A34B16', bg: 'rgba(197,160,89,0.15)'}
      : {color: palette.primary, bg: 'rgba(197,160,89,0.15)'};
  const periodLabel = BUDGET_PERIODS.find(
    period => period.value === budgetSettings.period,
  )!.label;
  const periodPhrase =
    budgetSettings.period === 'daily'
      ? 'today'
      : budgetSettings.period === 'weekly'
      ? 'this week'
      : 'this month';
  const visibleExpenses = showAllActivity ? expenses : analysis.periodExpenses;

  const openBudgetSettings = () => {
    setBudgetInput(budgetSettings.amount.toString());
    setPeriodInput(budgetSettings.period);
    setReserveDuesInput(budgetSettings.reserveDues);
    openAnimatedModal('settings');
  };

  const runMutation = async (
    action: () => Promise<unknown>,
    closeSheet = false,
  ) => {
    if (mutationInProgress.current) return;
    mutationInProgress.current = true;
    setIsBusy(true);
    try {
      await action();
      if (closeSheet) await closeAnimatedModal();
    } catch (error) {
      console.warn('Payment update failed', error);
      Alert.alert(
        'Update failed',
        'Your changes could not be saved. Please try again.',
      );
    } finally {
      mutationInProgress.current = false;
      setIsBusy(false);
    }
  };

  const handleQuickAdd = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setExpenseTitle('');
    setExpenseAmount('');
    openAnimatedModal('expense');
  };

  const saveExpense = async () => {
    const amount = parseAmount(expenseAmount);
    if (amount === null || !selectedCategory) {
      Alert.alert(
        'Invalid amount',
        'Enter an amount greater than ₱0 with up to two decimal places.',
      );
      return;
    }
    await runMutation(
      () =>
        financeRepository.addExpense(expenseTitle, amount, selectedCategory),
      true,
    );
  };

  const saveSettings = async () => {
    const amount = parseAmount(budgetInput);
    if (amount === null) {
      Alert.alert(
        'Invalid budget',
        'Enter a budget greater than ₱0 with up to two decimal places.',
      );
      return;
    }
    const settings: BudgetSettings = {
      version: 1,
      amount,
      period: periodInput,
      reserveDues: reserveDuesInput,
    };
    await runMutation(async () => {
      await budgetStore.save(settings);
      setBudgetSettings(settings);
      setShowAllActivity(false);
    }, true);
  };

  const saveDue = async () => {
    const amount = parseAmount(dueAmount);
    if (amount === null || !dueTitle.trim()) {
      Alert.alert(
        'Incomplete details',
        'Enter a fee name and an amount greater than ₱0 with up to two decimal places.',
      );
      return;
    }
    await runMutation(() => financeRepository.addDue(dueTitle, amount), true);
  };

  const toggleDue = (due: Due) =>
    runMutation(() => financeRepository.toggleDue(due.id));
  const deleteTransaction = (expense: Expense) =>
    runMutation(() => financeRepository.deleteExpense(expense.id));
  const deleteDue = (due: Due) =>
    runMutation(() => financeRepository.deleteDue(due.id));

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + spacing.md}]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
        </View>
      </View>

      <FlatList
        data={visibleExpenses}
        keyExtractor={expense => expense.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDraggingDue}
        ListHeaderComponent={<>
        <BudgetCard
          settings={budgetSettings}
          analysis={analysis}
          onPress={openBudgetSettings}
          disabled={!settingsLoaded || isBusy}
        />

        {insight.tone !== 'neutral' && (
          <View
            style={[styles.insightBanner, {backgroundColor: insightColors.bg}]}>
            <MaterialIcon
              name={insight.icon}
              size={17}
              color={insightColors.color}
              style={styles.insightIcon}
            />
            <Text style={[styles.insightText, {color: insightColors.color}]}>
              {insight.text}
            </Text>
          </View>
        )}

        <DuesBoard
          dues={orderedDues}
          disabled={isBusy || priority.saving}
          reorderDisabled={!priority.loaded || priority.saving}
          onAdd={() => {
            setDueTitle('');
            setDueAmount('');
            openAnimatedModal('due');
          }}
          onInfo={() => openAnimatedModal('duesInfo')}
          onToggle={toggleDue}
          onDelete={deleteDue}
          onReorder={priority.reorder}
          onDragChange={setIsDraggingDue}
        />

        <Text style={styles.sectionLabel}>Quick Expense</Text>
        <View style={styles.quickAddRow}>
          {EXPENSE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.name}
              style={styles.quickAddBtn}
              activeOpacity={0.7}
              disabled={isBusy}
              onPress={() => handleQuickAdd(cat)}>
              <View style={styles.iconCircle}>
                <MaterialIcon
                  name={cat.icon}
                  size={24}
                  color={palette.primary}
                />
              </View>
              <Text style={styles.quickAddText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabelInline}>
            {showAllActivity ? 'All spending' : `Spending ${periodPhrase}`}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setShowAllActivity(value => !value)}
            style={styles.addDueBtn}>
            <Text style={styles.addDueText}>
              {showAllActivity ? periodLabel : 'View all'}
            </Text>
          </TouchableOpacity>
        </View>
        </>}
        ListEmptyComponent={
          <View style={styles.cardContainer}>
            <Text style={styles.emptyText}>
              {showAllActivity ? 'No expenses logged yet.' : 'No spending yet.'}
            </Text>
          </View>
        }
        renderItem={({item: tx, index}) => (
              <View
                style={[
                  styles.txCard,
                  styles.txRow,
                  index !== visibleExpenses.length - 1 && styles.borderBottom,
                  index === 0 && styles.txCardFirst,
                  index === visibleExpenses.length - 1 && styles.txCardLast,
                ]}>
                <View style={styles.txIconWrapper}>
                  <MaterialIcon
                    name={tx.icon}
                    size={20}
                    color={palette.muted}
                  />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txTime}>
                    {tx.createdAt.toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    ·{' '}
                    {tx.createdAt.toLocaleTimeString('en-PH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.txAmount}>-{formatMoney(tx.amount)}</Text>

                <TouchableOpacity
                  disabled={isBusy}
                  accessibilityLabel={`Delete expense ${tx.title}`}
                  onPress={() => deleteTransaction(tx)}
                  style={{padding: 8, marginLeft: 4}}>
                  <MaterialIcon name="close" size={16} color={palette.border} />
                </TouchableOpacity>
              </View>
        )}
        ListFooterComponent={<SpendingBreakdown analysis={analysis} />}
      />

      {/* --- MASTER ANIMATED MODAL (Bypasses Android Shadow Smear) --- */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="none"
        hardwareAccelerated
        onRequestClose={() => {
          if (!isBusy) closeAnimatedModal();
        }}>
        <View style={styles.modalOverlay}>
          {/* Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {backgroundColor: 'rgba(0,0,0,0.5)', opacity: modalOpacity},
            ]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              disabled={isBusy}
              onPress={() => closeAnimatedModal()}
            />
          </Animated.View>

          {/* Bottom Sheet Content */}
          <Animated.View
            style={[
              styles.modalContentWrapper,
              {transform: [{translateY: modalTranslateY}]},
            ]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView
                style={{maxHeight: screenHeight * 0.8}}
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled">
                {activeModal === 'duesInfo' && (
                  <DuesInfo
                    onClose={() => {
                      closeAnimatedModal();
                    }}
                  />
                )}

                {/* 1. EXPENSE CONTENT */}
                {activeModal === 'expense' && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        Add {selectedCategory?.name} Expense
                      </Text>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => closeAnimatedModal()}>
                        <MaterialIcon
                          name="close"
                          size={28}
                          color={palette.ink}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Amount</Text>
                      <View style={styles.amountInputWrapper}>
                        <Text style={styles.pesoSign}>₱</Text>
                        <TextInput
                          style={styles.amountInput}
                          editable={!isBusy}
                          value={expenseAmount}
                          onChangeText={text =>
                            setExpenseAmount(text.replace(/[^0-9.]/g, ''))
                          }
                          placeholder="0.00"
                          placeholderTextColor={palette.muted}
                          keyboardType="decimal-pad"
                          autoFocus
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        What was it for? (Optional)
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        editable={!isBusy}
                        value={expenseTitle}
                        onChangeText={setExpenseTitle}
                        placeholder={`e.g. ${selectedCategory?.name} today`}
                        placeholderTextColor={palette.muted}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        !expenseAmount && styles.saveBtnDisabled,
                      ]}
                      disabled={isBusy || !expenseAmount}
                      onPress={saveExpense}>
                      <Text style={styles.saveBtnText}>
                        {isBusy ? 'Saving…' : 'Save Expense'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* 2. SETTINGS CONTENT */}
                {activeModal === 'settings' && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Your budget</Text>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => closeAnimatedModal()}>
                        <MaterialIcon
                          name="close"
                          size={28}
                          color={palette.ink}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Budget period</Text>
                    <View style={styles.periodSelector}>
                      {BUDGET_PERIODS.map(period => (
                        <TouchableOpacity
                          key={period.value}
                          disabled={isBusy}
                          accessibilityLabel={`${period.label} budget period`}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: periodInput === period.value,
                            disabled: isBusy,
                          }}
                          style={[
                            styles.periodOption,
                            periodInput === period.value &&
                              styles.periodOptionActive,
                          ]}
                          onPress={() => setPeriodInput(period.value)}>
                          <Text
                            style={[
                              styles.periodOptionText,
                              periodInput === period.value &&
                                styles.periodOptionTextActive,
                            ]}>
                            {period.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.periodHelp}>
                      {periodInput === 'daily'
                        ? 'Resets at midnight.'
                        : periodInput === 'weekly'
                        ? 'Monday to Sunday.'
                        : 'Calendar month.'}
                    </Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Amount</Text>
                      <View style={styles.amountInputWrapper}>
                        <Text style={styles.pesoSign}>₱</Text>
                        <TextInput
                          style={styles.amountInput}
                          editable={!isBusy}
                          value={budgetInput}
                          onChangeText={text =>
                            setBudgetInput(text.replace(/[^0-9.]/g, ''))
                          }
                          placeholder="1500"
                          placeholderTextColor={palette.muted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    <View style={styles.reserveRow}>
                      <View style={styles.reserveDetails}>
                        <Text style={styles.reserveTitle}>
                          Reserve unpaid fees
                        </Text>
                        <Text style={styles.reserveDescription}>
                          Keep fee money out of today's allowance.
                        </Text>
                      </View>
                      <Switch
                        value={reserveDuesInput}
                        onValueChange={setReserveDuesInput}
                        disabled={isBusy}
                        accessibilityLabel="Set aside unpaid fees"
                        trackColor={{
                          false: palette.border,
                          true: palette.secondary,
                        }}
                        thumbColor={
                          reserveDuesInput ? palette.primary : palette.surface
                        }
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        !budgetInput && styles.saveBtnDisabled,
                      ]}
                      disabled={isBusy || !budgetInput}
                      onPress={saveSettings}>
                      <Text style={styles.saveBtnText}>
                        {isBusy ? 'Saving…' : 'Save Budget'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* 3. DUE CONTENT */}
                {activeModal === 'due' && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Add Academic Fee</Text>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => closeAnimatedModal()}>
                        <MaterialIcon
                          name="close"
                          size={28}
                          color={palette.ink}
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Fee Name</Text>
                      <TextInput
                        style={styles.textInput}
                        editable={!isBusy}
                        value={dueTitle}
                        onChangeText={setDueTitle}
                        placeholder="e.g. Lab Manual"
                        placeholderTextColor={palette.muted}
                        autoFocus
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Amount</Text>
                      <View style={styles.amountInputWrapper}>
                        <Text style={styles.pesoSign}>₱</Text>
                        <TextInput
                          style={styles.amountInput}
                          editable={!isBusy}
                          value={dueAmount}
                          onChangeText={text =>
                            setDueAmount(text.replace(/[^0-9.]/g, ''))
                          }
                          placeholder="0.00"
                          placeholderTextColor={palette.muted}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        (!dueTitle || !dueAmount) && styles.saveBtnDisabled,
                      ]}
                      disabled={isBusy || !dueTitle || !dueAmount}
                      onPress={saveDue}>
                      <Text style={styles.saveBtnText}>
                        {isBusy ? 'Saving…' : 'Add Fee'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export const PaymentsScreen = withObservables([], () => ({
  expenses: database
    .get<Expense>('expenses')
    .query(Q.sortBy('created_at', Q.desc))
    .observeWithColumns(['title', 'amount', 'category', 'icon', 'created_at']),
  dues: database
    .get<Due>('dues')
    .query(Q.sortBy('created_at', Q.asc))
    .observeWithColumns(['title', 'amount', 'is_paid']),
}))(PaymentsScreenUI);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: palette.bg},

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center'},
  backButton: {padding: spacing.sm, marginRight: spacing.sm},
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: -0.5,
  },

  scrollContent: {paddingHorizontal: spacing.xl, paddingBottom: 100},

  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: spacing.xl,
  },
  insightIcon: {marginRight: 8},
  insightText: {flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20},

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  sectionLabelInline: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  addDueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addDueText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },

  quickAddRow: {flexDirection: 'row', justifyContent: 'space-between'},
  quickAddBtn: {alignItems: 'center', flex: 1},
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAddText: {fontSize: 13, fontWeight: '600', color: palette.ink},

  cardContainer: {
    backgroundColor: palette.surface,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  borderBottom: {borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)'},
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: palette.muted,
    fontWeight: '500',
  },

  txRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 16},
  txCard: {backgroundColor: palette.surface, paddingHorizontal: spacing.lg},
  txCardFirst: {borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24},
  txCardLast: {borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 24},
  txIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {flex: 1},
  txTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.ink,
    marginBottom: 2,
  },
  txTime: {fontSize: 13, fontWeight: '500', color: palette.muted},
  txAmount: {fontSize: 16, fontWeight: '700', color: '#d32f2f'},

  modalOverlay: {flex: 1, justifyContent: 'flex-end'},
  modalContentWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -6},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalContent: {
    backgroundColor: palette.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {fontSize: 22, fontWeight: '700', color: palette.ink},

  inputGroup: {marginBottom: spacing.lg},
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.muted,
    marginBottom: 8,
    marginLeft: 4,
  },

  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 80,
  },
  pesoSign: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.ink,
    marginRight: 8,
  },
  amountInput: {flex: 1, fontSize: 36, fontWeight: '700', color: palette.ink},

  textInput: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 60,
    fontSize: 16,
    fontWeight: '500',
    color: palette.ink,
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 5,
    marginTop: 2,
    gap: 4,
  },
  periodOption: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  periodOptionActive: {backgroundColor: palette.primary},
  periodOptionText: {fontSize: 14, fontWeight: '600', color: palette.body},
  periodOptionTextActive: {color: palette.surface},
  periodHelp: {
    fontSize: 12,
    lineHeight: 18,
    color: palette.muted,
    marginTop: 10,
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  reserveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 16,
  },
  reserveDetails: {flex: 1, marginRight: 8},
  reserveTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 5,
  },
  reserveDescription: {fontSize: 12, lineHeight: 18, color: palette.body},

  saveBtn: {
    backgroundColor: palette.primary,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {color: palette.surface, fontSize: 18, fontWeight: '700'},
});
