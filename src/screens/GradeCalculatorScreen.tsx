import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette} from '../tokens';
import {AppScreenProps} from '../navigation/types';
import {GradeCalculator} from '../features/grades/components/GradeCalculator';

export function GradeCalculatorScreen({
  navigation,
  route,
}: AppScreenProps<'GradeCalculator'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.back}>
          <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.title}>Grade calculator</Text>
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + 30},
        ]}>
        <GradeCalculator
          initialScheduleId={route.params?.scheduleId}
          autoCalculate={route.params?.autoCalculate}
          onLogGrades={(gradeScheduleId?: string) =>
            navigation.popTo('Home', {tab: 'Grades', gradeScheduleId})
          }
        />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: palette.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  back: {height: 44, width: 44, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 20, fontWeight: '700', color: palette.ink},
  content: {padding: 24},
});
