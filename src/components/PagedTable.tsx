"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Empty, Table, type TableColumnsType, type TableProps } from "antd";

type PagedTableProps<T> = {
  columns: TableColumnsType<T>;
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
};

export function PagedTable<T extends object>({
  columns,
  dataSource,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  rowKey,
  onRow,
  emptyText = "조회된 내역이 없습니다.",
  ariaLabel = "조회 결과 목록",
}: PagedTableProps<T>) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [completedHeight, setCompletedHeight] = useState<number>();

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table || loading) return;

    const measure = () => {
      const height = table.getBoundingClientRect().height;
      if (height > 0) setCompletedHeight(height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, [dataSource, loading]);

  return (
    <div
      ref={tableRef}
      className="admin-table-region"
      role="region"
      aria-label={`${ariaLabel}. 열이 많으면 좌우 방향키로 이동할 수 있습니다.`}
      aria-busy={loading}
      style={{ minHeight: loading ? completedHeight : undefined }}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        const content = tableRef.current?.querySelector<HTMLElement>(".ant-table-content");
        if (content && content.scrollWidth > content.clientWidth) {
          event.preventDefault();
          content.scrollLeft += event.key === "ArrowRight" ? 160 : -160;
        }
      }}
    >
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey as string | ((record: T) => string)}
      onRow={onRow}
      locale={{ emptyText: loading ? <span role="status">목록을 불러오는 중입니다.</span> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} /> }}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: (nextPage, nextSize) => onPageChange(nextSize !== pageSize ? 1 : nextPage, nextSize),
        responsive: true,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100],
        showTotal: (t) => loading ? "조회 중..." : `총 ${t}건`,
      }}
      scroll={{ x: "max-content" }}
    />
    </div>
  );
}
