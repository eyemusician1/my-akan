import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {SubjectDraft} from '../features/schedule/domain/types';

export type RootStackParamList = {
  Welcome: undefined;
  NamePrompt: undefined;
  YearPrompt: undefined;
  Home: undefined;
  ManualEntry:
    | {
        editSubjectId?: string;
        extractedSemester?: string | null;
        extractedSubjects?: SubjectDraft[];
      }
    | undefined;
  Profile: undefined;
  Scanner: {mode?: 'camera' | 'gallery'} | undefined;
  RecentSchedules: undefined;
  Finance: undefined;
};

export type AppScreenProps<Route extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Route>;
