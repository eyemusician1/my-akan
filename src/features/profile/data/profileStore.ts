import AsyncStorage from '@react-native-async-storage/async-storage';
import {YEAR_LEVELS} from './options';

export interface StudentProfile {
  name: string;
  yearLevel: string;
  studentId: string;
  college: string;
  course: string;
}
const KEYS = [
  '@user_name',
  '@user_year',
  '@user_id',
  '@user_college',
  '@user_course',
];
export const profileStore = {
  async load(): Promise<StudentProfile> {
    const saved = new Map(await AsyncStorage.multiGet(KEYS));
    return {
      name: saved.get('@user_name')?.trim() || 'Student',
      yearLevel: saved.get('@user_year') || 'Freshman',
      studentId: saved.get('@user_id') || '',
      college: saved.get('@user_college') || '',
      course: saved.get('@user_course') || '',
    };
  },
  async save(profile: StudentProfile): Promise<StudentProfile> {
    const clean = {
      name: profile.name.trim(),
      yearLevel: profile.yearLevel,
      studentId: profile.studentId.trim(),
      college: profile.college.trim(),
      course: profile.course.trim(),
    };
    if (!clean.name || clean.name.length > 80)
      throw new Error('Enter your name, up to 80 characters.');
    if (!YEAR_LEVELS.includes(clean.yearLevel))
      throw new Error('Choose your year level.');
    await AsyncStorage.multiSet([
      ['@user_name', clean.name],
      ['@user_year', clean.yearLevel],
      ['@user_id', clean.studentId],
      ['@user_college', clean.college],
      ['@user_course', clean.course],
    ]);
    return clean;
  },
};
