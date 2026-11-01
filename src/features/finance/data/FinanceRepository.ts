import {Database} from '@nozbe/watermelondb';
import Expense from '../../../core/database/models/Expense';
import Due from '../../../core/database/models/Due';
import {isValidAmount, toCents} from '../domain/money';
import {ExpenseCategory} from '../domain/types';

export class FinanceRepository {
  constructor(private readonly database: Database) {}

  async addExpense(title: string, amount: number, category: ExpenseCategory) {
    this.validateAmount(amount);
    return this.database.write(() =>
      this.database.get<Expense>('expenses').create(expense => {
        expense.title = title.trim() || category.name;
        expense.amount = toCents(amount) / 100;
        expense.category = category.id;
        expense.icon = category.icon;
      }),
    );
  }

  async addDue(title: string, amount: number) {
    this.validateAmount(amount);
    if (!title.trim()) throw new Error('Enter a fee name.');
    return this.database.write(() =>
      this.database.get<Due>('dues').create(due => {
        due.title = title.trim();
        due.amount = toCents(amount) / 100;
        due.isPaid = false;
      }),
    );
  }

  async toggleDue(id: string) {
    await this.database.write(async () => {
      const due = await this.database.get<Due>('dues').find(id);
      await due.update(record => {
        record.isPaid = !record.isPaid;
      });
    });
  }

  async deleteExpense(id: string) {
    await this.database.write(async () => {
      const expense = await this.database.get<Expense>('expenses').find(id);
      await expense.destroyPermanently();
    });
  }

  async deleteDue(id: string) {
    await this.database.write(async () => {
      const due = await this.database.get<Due>('dues').find(id);
      await due.destroyPermanently();
    });
  }

  private validateAmount(amount: number) {
    if (!isValidAmount(amount))
      throw new Error(
        'Enter an amount greater than ₱0 with up to two decimal places.',
      );
  }
}
