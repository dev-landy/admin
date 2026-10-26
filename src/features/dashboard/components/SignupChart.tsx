"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./SignupChart.module.css";

type SignupPoint = { date: string; count: number };

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const numberFormat = new Intl.NumberFormat("ko-KR");

function weekday(date: string) {
  return weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export function SignupChart({ points, today }: { points: SignupPoint[]; today: string }) {
  const period = `${points[0]?.date ?? ""}/${points.at(-1)?.date ?? ""}`;
  const [selection, setSelection] = useState({ period, date: points.at(-1)?.date, inspecting: false });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipId = useId();
  const selected = (selection.period === period ? points.find(point => point.date === selection.date) : undefined) ?? points.at(-1);

  if (!selected) return <p className={styles.empty}>표시할 가입 데이터가 없습니다.</p>;

  const maximum = Math.max(...points.map(point => point.count));
  const ceiling = Math.max(2, Math.ceil(maximum / 2) * 2);
  const selectedIndex = points.indexOf(selected);
  const inspecting = selection.period === period && selection.inspecting;
  const select = (date: string) => setSelection({ period, date, inspecting: true });
  const dismissTooltip = () => setSelection(current => ({ ...current, inspecting: false }));
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dismissTooltip();
      return;
    }
    const nextIndex = event.key === "ArrowRight" ? Math.min(index + 1, points.length - 1)
      : event.key === "ArrowLeft" ? Math.max(index - 1, 0)
      : event.key === "Home" ? 0
      : event.key === "End" ? points.length - 1 : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    select(points[nextIndex].date);
    buttons.current[nextIndex]?.focus();
  };

  return <figure className={styles.chart} aria-label="일별 신규 가입자 추이">
    <div className={styles.detail} role="status" aria-live="polite" aria-atomic="true">
      <div className={styles.selectedDate}>
        <time dateTime={selected.date}>{selected.date.replaceAll("-", ".")} ({weekday(selected.date)})</time>
        {selected.date === today && <span className={styles.ongoing}>오늘 · 집계 중</span>}
      </div>
      <div className={styles.selectedValue}>
        <strong key={`${selected.date}/${selected.count}`} className={styles.valueMotion}>{numberFormat.format(selected.count)}<span className={styles.unit}>명</span></strong>
        <span className={styles.metricLabel}>신규 가입</span>
      </div>
    </div>

    <div className={styles.plot}>
      <div className={styles.scale} aria-hidden="true">
        <span>{numberFormat.format(ceiling)}</span>
        <span>{numberFormat.format(ceiling / 2)}</span>
        <span>0</span>
      </div>
      <div className={styles.graph} style={{
        "--day-count": points.length,
        "--active-index": selectedIndex,
      } as CSSProperties}>
        <div className={styles.gridLines} aria-hidden="true"><span /><span /><span /></div>
        <div className={styles.activeColumn} aria-hidden="true" />
        <div className={styles.columns} role="group" aria-label="날짜별 가입자 선택"
          onPointerLeave={event => { if (event.pointerType !== "touch") dismissTooltip(); }}
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) dismissTooltip(); }}>
          {points.map((point, index) => {
            const height = `${point.count / ceiling * 100}%`;
            const current = point.date === selected.date;
            const isToday = point.date === today;
            return <button
              type="button"
              key={point.date}
              ref={element => { buttons.current[index] = element; }}
              className={styles.day}
              aria-label={`${point.date} 신규 가입 ${numberFormat.format(point.count)}명${isToday ? " · 오늘 집계 중" : ""}`}
              aria-pressed={current}
              aria-describedby={current && inspecting ? tooltipId : undefined}
              data-inspecting={current && inspecting ? "true" : undefined}
              onPointerEnter={() => select(point.date)}
              onFocus={() => select(point.date)}
              onClick={() => select(point.date)}
              onKeyDown={event => navigate(event, index)}
              style={{ "--entrance-delay": `${index * 45}ms` } as CSSProperties}
            >
              <span className={styles.barTrack} aria-hidden="true">
                <span className={styles.barValue} style={{ bottom: `calc(${height} + 8px)` }}>{numberFormat.format(point.count)}</span>
                <span className={styles.bar} style={{ height }} />
              </span>
              <span className={styles.dayLabel} aria-hidden="true">
                <span>{Number(point.date.slice(5, 7))}.{Number(point.date.slice(8, 10))}</span>
                <span className={isToday ? styles.today : styles.weekday}>{isToday ? "오늘" : weekday(point.date)}</span>
              </span>
            </button>;
          })}
        </div>
        {inspecting && <div id={tooltipId} role="tooltip" className={styles.tooltip}>
          <span>{selected.date.replaceAll("-", ".")} ({weekday(selected.date)})</span>
          <strong>{numberFormat.format(selected.count)}명 <span>신규 가입</span></strong>
        </div>}
      </div>
    </div>

    <p className={styles.interactionHint}>마우스·터치로 확인 · ← → 키로 날짜 이동</p>

    {maximum === 0 && <figcaption className={styles.emptyPeriod}>이 기간에 신규 가입자가 없습니다.</figcaption>}
  </figure>;
}
