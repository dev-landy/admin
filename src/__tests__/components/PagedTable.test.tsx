import { render, screen } from "@testing-library/react";
import { PagedTable } from "@/components/PagedTable";

// Ant Design uses ResizeObserver internally — polyfill for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement getComputedStyle — stub to prevent jest-jsdom from
// re-throwing the "not implemented" error through VirtualConsole
window.getComputedStyle = (): CSSStyleDeclaration =>
  ({ width: "0px", height: "0px", overflow: "hidden" } as unknown as CSSStyleDeclaration);

// antd Table uses matchMedia for responsive breakpoints
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const columns = [
  { title: "ID", dataIndex: "id", key: "id" },
  { title: "Name", dataIndex: "name", key: "name" },
];

const data = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

test("renders table rows", () => {
  render(
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={false}
      page={1}
      pageSize={20}
      total={2}
      onPageChange={() => {}}
      rowKey={(r) => String(r.id)}
    />,
  );
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("Bob")).toBeInTheDocument();
});

test("shows total count in Korean", () => {
  render(
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={false}
      page={1}
      pageSize={20}
      total={42}
      onPageChange={() => {}}
      rowKey={(r) => String(r.id)}
    />,
  );
  expect(screen.getByText("총 42건")).toBeInTheDocument();
});
