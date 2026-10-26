"use client";
import { RetentionPeriod } from "./RetentionPeriod";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { SignupOverview } from "./SignupOverview";
import { signupQueryKey } from "../signup-query";
import type { RetentionRange } from "../retention-range";
import { useId, useState } from "react";
import { Alert, Button, Card, Col, Empty, Progress, Row, Segmented, Space, Statistic, Switch, Table, Tag, Typography } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { parseProblemDetail } from "@/lib/api/problem";
import type { useDashboard } from "../hooks";
import type { ActivitySeries, Cohort, SourceResult } from "../types";
import styles from "./DashboardHome.module.css";
const { Text, Paragraph, Title } = Typography;
function Status<T>({ title, result, error, loading }: { title: string; result?: SourceResult<T>; error: unknown; loading: boolean }) {
  const problem = error ? parseProblemDetail(error) : null;
  if (error) return <Alert showIcon type="error" title={`${title} 조회 실패`} description={problem?.detail || "관리자 조회 API에 연결하지 못했습니다. 서버 상태를 확인하고 다시 조회하세요."} />;
  if (result?.status === "error") return <Alert showIcon type="error" title={`${title} 연결 실패 · ${result.code}`} description={result.message} />;
  if (result?.status === "success") return <Text type="secondary">{title} · {loading ? "갱신 중" : "연결됨"} · {new Date(result.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</Text>;
  return <Text role="status">{title} {loading ? "불러오는 중…" : "조회 대기"}</Text>;
}
export function LiveDashboard({ queries, onSample, range, onRangeChange }: { range?: RetentionRange; onRangeChange: (range?: RetentionRange) => void; queries: ReturnType<typeof useDashboard>; onSample: () => void }) {
  const [series, setSeries] = useState<ActivitySeries>("전체");
  const queryClient = useQueryClient();
  const signupsFetching = useIsFetching({ queryKey: signupQueryKey }) > 0;
  const retentionFormId = useId();
  const { posthog, retention, activation, ads } = queries;
  const product = !posthog.error && posthog.data?.status === "success" ? posthog.data.data : undefined;
  const funnel = !activation.error && activation.data?.status === "success" ? activation.data.data : undefined;
  const retained = !retention.error && retention.data?.status === "success" ? retention.data.data : undefined;
  const advertising = !ads.error && ads.data?.status === "success" ? ads.data.data : undefined;
  const busy = signupsFetching || posthog.isFetching || retention.isFetching || activation.isFetching || ads.isFetching;
  const cards = [
    { title: "로그인 사용자", value: funnel?.logins, suffix: "명", note: "최근 30일 · 로그인 성공 사용자 · 중복 제외" },
    { title: "로그인 후 계약 등록률", value: funnel?.rate, suffix: "%", note: funnel ? `${funnel.registered} / ${funnel.eligible}명 · 관찰 중 ${funnel.pending}명 제외` : "기간 내 첫 로그인 후 7일 내 계약 등록" },
    { title: "활성 임대인 · MAU", value: product?.mau, suffix: "명", note: product ? `직전 30일 대비 ${product.mau - product.previousMau >= 0 ? "+" : ""}${product.mau - product.previousMau}명` : "PostHog 연결 후 집계" },
    { title: "다음 주 유지율", value: retained?.retention.rate, suffix: "%", note: retained ? `${retained.retention.from} → ${retained.retention.to} · ${retained.retention.returned} / ${retained.retention.base}명${retained.retention.base === 0 ? " · 기준 유저 없음" : ""}` : "완료된 두 주 기준" },
  ];
  const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("ko-KR", { style: "currency", currency: advertising?.currency || "KRW", maximumFractionDigits: 2 }).format(value);
  const points = product?.activity ?? [];
  const key = series === "정보 관리" ? "info" : series === "수납 관리" ? "rent" : "all";
  const maximum = Math.max(1, ...points.map(point => point[key]));
  return <div className={styles.home}>
    <PageHeader title="홈" description="임대인이 가입하고 관리를 시작해, 다음 주에도 Landy를 사용하는지 확인합니다." extra={<Space wrap><Button aria-label="전체 다시 조회" loading={busy} onClick={() => { void queryClient.invalidateQueries({ queryKey: signupQueryKey }); void posthog.refetch(); void retention.refetch(); void activation.refetch(); void ads.refetch(); }}>전체 다시 조회</Button><Text>예시 데이터 보기</Text><Switch aria-label="예시 데이터 보기" checked={false} onChange={onSample} /></Space>} />
    <SignupOverview />
    <div className={styles.sourceStatus} aria-live="polite"><Status title="PostHog" result={posthog.data} error={posthog.error} loading={posthog.isFetching} /><Status title="Google Ads" result={ads.data} error={ads.error} loading={ads.isFetching} /></div>
    <Space wrap><Tag>실제 데이터</Tag><Text>{product ? `${product.start} – ${product.end}` : "최근 30일 · 오늘 제외"}</Text><Text type="secondary">PostHog KST · 집계 결과 최대 5분 재사용 · 리텐션은 월요일–일요일 · 광고는 광고 계정 시간대</Text></Space>
    <Row gutter={[16, 16]}>{cards.map((metric, index) => <Col xs={24} sm={12} xl={6} key={metric.title}><Card className={styles.metric}><Statistic title={metric.title} loading={index === 3 ? retention.isLoading : index === 2 ? posthog.isLoading : activation.isLoading} value={metric.value ?? "—"} suffix={metric.value != null ? metric.suffix : undefined} /><Text type="secondary">{metric.note}</Text></Card></Col>)}</Row>
    <Row gutter={[20, 20]}><Col xs={24} xl={12}><Card title="실제로 관리하는 임대인" extra={<Button loading={posthog.isFetching} onClick={() => { void posthog.refetch(); }}>활동 다시 조회</Button>} className={styles.panel} loading={posthog.isLoading}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}><Segmented aria-label="활동 기준" options={["전체", "정보 관리", "수납 관리"]} value={series} onChange={value => setSeries(value as ActivitySeries)} /><Text type="secondary">각 기준일의 최근 30일 고유 유저 · 명</Text>
      {product ? <div aria-live="polite">{points.map(point => <div className={styles.bar} key={point.date}><Text>{point.date.slice(5).replace("-", ".")}</Text><Progress percent={point[key] / maximum * 100} showInfo={false} strokeColor="var(--admin-primary-fill)" aria-label={`${point.date} ${point[key]}명`} /><Text>{point[key]}명</Text></div>)}{product.mau === 0 && <Text type="secondary">최근 30일 동안 집계 기준에 맞는 활동이 없습니다. 아래 이벤트 기준과 수집 상태를 확인하세요.</Text>}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="PostHog 연결 오류를 확인하세요." />}</Space>
    </Card></Col><Col xs={24} xl={12}><Card title="로그인 후 관리 전환" className={styles.panel} extra={<Button loading={activation.isFetching} onClick={() => { void activation.refetch(); }}>전환 다시 조회</Button>}>
      <Status title="로그인 후 관리 전환" result={activation.data} error={activation.error} loading={activation.isFetching} />
      {funnel && <><Paragraph>{funnel.start} – {funnel.end} 로그인 사용자 · 기간 내 첫 로그인 후 7일 관찰 완료 기준</Paragraph>{[["로그인 성공", funnel.eligible], ["계약·세입자 등록", funnel.registered], ["등록 후 수납 현황 확인", funnel.viewed]].map(([label, count]) => <div key={label} className={styles.step}><Text>{label} · {count}명</Text><Progress percent={funnel.eligible ? Math.round(Number(count) / funnel.eligible * 1000) / 10 : 0} showInfo={funnel.eligible > 0} /></div>)}<Text type="secondary">관찰 중 {funnel.pending}명 제외{funnel.eligible === 0 ? " · 7일 관찰이 끝난 로그인 사용자가 아직 없습니다." : ""}</Text></>}
      <Paragraph type="secondary">기간 내 첫 로그인 → 계약 등록 → 수납 화면 조회 순서로, 로그인 후 7일 이내 행동을 집계합니다. 기존 사용자도 포함하며 신규 가입·생애 첫 계약 등록 지표가 아닙니다.</Paragraph>
    </Card></Col></Row>
    <Card title="다음 주에도 사용하고 있나요?" extra={<Space><Tag>주간 리텐션</Tag><Button loading={retention.isFetching} htmlType="submit" form={retentionFormId}>리텐션 다시 조회</Button></Space>}>
      <RetentionPeriod range={range} onChange={onRangeChange} formId={retentionFormId} loading={retention.isFetching} onRefresh={() => { void retention.refetch(); }} />
      <Status title="리텐션" result={retention.data} error={retention.error} loading={retention.isFetching} />
      {retained?.retentionRange && <Paragraph>조회 기간: {retained.retentionRange.start} – {retained.retentionRange.end}</Paragraph>}
      <Paragraph type="secondary">수집된 이력에서 첫 핵심 활동 주을 기준으로 이후 각 주의 재사용을 추적합니다.</Paragraph>
      {retained ? <Table<Cohort> rowKey="week" pagination={false} scroll={{ x: 620 }} dataSource={retained.cohorts} locale={{ emptyText: "완료된 주의 핵심 활동 유저가 없습니다." }} columns={[{ title: "첫 활동 주", dataIndex: "week" }, { title: "임대인", dataIndex: "users", render: value => `${value}명` }, ...["시작 주", "1주 후", "2주 후", "3주 후"].map((title, index) => ({ title, key: title, render: (_: unknown, row: Cohort) => typeof row.values[index] === "number" ? <span className={styles.heat} style={{ background: `color-mix(in srgb, var(--admin-primary-fill) ${Number(row.values[index]) / 4}%, var(--admin-surface))` }}>{row.values[index]}%</span> : <Text type="secondary">{row.values[index]}</Text> }))]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="PostHog 연결 후 표시됩니다." />}
      <Paragraph type="secondary" className={styles.footnote}>진행 중인 주은 ‘집계 중’, 미래 주은 ‘—’로 표시합니다. 데이터 수집 이전의 사용 이력은 알 수 없습니다.</Paragraph>
    </Card>
    <Card title="광고 성과" extra={<Space><Tag>Google Ads</Tag><Button loading={ads.isFetching} onClick={() => { void ads.refetch(); }}>광고 다시 조회</Button></Space>} loading={ads.isLoading}>
      {advertising ? <><Paragraph type="secondary">{advertising.start} – {advertising.end} · {advertising.timezone} · {advertising.currency}</Paragraph><div className={styles.adStats}><Statistic title="광고비" value={money(advertising.cost)} /><Statistic title="전체 주요 전환" value={advertising.conversions} precision={2} suffix="건" /><Statistic title="전환당 비용" value={money(advertising.cpa)} /></div><Table rowKey="id" pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 520 }} dataSource={advertising.campaigns} columns={[{ title: "캠페인", dataIndex: "name" }, { title: "광고비", dataIndex: "cost", align: "right", render: money }, { title: "전체 주요 전환", dataIndex: "conversions", align: "right" }, { title: "전환당 비용", dataIndex: "cpa", align: "right", render: money }]} /></> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Google Ads 연결 오류를 확인하세요." />}
      <Paragraph type="secondary" className={styles.footnote}>계정의 주요 전환 전체 기준이며 가입 전용 전환이 아닙니다. 가입 액션을 지정하기 전에는 가입 CPA로 표시하지 않습니다. 전환이 없으면 전환당 비용은 ‘—’입니다.</Paragraph>
    </Card>
    <details className={styles.definitions}><summary>지표 정의와 집계 기준</summary><Title level={5}>실제 집계 이벤트</Title><Paragraph>정보 관리: 계약·호실 상세 화면 조회와 room_updated. 수납 관리: rooms·profit·profit/income 화면 조회, 수동 payment_recorded·payment_updated, tenant_overdue_notification_changed. 각 화면 조회는 $screen 이벤트의 $screen_name을 사용합니다.</Paragraph><Paragraph>백엔드의 숫자 유저 ID로 식별된 활동만 포함합니다. is_internal 또는 is_test가 true인 사용자는 제외합니다. 해당 속성이 없는 내부 계정은 자동으로 구분되지 않으므로 PostHog에서 표시해야 합니다.</Paragraph><Title level={5}>유지율</Title><Paragraph>상단은 선택 기간의 마지막 완료 주와 그 이전 주의 전체 핵심 활동 유저 재사용률이며, 표는 수집된 이력의 최초 핵심 활동 주별 집단 기준입니다.</Paragraph></details>
  </div>;
}
