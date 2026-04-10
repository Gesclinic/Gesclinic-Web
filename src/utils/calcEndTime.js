export function calcEndTime(startTime, durationMin) {
  return new Date(new Date(startTime).getTime() + durationMin * 60000);
}
