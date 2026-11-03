import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {ParsedSubject} from '../features/scanner/domain/scanTypes';

export type RootStackParamList = {
  Welcome: undefined;
  NamePrompt: undefined;
  YearPrompt: undefined;
  Home: {tab?: 'Grades' | 'Schedules'; gradeScheduleId?: string} | undefined;
  ManualEntry:
    | {
        editSubjectId?: string;
        extractedSemester?: string | null;
        extractedSubjects?: ParsedSubject[];
      }
    | undefined;
  Profile: undefined;
  Scanner: {mode?: 'camera' | 'gallery'} | undefined;
  RecentSchedules: {scheduleId?: string} | undefined;
  Finance: undefined;
  GradeCalculator: {scheduleId?: string; autoCalculate?: boolean} | undefined;
};

export type AppScreenProps<Route extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Route>;
