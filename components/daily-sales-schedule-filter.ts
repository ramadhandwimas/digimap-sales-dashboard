export type DailyScheduleStaff = {
  targets?: { amount?: number };
};

export function onlyScheduledDailyStaff<T extends DailyScheduleStaff>(rows: T[] | null | undefined): T[] {
  return (rows || []).filter((row) => Number(row.targets?.amount || 0) > 0);
}
