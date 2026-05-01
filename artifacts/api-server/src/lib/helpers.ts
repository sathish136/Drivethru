export function calcWorkHours(inTime: string | null | undefined, outTime: string | null | undefined): number {
  if (!inTime || !outTime) return 0;
  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);
  const inMins = inH * 60 + inM;
  const outMins = outH * 60 + outM;
  let diff = outMins - inMins;
  if (diff < 0) diff += 24 * 60; // midnight crossover (night shift)
  return diff / 60;
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function today(): string {
  return formatDate(new Date());
}
