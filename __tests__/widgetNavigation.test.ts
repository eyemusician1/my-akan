import {beforeEach, expect, it, jest} from '@jest/globals';
import {notificationNavigation as navigation} from '../src/core/notifications/notificationNavigation';
import {
  queueWidgetOpen,
  flushWidgetOpen,
} from '../src/core/widgets/widgetNavigation';
import {ADD_SCHEDULE_URI, SCHEDULE_URI} from '../src/widgets/scheduleData';
jest.mock('../src/core/notifications/notificationNavigation', () => ({
  notificationNavigation: {
    isReady: jest.fn(() => true),
    getCurrentRoute: jest.fn(() => ({name: 'Home'})),
    navigate: jest.fn(),
    dispatch: jest.fn(),
  },
}));
jest.mock('@react-navigation/native', () => ({
  StackActions: {
    push: (name: string) => ({type: 'PUSH', payload: {name}}),
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(navigation.isReady).mockReturnValue(true);
  jest
    .mocked(navigation.getCurrentRoute)
    .mockReturnValue({key: 'home', name: 'Home'});
});
it('opens manual entry exactly once after a cold-start navigation container is ready', () => {
  jest.mocked(navigation.isReady).mockReturnValue(false);
  queueWidgetOpen(ADD_SCHEDULE_URI);
  flushWidgetOpen();
  expect(navigation.dispatch).not.toHaveBeenCalled();
  jest.mocked(navigation.isReady).mockReturnValue(true);
  flushWidgetOpen();
  flushWidgetOpen();
  expect(navigation.dispatch).toHaveBeenCalledTimes(1);
  expect(navigation.dispatch).toHaveBeenCalledWith({
    type: 'PUSH',
    payload: {name: 'ManualEntry'},
  });
});
it('opens the schedule tab for agenda taps and ignores unrelated links', () => {
  queueWidgetOpen(SCHEDULE_URI);
  flushWidgetOpen();
  expect(navigation.navigate).toHaveBeenCalledWith('Home', {tab: 'Schedules'});
  queueWidgetOpen('trakn://home/add?editSubjectId=anything');
  flushWidgetOpen();
  queueWidgetOpen('https://example.com');
  flushWidgetOpen();
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  expect(navigation.dispatch).not.toHaveBeenCalled();
});
it('does not bypass onboarding or reopen a consumed widget action later', () => {
  jest
    .mocked(navigation.getCurrentRoute)
    .mockReturnValue({key: 'welcome', name: 'Welcome'});
  queueWidgetOpen(ADD_SCHEDULE_URI);
  flushWidgetOpen();
  jest
    .mocked(navigation.getCurrentRoute)
    .mockReturnValue({key: 'home', name: 'Home'});
  flushWidgetOpen();
  expect(navigation.dispatch).not.toHaveBeenCalled();
});
it('preserves a manual draft, but starts a new subject when currently editing an existing class', () => {
  jest
    .mocked(navigation.getCurrentRoute)
    .mockReturnValue({key: 'manual', name: 'ManualEntry'});
  queueWidgetOpen(ADD_SCHEDULE_URI);
  flushWidgetOpen();
  expect(navigation.dispatch).not.toHaveBeenCalled();
  jest
    .mocked(navigation.getCurrentRoute)
    .mockReturnValue({
      key: 'edit',
      name: 'ManualEntry',
      params: {editSubjectId: 'old'},
    });
  queueWidgetOpen(ADD_SCHEDULE_URI);
  flushWidgetOpen();
  expect(navigation.dispatch).toHaveBeenCalledTimes(1);
});
