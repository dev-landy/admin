"use client";

import type { RetentionRange } from "../retention-range";
import { useState } from "react";
import { Alert, Card, Col, Empty, Progress, Row, Segmented, Space, Statistic, Switch, Table, Tag, Typography } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { useDashboard } from "../hooks";
import { LiveDashboard } from "./LiveDashboard";
import styles from "./DashboardHome.module.css";

const { Text, Paragraph, Title } = Typography;
const activity = {
  "전체": [210, 250, 300, 342],
  "정보 관리": [180, 218, 256, 290],
  "수납 관리": [110, 145, 188, 224],
};
const periods = ["7.12", "8.12", "9.12", "10.12"];
const metrics = [
  { title: "로그인 사용자", value: 128, suffix: "명", description: "직전 30일 대비 +18명" },
  { title: "로그인 후 계약 등록률", value: 62.5, suffix: "%", description: "60 / 96명 · 기간 내 첫 로그인 후 7일 관찰 완료" },
  { title: "활성 임대인 · MAU", value: 342, suffix: "명", description: "직전 30일 대비 +42명" },
  { title: "다음 주 유지율", value: 68.4, suffix: "%", description: "9.28 주 → 10.5 주 · 171 / 250명" },
];
const cohorts = [
  { week: "2026-09-14", users: 80, values: [100, 65, 60, 55] },
  { week: "2026-09-21", users: 100, values: [100, 68, 62, 58] },
  { week: "2026-09-28", users: 120, values: [100, 70, "집계 중", "—"] },
  { week: "2026-10-05", users: 140, values: [100, "집계 중", "—", "—"] },
];
const campaigns = [
  { name: "브랜드 검색", cost: 120000, conversions: 15, cpa: 8000 },
  { name: "임대 관리 검색", cost: 360000, conversions: 25, cpa: 14400 },
];
const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;
function Pending({ source }: { source: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${source} 연결 후 표시됩니다.`} />;
}

export function DashboardHome() {
  const [sample, setSample] = useState(false);
  const [series, setSeries] = useState<keyof typeof activity>("전체");
  const [range, setRange] = useState<RetentionRange>();
  const queries = useDashboard(!sample, range);
  if (!sample) return <LiveDashboard range={range} onRangeChange={setRange} queries={queries} onSample={() => setSample(true)} />;
  return <div className={styles.home}>
    <PageHeader title="홈" description="임대인이 관리를 시작하고, 다음 주에도 Landy를 사용하는지 확인합니다." extra={<Space><Text>예시 데이터 보기</Text><Switch aria-label="예시 데이터 보기" checked={sample} onChange={setSample} /></Space>} />
    <Alert showIcon type={sample ? "warning" : "info"} title={sample ? "실제 운영 수치가 아닌 예시 데이터입니다." : "데이터 연결 대기"} description={sample ? "화면 구성을 확인하기 위한 고정 예시입니다. PostHog·Google Ads의 실제 집계 결과가 아닙니다." : "PostHog·Google Ads 집계가 아직 연결되지 않았습니다. 연결 전 수치는 0 대신 미집계로 표시합니다."} />
    <div className={styles.period}><Space wrap><Tag>{sample ? "예시 기간" : "집계 기준"}</Tag><Text>{sample ? "2026.09.13 – 2026.10.12" : "최근 30일 · 오늘 제외"}</Text><Text type="secondary">KST · 주간 유지율은 월요일–일요일, 완료된 두 주 기준</Text></Space></div>
    <Row gutter={[16, 16]}>{metrics.map(metric => <Col xs={24} sm={12} xl={6} key={metric.title}><Card className={styles.metric}><Statistic title={metric.title} value={sample ? metric.value : "—"} suffix={sample ? metric.suffix : undefined} /><Text type="secondary">{sample ? metric.description : "미집계"}</Text></Card></Col>)}</Row>
    <Row gutter={[20, 20]}>
      <Col xs={24} xl={12}><Card title="실제로 관리하는 임대인" className={styles.panel}>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Segmented aria-label="활동 기준" options={Object.keys(activity)} value={series} onChange={value => setSeries(value as keyof typeof activity)} />
          <Text type="secondary">각 기준일의 최근 30일 고유 유저 · 명</Text>
          {sample ? <div aria-live="polite" aria-label={`${series} 활동 추세`}>{activity[series].map((value, index) => <div className={styles.bar} key={periods[index]}><Text>{periods[index]}</Text><Progress percent={value / 4} showInfo={false} strokeColor="var(--admin-primary-fill)" aria-label={`${periods[index]} ${value}명`} /><Text>{value}명</Text></div>)}</div> : <Pending source="PostHog" />}
        </Space>
      </Card></Col>
      <Col xs={24} xl={12}><Card title="로그인 후 관리 전환" className={styles.panel}>
        <Paragraph type="secondary">{sample ? "9.13 – 10.12 로그인 사용자" : "기간 내 로그인 사용자"} · 기간 내 첫 로그인 후 7일 이내</Paragraph>
        {sample ? [["로그인 성공", 120, 100], ["계약·세입자 등록 완료", 75, 62.5], ["등록 후 수납·미납 현황 확인", 48, 40]].map(([label, count, percent]) => <div key={label} className={styles.step}><div className={styles.stepLabel}><Text>{label}</Text><Text>{count}명 · {percent}%</Text></div><Progress percent={Number(percent)} showInfo={false} strokeColor="var(--admin-primary-fill)" /></div>) : <Pending source="PostHog" />}
        <Text type="secondary">수납 확인은 정보 관리 이용자의 필수 성공 조건이 아닙니다.</Text>
      </Card></Col>
    </Row>
    <Card title="다음 주에도 사용하고 있나요?" extra={<Tag>주간 리텐션</Tag>}>
      <Paragraph type="secondary">첫 핵심 활동 주별로, 같은 유저가 이후 각 주에도 핵심 활동을 한 비율입니다.</Paragraph>
      {sample ? <Table rowKey="week" pagination={false} size="middle" scroll={{ x: 620 }} dataSource={cohorts} columns={[
        { title: "첫 활동 주", dataIndex: "week" }, { title: "임대인", dataIndex: "users", render: value => `${value}명` },
        ...["시작 주", "1주 후", "2주 후", "3주 후"].map((title, index) => ({ title, key: title, render: (_: unknown, row: typeof cohorts[number]) => { const value = row.values[index]; return typeof value === "number" ? <span className={styles.heat} style={{ background: `color-mix(in srgb, var(--admin-primary-fill) ${value / 4}%, var(--admin-surface))` }}>{value}%</span> : <Text type="secondary">{value}</Text>; } })),
      ]} /> : <Pending source="PostHog" />}
      <Paragraph type="secondary" className={styles.footnote}>진행 중인 주은 ‘집계 중’, 아직 시작되지 않은 주은 ‘—’로 표시합니다.</Paragraph>
    </Card>
    <Card title="광고가 가입으로 이어지나요?" extra={<Tag>Google Ads</Tag>}>
      {sample ? <><div className={styles.adStats}><Statistic title="광고비" value={480000} prefix="₩" /><Statistic title="가입 전환" value={40} suffix="건" /><Statistic title="가입 CPA" value={12000} prefix="₩" /></div><Table rowKey="name" pagination={false} scroll={{ x: 520 }} dataSource={campaigns} columns={[{ title: "캠페인", dataIndex: "name" }, { title: "광고비", dataIndex: "cost", align: "right", render: won }, { title: "가입 전환", dataIndex: "conversions", align: "right", render: value => `${value}건` }, { title: "가입 CPA", dataIndex: "cpa", align: "right", render: won }]} /></> : <Pending source="Google Ads" />}
      <Paragraph type="secondary" className={styles.footnote}>Google Ads 귀속 기준이며 최근 전환은 지연 반영될 수 있습니다.</Paragraph>
    </Card>
    <details className={styles.definitions}><summary>지표 정의와 집계 기준</summary><Title level={5}>활성 임대인</Title><Paragraph>계약·세입자 상세 조회·등록·수정 또는 수납·미납 현황 조회·처리 유저를 중복 없이 집계합니다. 자동 화면 노출·백그라운드 이벤트·내부 계정은 제외합니다.</Paragraph><Title level={5}>로그인 후 계약 등록률</Title><Paragraph>기간 내 첫 로그인 후 7일 내 계약·세입자 등록을 완료한 비율입니다. 기간 내 첫 로그인 후 7일이 지나지 않은 유저는 분모에서 제외합니다.</Paragraph><Title level={5}>주간 유지율과 리텐션 표</Title><Paragraph>상단 유지율은 지지난주 전체 핵심 활동 유저 기준입니다. 표는 최초 핵심 활동 주별 신규 집단을 추적하므로 서로 다른 지표입니다.</Paragraph></details>
  </div>;
}
