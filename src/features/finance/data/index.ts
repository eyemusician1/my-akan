import {database} from '../../../core/database';
import {FinanceRepository} from './FinanceRepository';

export const financeRepository = new FinanceRepository(database);
