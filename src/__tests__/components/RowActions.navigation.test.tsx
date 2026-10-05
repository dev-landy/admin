import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, Button, ConfigProvider } from "antd";
import { RowActions } from "@/components/RowActions";

test("자동 초점 첫 메뉴의 Enter와 두 번째 항목의 여백 클릭은 각각 실제 링크를 활성화한다", async () => {
  const navigate = jest.fn();
  const capture = (event: MouseEvent) => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (anchor) { event.preventDefault(); navigate(anchor.getAttribute("href")); }
  };
  document.addEventListener("click", capture, true);
  try {
    render(<ConfigProvider theme={{ token: { motion: false } }}><App><RowActions subject="임차인 #30" primary={<Button>상세</Button>} items={[
      { key: "payments", label: "납부 내역", href: "/payments?tenantId=30" },
      { key: "alimtalk", label: "알림톡 내역", href: "/alimtalk?tab=history&tenantId=30" },
    ]} /></App></ConfigProvider>);
    fireEvent.click(screen.getByRole("button", { name: "임차인 #30 더보기" }));
    const first = await screen.findByRole("menuitem", { name: "납부 내역" });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first, { key: "Enter", code: "Enter", keyCode: 13 });
    expect(navigate).toHaveBeenLastCalledWith("/payments?tenantId=30");
    fireEvent.click(screen.getByRole("button", { name: "임차인 #30 더보기" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "알림톡 내역" }));
    expect(navigate).toHaveBeenLastCalledWith("/alimtalk?tab=history&tenantId=30");
    expect(navigate).toHaveBeenCalledTimes(2);
  } finally {
    document.removeEventListener("click", capture, true);
  }
});

test.each(["ctrlKey", "metaKey", "shiftKey"] as const)("메뉴 여백의 %s 클릭도 실제 링크에 modifier를 전달한다", async (modifier) => {
  const activated = jest.fn();
  const capture = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a")) { event.preventDefault(); activated(event[modifier], event.button); }
  };
  document.addEventListener("click", capture, true);
  try {
    render(<ConfigProvider theme={{ token: { motion: false } }}><App><RowActions subject="유저 #2" primary={<Button>상세</Button>} items={[{ key: "payments", label: "납부 내역", href: "/payments?userId=2" }]} /></App></ConfigProvider>);
    fireEvent.click(screen.getByRole("button", { name: "유저 #2 더보기" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "납부 내역" }), { [modifier]: true });
    expect(activated).toHaveBeenCalledTimes(1);
    expect(activated).toHaveBeenCalledWith(true, 0);
  } finally { document.removeEventListener("click", capture, true); }
});
