import {database} from '../../../core/database';
import {GradeRepository} from './GradeRepository';
export const gradeRepository = new GradeRepository(database);
