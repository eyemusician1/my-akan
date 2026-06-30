import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

import { palette, spacing } from '../tokens';
import { database } from '../core/database';
import Expense from '../core/database/models/Expense';
import Due from '../core/database/models/Due';

// ============================================================================
// REACTIVE DUE ROW COMPONENT
// ============================================================================
const DueRowUI = ({
  due,
  isLast,
  onToggle,
  onDelete
}: {
  due: Due,
  isLast: boolean,
  onToggle: (due: Due) => void,
  onDelete: (due: Due) => void
}) => (
  <View style={[styles.dueRow, !isLast && styles.borderBottom]}>
    <View style={styles.dueDetails}>
      <Text style={[styles.dueTitle, due.isPaid && styles.textStrike]}>{due.title}</Text>
      <Text style={[styles.dueAmount, due.isPaid && styles.textStrikeMuted]}>₱{due.amount}</Text>
    </View>

    <View style={styles.dueActions}>
      <TouchableOpacity
        style={[styles.checkbox, due.isPaid && styles.checkboxActive]}
        activeOpacity={0.7}
        onPress={() => onToggle(due)}
      >
        {due.isPaid && <MaterialIcon name="check" size={16} color={palette.surface} />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onDelete(due)} style={styles.deleteDueBtn}>
        <MaterialIcon name="close" size={16} color={palette.border} />
      </TouchableOpacity>
    </View>
  </View>
);

const EnhancedDueRow = withObservables(['due'], ({ due }: { due: Due }) => ({
  due: due.observe(),
}))(DueRowUI);

// ============================================================================
// MAIN SCREEN COMPONENT
// ============================================================================
interface PaymentsScreenProps {
  navigation: any;
  expenses: Expense[];
  dues: Due[];
}

const PaymentsScreenUI = ({ navigation, expenses, dues }: PaymentsScreenProps) => {
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [weeklyAllowance, setWeeklyAllowance] = useState(1500);

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDueModalOpen, setIsDueModalOpen] = useState(false);

  // Input States
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<{name: string, icon: string} | null>(null);

  const [budgetInput, setBudgetInput] = useState('');
  const [dueTitle, setDueTitle] = useState('');
  const [dueAmount, setDueAmount] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedBudget = await AsyncStorage.getItem('@budget');
        if (storedBudget) setWeeklyAllowance(parseFloat(storedBudget));
      } catch (e) {
        console.error('Failed to load budget', e);
      }
    };
    loadSettings();
  }, []);

  // --- DYNAMIC SMART BUDGET MATH ---
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = weeklyAllowance - totalSpent;

  const todayDayOfWeek = new Date().getDay();
  const daysLeftInWeek = todayDayOfWeek === 0 ? 1 : 7 - todayDayOfWeek + 1;
  const safeToSpend = remainingBudget / daysLeftInWeek;

  const categories = [
    { name: 'Food', icon: 'lunch-dining' },
    { name: 'Transport', icon: 'directions-transit' },
    { name: 'Academic', icon: 'menu-book' },
    { name: 'Others', icon: 'category' },
  ];

  // --- SMART DIAGNOSIS GENERATOR (NO EMOJIS, SUBTLE UI) ---
  const getSmartInsight = () => {
    if (remainingBudget < 0) {
      return { text: "You have exceeded your weekly budget limit.", icon: "error-outline", color: "#d32f2f", bg: "rgba(211, 47, 47, 0.08)" };
    }
    if (safeToSpend <= 50) {
      return { text: "Tight budget. Consider sticking to absolute essentials today.", icon: "warning", color: "#E65100", bg: "rgba(230, 81, 0, 0.08)" };
    }
    if (totalSpent === 0) {
      return { text: "Zero spending logged this week. Excellent discipline.", icon: "check-circle-outline", color: palette.primary, bg: "rgba(197, 160, 89, 0.15)" };
    }
    return { text: `On track. You can spend ~₱${safeToSpend.toFixed(0)}/day through Sunday.`, icon: "trending-up", color: palette.ink, bg: "rgba(28, 28, 30, 0.04)" };
  };

  const insight = getSmartInsight();

  // --- WATERMELON DB HANDLERS WITH GUARDRAILS ---
  const handleQuickAdd = (category: {name: string, icon: string}) => {
    setSelectedCategory(category);
    setExpenseTitle('');
    setExpenseAmount('');
    setIsExpenseModalOpen(true);
  };

  const saveExpense = async () => {
    const parsedAmount = parseFloat(expenseAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !selectedCategory) {
      Alert.alert("Invalid Amount", "Please enter an expense amount greater than ₱0.");
      return;
    }

    await database.write(async () => {
      await database.get<Expense>('expenses').create(expense => {
        expense.title = expenseTitle.trim() || selectedCategory.name;
        expense.amount = parsedAmount;
        expense.category = selectedCategory.name.toLowerCase();
        expense.icon = selectedCategory.icon;
      });
    });

    setIsExpenseModalOpen(false);
  };

  const saveSettings = async () => {
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget) || newBudget <= 0) {
      Alert.alert("Invalid Allowance", "Your weekly budget must be greater than ₱0.");
      return;
    }

    setWeeklyAllowance(newBudget);
    await AsyncStorage.setItem('@budget', newBudget.toString());
    setIsSettingsModalOpen(false);
  };

  const saveDue = async () => {
    const parsedAmount = parseFloat(dueAmount);
    if (!dueTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Incomplete Details", "Please enter a valid fee title and an amount greater than ₱0.");
      return;
    }

    await database.write(async () => {
      await database.get<Due>('dues').create(due => {
        due.title = dueTitle.trim();
        due.amount = parsedAmount;
        due.isPaid = false;
      });
    });

    setIsDueModalOpen(false);
    setDueTitle('');
    setDueAmount('');
  };

  const toggleDue = async (due: Due) => {
    await database.write(async () => {
      await due.update(d => {
        d.isPaid = !d.isPaid;
      });
    });
  };

  const deleteTransaction = async (expense: Expense) => {
    await database.write(async () => {
      await expense.destroyPermanently();
    });
  };

  const deleteDue = async (due: Due) => {
    await database.write(async () => {
      await due.destroyPermanently();
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => {
            setBudgetInput(weeklyAllowance.toString());
            setIsSettingsModalOpen(true);
          }}
        >
          <MaterialIcon name="tune" size={24} color={palette.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <Text style={styles.heroSubtitle}>Safe to spend today</Text>
          <Text style={styles.heroAmount} adjustsFontSizeToFit numberOfLines={1}>
            ₱{Math.max(0, safeToSpend).toFixed(2)}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Weekly Budget</Text>
              <Text style={styles.heroStatValue}>₱{weeklyAllowance}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Total Spent</Text>
              <Text style={styles.heroStatValue}>₱{totalSpent}</Text>
            </View>
          </View>
        </View>

        {/* --- SMART M3 INSIGHT BANNER (Subtle Icons) --- */}
        <View style={[styles.insightBanner, { backgroundColor: insight.bg }]}>
          <MaterialIcon name={insight.icon} size={18} color={insight.color} style={styles.insightIcon} />
          <Text style={[styles.insightText, { color: insight.color }]}>{insight.text}</Text>
        </View>

        <Text style={styles.sectionLabel}>Quick Expense</Text>
        <View style={styles.quickAddRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={styles.quickAddBtn}
              activeOpacity={0.7}
              onPress={() => handleQuickAdd(cat)}
            >
              <View style={styles.iconCircle}>
                <MaterialIcon name={cat.icon} size={24} color={palette.primary} />
              </View>
              <Text style={styles.quickAddText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Recent Spending</Text>
        <View style={styles.cardContainer}>
          {expenses.length === 0 ? (
            <Text style={styles.emptyText}>No expenses logged yet. Great discipline.</Text>
          ) : (
            expenses.map((tx, index) => (
              <View key={tx.id} style={[styles.txRow, index !== expenses.length - 1 && styles.borderBottom]}>
                <View style={styles.txIconWrapper}>
                  <MaterialIcon name={tx.icon} size={20} color={palette.muted} />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txTime}>
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
                <Text style={styles.txAmount}>-₱{tx.amount}</Text>

                <TouchableOpacity onPress={() => deleteTransaction(tx)} style={{ padding: 8, marginLeft: 4 }}>
                  <MaterialIcon name="close" size={16} color={palette.border} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabelInline}>Academic Dues</Text>
          <TouchableOpacity onPress={() => setIsDueModalOpen(true)} style={styles.addDueBtn}>
            <MaterialIcon name="add" size={16} color={palette.primary} />
            <Text style={styles.addDueText}>Add Fee</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {dues.length === 0 ? (
            <Text style={styles.emptyText}>No pending academic dues.</Text>
          ) : (
            dues.map((due, index) => (
              <EnhancedDueRow
                key={due.id}
                due={due}
                isLast={index === dues.length - 1}
                onToggle={toggleDue}
                onDelete={deleteDue}
              />
            ))
          )}
        </View>

      </ScrollView>

      {/* --- ADD EXPENSE MODAL --- */}
      <Modal visible={isExpenseModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add {selectedCategory?.name} Expense</Text>
                <TouchableOpacity onPress={() => setIsExpenseModalOpen(false)}>
                  <MaterialIcon name="close" size={28} color={palette.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.pesoSign}>₱</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={expenseAmount}
                    onChangeText={(text) => setExpenseAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>What was it for? (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                  placeholder={`e.g. ${selectedCategory?.name} today`}
                  placeholderTextColor={palette.muted}
                />
              </View>

              <TouchableOpacity style={[styles.saveBtn, !expenseAmount && styles.saveBtnDisabled]} disabled={!expenseAmount} onPress={saveExpense}>
                <Text style={styles.saveBtnText}>Save Expense</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- SETTINGS MODAL --- */}
      <Modal visible={isSettingsModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Allowance</Text>
                <TouchableOpacity onPress={() => setIsSettingsModalOpen(false)}>
                  <MaterialIcon name="close" size={28} color={palette.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weekly Budget Limit</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.pesoSign}>₱</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={budgetInput}
                    onChangeText={(text) => setBudgetInput(text.replace(/[^0-9.]/g, ''))}
                    placeholder="1500"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, !budgetInput && styles.saveBtnDisabled]} disabled={!budgetInput} onPress={saveSettings}>
                <Text style={styles.saveBtnText}>Update Budget</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- ADD FEE MODAL --- */}
      <Modal visible={isDueModalOpen} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Academic Fee</Text>
                <TouchableOpacity onPress={() => setIsDueModalOpen(false)}>
                  <MaterialIcon name="close" size={28} color={palette.ink} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fee Name</Text>
                <TextInput
                  style={styles.textInput}
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
                    value={dueAmount}
                    onChangeText={(text) => setDueAmount(text.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, (!dueTitle || !dueAmount) && styles.saveBtnDisabled]} disabled={!dueTitle || !dueAmount} onPress={saveDue}>
                <Text style={styles.saveBtnText}>Add Fee</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

export const PaymentsScreen = withObservables([], () => ({
  expenses: database.get<Expense>('expenses').query(Q.sortBy('created_at', Q.desc)).observe(),
  dues: database.get<Due>('dues').query(Q.sortBy('created_at', Q.desc)).observe(),
}))(PaymentsScreenUI);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: spacing.sm, marginRight: spacing.sm },
  headerTitle: { fontSize: 26, fontWeight: '700', color: palette.ink, letterSpacing: -0.5 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(28,28,30,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },

  scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },

  heroCard: { backgroundColor: palette.primary, borderRadius: 32, padding: spacing.xl, paddingTop: spacing.xxl, marginBottom: spacing.lg, shadowColor: palette.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  heroSubtitle: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 8, textAlign: 'center' },
  heroAmount: { fontSize: 56, fontWeight: '800', color: palette.surface, textAlign: 'center', letterSpacing: -2, marginBottom: spacing.xl },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20, padding: 16 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  heroStatValue: { fontSize: 16, fontWeight: '700', color: palette.surface },
  heroDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  insightBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, marginBottom: spacing.xl },
  insightIcon: { marginRight: 8 },
  insightText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: palette.ink, marginTop: spacing.lg, marginBottom: spacing.md, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.6 },
  sectionLabelInline: { fontSize: 13, fontWeight: '700', color: palette.ink, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.6 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },

  addDueBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(197, 160, 89, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addDueText: { color: palette.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 },

  quickAddRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAddBtn: { alignItems: 'center', flex: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(197, 160, 89, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickAddText: { fontSize: 13, fontWeight: '600', color: palette.ink },

  cardContainer: { backgroundColor: palette.surface, borderRadius: 28, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  emptyText: { textAlign: 'center', paddingVertical: 20, color: palette.muted, fontWeight: '500' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(28,28,30,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txTitle: { fontSize: 16, fontWeight: '600', color: palette.ink, marginBottom: 2 },
  txTime: { fontSize: 13, fontWeight: '500', color: palette.muted },
  txAmount: { fontSize: 16, fontWeight: '700', color: '#d32f2f' },

  dueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  dueDetails: { flex: 1 },
  dueTitle: { fontSize: 16, fontWeight: '600', color: palette.ink, marginBottom: 2 },
  dueAmount: { fontSize: 15, fontWeight: '700', color: palette.primary },
  dueActions: { flexDirection: 'row', alignItems: 'center' },
  textStrike: { textDecorationLine: 'line-through', opacity: 0.5 },
  textStrikeMuted: { textDecorationLine: 'line-through', color: palette.muted },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: palette.muted, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  deleteDueBtn: { padding: 8, marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: palette.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: 22, fontWeight: '700', color: palette.ink },

  inputGroup: { marginBottom: spacing.lg },
  inputLabel: { fontSize: 14, fontWeight: '600', color: palette.muted, marginBottom: 8, marginLeft: 4 },

  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderRadius: 24, paddingHorizontal: 20, height: 80 },
  pesoSign: { fontSize: 32, fontWeight: '700', color: palette.ink, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '700', color: palette.ink },

  textInput: { backgroundColor: palette.surface, borderRadius: 20, paddingHorizontal: 20, height: 60, fontSize: 16, fontWeight: '500', color: palette.ink },

  saveBtn: { backgroundColor: palette.primary, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: palette.surface, fontSize: 18, fontWeight: '700' }
});