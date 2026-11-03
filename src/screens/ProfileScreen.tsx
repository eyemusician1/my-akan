import withObservables from '@nozbe/with-observables';
import {Q} from '@nozbe/watermelondb';
import {of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {database} from '../core/database';
import type Schedule from '../core/database/models/Schedule';
import {ProfileContent} from '../features/profile/components/ProfileContent';

export const ProfileScreen = withObservables([], () => {
  const schedules = database.get<Schedule>('schedules').query(Q.sortBy('created_at', Q.desc), Q.take(1)).observeWithColumns(['academic_term']);
  return {schedules, subjects: schedules.pipe(switchMap(records => records[0] ? records[0].subjects.observeWithColumns(['units']) : of([])))};
})(ProfileContent);
