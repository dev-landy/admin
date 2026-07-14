const WON_PER_MANWON = 10_000;

export function formatManwon(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) {
    return "-";
  }

  return `${(amount / WON_PER_MANWON).toLocaleString("ko-KR", {
    maximumFractionDigits: 4,
  })}만원`;
}

export function wonToManwon(amount: number | null | undefined): number | undefined {
  if (amount == null || Number.isNaN(amount)) {
    return undefined;
  }

  return amount / WON_PER_MANWON;
}

export function manwonToWon(amount: number): number {
  return Math.round(amount * WON_PER_MANWON);
}
