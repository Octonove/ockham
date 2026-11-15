import { formatDuration } from '../shared/duration.js';

/** The line under a meeting in the calendar: its title and how long it lasts. Its times are Dates. */
export function meetingLine(meeting) {
  return `${meeting.title} · ${formatDuration((meeting.end - meeting.start) / 1000)}`;
}
