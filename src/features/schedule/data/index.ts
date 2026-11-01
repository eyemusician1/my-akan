import {database} from '../../../core/database';
import {ScheduleRepository} from './ScheduleRepository';

export const scheduleRepository = new ScheduleRepository(database);
