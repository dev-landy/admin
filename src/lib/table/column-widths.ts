export type ColumnSizing = { min?: number; preferred?: number; grow?: number };
export type ColumnWidthSpec = { min: number; preferred: number; grow: number };

/** Fill the table, first meeting useful widths and then sharing surplus across content. */
export function allocateColumnWidths(available: number, columns: readonly ColumnWidthSpec[]) {
  const widths = columns.map(({ min }) => min);
  let remaining = Math.max(0, available - widths.reduce((sum, width) => sum + width, 0));
  let candidates = columns.map((column, index) => ({ ...column, index }))
    .filter(({ min, preferred, grow }) => grow > 0 && preferred > min);

  while (remaining > 0.01 && candidates.length) {
    const totalWeight = candidates.reduce((sum, { grow }) => sum + grow, 0);
    let consumed = 0;
    for (const { index, preferred, grow } of candidates) {
      const addition = Math.min(preferred - widths[index], remaining * grow / totalWeight);
      widths[index] += addition;
      consumed += addition;
    }
    remaining -= consumed;
    candidates = candidates.filter(({ index, preferred }) => preferred - widths[index] > 0.01);
  }
  if (remaining > 0 && columns.length) {
    const flexible = columns.map(({ grow }, index) => ({ grow, index })).filter(({ grow }) => grow > 0);
    const recipients = flexible.length ? flexible : columns.map((_, index) => ({ index, grow: 1 }));
    const weight = recipients.reduce((sum, { grow }) => sum + grow, 0);
    for (const { index, grow } of recipients) widths[index] += remaining * grow / weight;
  }
  return { widths, total: widths.reduce((sum, width) => sum + width, 0) };
}
