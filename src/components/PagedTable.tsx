import { Table, type TableColumnsType } from "antd";

type PagedTableProps<T> = {
  columns: TableColumnsType<T>;
  dataSource: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  rowKey: keyof T | ((record: T) => string);
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
}: PagedTableProps<T>) {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey as string | ((record: T) => string)}
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: onPageChange,
        showSizeChanger: true,
        pageSizeOptions: [20, 50, 100],
        showTotal: (t) => `총 ${t}건`,
      }}
      scroll={{ x: "max-content" }}
    />
  );
}
