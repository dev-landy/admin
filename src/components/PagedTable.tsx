"use client";

import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Empty, Pagination, Spin, Table, type TableColumnsType, type TableProps } from "antd";
import { useAdminViewport } from "./useAdminViewport";
import { RecordActionScope } from "./RecordActionScope";
import { NativeSelect } from "./NativeSelect";
import { ListSortSelect, type ListSortControl } from "./ListSortSelect";
import { allocateColumnWidths, type ColumnSizing, type ColumnWidthSpec } from "@/lib/table/column-widths";

type PagedTableProps<T> = {
  columns: TableColumnsType<T>;
  compactColumns?: TableColumnsType<T>;
  columnSizing?: Readonly<Record<string, ColumnSizing>>;
  renderCard?: (record: T, index: number) => ReactNode;
  renderCompactDetails?: (record: T) => ReactNode;
  dataSource: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  rowKey: keyof T | ((record: T) => string);
  onRow?: TableProps<T>["onRow"];
  emptyText?: ReactNode;
  ariaLabel?: string;
  sortControl?: ListSortControl;
};

export function PagedTable<T extends object>({
  columns, compactColumns, columnSizing, renderCard, renderCompactDetails, dataSource, loading,
  page, pageSize, total, onPageChange, rowKey, onRow, sortControl,
  emptyText = "조회된 내역이 없습니다.", ariaLabel = "조회 결과 목록",
}: PagedTableProps<T>) {
  const viewport = useAdminViewport();
  const [availableWidth, setAvailableWidth] = useState<number>();
  const specifications = useCallback((source: TableColumnsType<T>): ColumnWidthSpec[] => source.map((column, index) => {
    const dataIndex = "dataIndex" in column ? column.dataIndex : undefined;
    const key = String(column.key ?? (Array.isArray(dataIndex) ? dataIndex.join(".") : dataIndex) ?? index);
    const sizing = columnSizing?.[key];
    const min = Math.max(1, sizing?.min ?? (typeof column.width === "number" ? column.width : 160));
    return { min, preferred: Math.max(min, sizing?.preferred ?? min), grow: Math.max(0, sizing?.grow ?? 0) };
  }), [columnSizing]);
  const wideWidth = specifications(columns).reduce((width, column) => width + column.min, 0);
  const display = viewport === "mobile" || (availableWidth !== undefined && availableWidth > 0 && availableWidth < 760) ? "mobile"
    : viewport === "wide" && compactColumns && availableWidth !== undefined && availableWidth < wideWidth ? "compact" : viewport;
  const cards = display === "mobile" && renderCard;
  const layoutRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const dialogs = useRef(new Map<string, { destroy: () => void }>());
  const [completedHeight, setCompletedHeight] = useState<number>();
  const [horizontalOverflow, setHorizontalOverflow] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const detailsIdPrefix = useId();
  const rowGuideId = `${detailsIdPrefix}-row-guide`;
  const keyOf = useCallback((record: T) => String(typeof rowKey === "function" ? rowKey(record) : record[rowKey]), [rowKey]);
  const detailsIdOf = useCallback((record: T) => `${detailsIdPrefix}-details-${encodeURIComponent(keyOf(record))}`, [detailsIdPrefix, keyOf]);
  const register = useCallback((key: string, dialog: { destroy: () => void }) => {
    dialogs.current.get(key)?.destroy();
    dialogs.current.set(key, dialog);
    return () => { if (dialogs.current.get(key) === dialog) dialogs.current.delete(key); };
  }, []);
  // A display-mode change must not dismiss an in-flight confirmation. The
  // collection, rather than its card/row renderer, owns the dialog lifetime.
  useEffect(() => {
    if (loading) return;
    const keys = new Set(dataSource.map(keyOf));
    for (const [key, dialog] of dialogs.current) {
      if (!keys.has(key)) { dialog.destroy(); dialogs.current.delete(key); }
    }
  }, [dataSource, keyOf, loading]);
  useEffect(() => {
    const handles = dialogs.current;
    return () => { handles.forEach((dialog) => dialog.destroy()); handles.clear(); };
  }, []);
  const activeColumns = display === "compact" && compactColumns ? compactColumns : columns;
  const hasCompactDetails = display === "compact" && Boolean(renderCompactDetails);
  const columnSpecs = useMemo(() => specifications(activeColumns), [activeColumns, specifications]);
  const allocation = useMemo(() => allocateColumnWidths(availableWidth ?? wideWidth, columnSpecs), [availableWidth, wideWidth, columnSpecs]);
  const tableWidth = allocation.total;
  const scopedColumns = useMemo(() => activeColumns.map((column, columnIndex) => {
    const actionColumn = column.key === "action" || column.key === "actions";
    const numericColumn = column.className?.split(/\s+/).includes("admin-numeric");
    const aligned = actionColumn
      ? { ...column, align: "center" as const, className: [column.className, "admin-table-actions"].filter(Boolean).join(" ") }
      : numericColumn ? { ...column, align: "right" as const } : column;
    const fitted = { ...aligned, width: allocation.widths[columnIndex] };
    const render = "render" in column ? column.render : undefined;
    if (!render) return fitted;
    return { ...fitted, render: (value: unknown, record: T, index: number) => {
      const result = render(value, record, index);
      const recordKey = keyOf(record);
      return <RecordActionScope value={{ recordKey, register }}>{result as ReactNode}</RecordActionScope>;
    } };
  }), [activeColumns, keyOf, register, allocation.widths]);

  const toggleDetails = (record: T) => {
    const recordKey = keyOf(record);
    setExpandedRowKeys((keys) => keys.includes(recordKey) ? keys.filter((key) => key !== recordKey) : [...keys, recordKey]);
  };
  const mergedOnRow: TableProps<T>["onRow"] = (record, index) => {
    const original = onRow?.(record, index);
    if (!hasCompactDetails) return original ?? {};
    const expanded = expandedRowKeys.includes(keyOf(record));
    const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(
      'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [role="textbox"], [role="slider"], [role="menuitem"], [role="menuitemradio"], [contenteditable]:not([contenteditable="false"])',
    ));
    return {
      ...original,
      className: [original?.className, "admin-table-clickable-row", expanded && "admin-table-row-expanded"].filter(Boolean).join(" "),
      tabIndex: 0,
      "aria-expanded": expanded,
      "aria-controls": expanded ? detailsIdOf(record) : undefined,
      "aria-describedby": [original?.["aria-describedby"], rowGuideId].filter(Boolean).join(" "),
      onClick: (event) => {
        if (event.defaultPrevented || isControl(event.target)) return;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0 && selection.getRangeAt(0).intersectsNode(event.currentTarget)) return;
        toggleDetails(record);
      },
      onKeyDown: (event) => {
        if (event.target !== event.currentTarget || event.defaultPrevented || isControl(event.target)) return;
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleDetails(record); }
        else original?.onKeyDown?.(event);
      },
    };
  };

  useLayoutEffect(() => {
    const region = tableRef.current;
    const layout = layoutRef.current;
    if (!region || !layout) return;
    const measure = () => {
      const bounds = region.getBoundingClientRect();
      const width = layout.getBoundingClientRect().width;
      if (width > 0) setAvailableWidth(width);
      if (loading) return;
      const height = bounds.height;
      if (height > 0) setCompletedHeight(height);
      const content = region.querySelector<HTMLElement>(".ant-table-content");
      setHorizontalOverflow(Boolean(content && content.scrollWidth > content.clientWidth + 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout);
    observer.observe(region);
    return () => observer.disconnect();
  }, [dataSource, loading, tableWidth, display]);

  return <div ref={layoutRef} className="admin-table-layout"><div ref={tableRef} className={`admin-table-region admin-collection-${display}`} data-viewport={display}
    role="region" aria-label={horizontalOverflow && !cards ? `${ariaLabel}. 좌우 방향키로 나머지 열을 볼 수 있습니다.` : ariaLabel}
    aria-busy={loading} style={{ width: !cards && tableWidth > 0 ? tableWidth : undefined, minHeight: loading ? completedHeight : undefined }} tabIndex={horizontalOverflow && !cards ? 0 : undefined}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const content = tableRef.current?.querySelector<HTMLElement>(".ant-table-content");
      if (content && content.scrollWidth > content.clientWidth) {
        event.preventDefault(); content.scrollLeft += event.key === "ArrowRight" ? 160 : -160;
      }
    }}>
    <div className="admin-results-heading">
      <span aria-live="polite" aria-atomic="true">{loading ? "조회 중…" : `조회 결과 ${total.toLocaleString("ko-KR")}건`}</span>
      {sortControl && <ListSortSelect {...sortControl} label={ariaLabel} />}
      {!loading && total > 0 && page <= Math.ceil(total / pageSize) && <span className="admin-results-range">{((page - 1) * pageSize + 1).toLocaleString("ko-KR")}–{Math.min(page * pageSize, total).toLocaleString("ko-KR")}번째 · {page}페이지</span>}
      {!cards && horizontalOverflow && <span className="admin-results-scroll-hint">표 안에서 좌우로 이동하면 나머지 열을 볼 수 있습니다.</span>}
    </div>
    {hasCompactDetails && <span id={rowGuideId} className="admin-visually-hidden">행을 클릭하거나 Enter 또는 Space 키를 눌러 추가 정보를 펼치거나 접을 수 있습니다. 링크와 작업 버튼은 각각의 기능을 실행합니다.</span>}
    {cards ? <div className="admin-record-list">
      {loading ? <div className="admin-collection-loading" role="status"><Spin />목록을 불러오는 중입니다.</div>
        : dataSource.length ? dataSource.map((record, index) => <RecordActionScope key={keyOf(record)} value={{ recordKey: keyOf(record), register }}>{renderCard(record, index)}</RecordActionScope>)
        : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />}
    </div> : <Table columns={scopedColumns} dataSource={loading ? [] : dataSource} loading={loading}
      rowKey={keyOf} onRow={mergedOnRow}
      locale={{ expand: "추가 정보 펼치기", collapse: "추가 정보 접기", emptyText: loading ? <span role="status">목록을 불러오는 중입니다.</span> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /> }}
      pagination={false} tableLayout="fixed" scroll={display === "compact" ? undefined : { x: tableWidth }}
      expandable={hasCompactDetails && renderCompactDetails ? {
        expandedRowKeys,
        expandedRowRender: (record) => <RecordActionScope value={{ recordKey: keyOf(record), register }}><div id={detailsIdOf(record)} className="admin-table-expanded-details">{renderCompactDetails(record)}</div></RecordActionScope>,
        expandRowByClick: false,
        showExpandColumn: false,
      } : undefined}
    />}
    {(loading || total > 0) && <nav className={`admin-pagination-bar${loading ? " admin-pagination-loading" : ""}`} aria-label={`${ariaLabel} 페이지 이동`}>
      <span className="admin-pagination-total">{loading ? "조회 중..." : `총 ${total.toLocaleString("ko-KR")}건`}</span>
      <label className="admin-page-size"><span className="admin-page-size-label">한 번에</span><NativeSelect aria-label={`${ariaLabel} 페이지당 항목 수`} value={pageSize} disabled={loading} onChange={(event) => onPageChange(1, Number(event.target.value))}>
        {[...new Set([20, 50, 100, pageSize])].sort((a, b) => a - b).map((size) => <option key={size} value={size}>{size}개</option>)}
      </NativeSelect></label>
      {(loading || total > 0) && <Pagination current={page} pageSize={pageSize} total={loading ? Math.max(total, page * pageSize) : total} disabled={loading} showSizeChanger={false}
        simple={display === "mobile"} showLessItems={display === "compact"} showQuickJumper={display !== "mobile"}
        onChange={(nextPage) => onPageChange(nextPage, pageSize)}
        itemRender={(_page, type, node) => (type === "prev" || type === "next") && isValidElement<{ "aria-label"?: string }>(node) ? cloneElement(node, { "aria-label": type === "prev" ? "이전 페이지" : "다음 페이지" }) : node}
        locale={{ prev_page: "이전 페이지", next_page: "다음 페이지", prev_5: "이전 5페이지", next_5: "다음 5페이지", prev_3: "이전 3페이지", next_3: "다음 3페이지", jump_to: "이동", jump_to_confirm: "확인", page: "페이지" }}
      />}
    </nav>}
  </div></div>;
}
