"use client";

import { useRef, useState } from "react";
import { Alert, Button, Modal, Space, Table, Typography } from "antd";
import { parseProblemDetail } from "@/lib/api/problem";
import { useGeocodeProperties } from "../hooks";
import type { PropertyGeocodingResponse } from "../types";

const failureReasons: Record<string, string> = {
  EMPTY_RESULT: "주소에 해당하는 위치를 찾지 못했습니다.",
  AMBIGUOUS_ADDRESS: "주소를 하나로 특정할 수 없습니다.",
  INVALID_COORDINATES: "올바른 좌표를 얻지 못했습니다.",
  HTTP_ERROR: "외부 조회 서버 오류입니다.",
  NETWORK_ERROR: "외부 조회 서버에 연결하지 못했습니다.",
  PROVIDER_ERROR: "외부 조회 서비스 오류입니다.",
  INVALID_RESPONSE: "외부 조회 응답을 확인할 수 없습니다.",
};

function GeocodingResult({ result }: { result: PropertyGeocodingResponse }) {
  const stopped = result.stopReason === "EXTERNAL_ERROR";
  const hasFailures = result.failedCount > 0;
  const title = stopped ? "외부 조회 오류로 처리가 중단되었습니다."
    : hasFailures ? "일부 건물의 주소 처리에 실패했습니다."
      : result.targetCount === 0 ? "처리할 건물이 없습니다."
        : "건물 주소 일괄 처리가 완료되었습니다.";

  return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
    <Alert type={stopped || hasFailures ? "warning" : "success"} showIcon title={title}
      description={stopped || hasFailures ? "저장된 좌표는 유지됩니다. 실패 원인을 확인한 뒤 다시 실행하면 남은 대상만 처리합니다." : undefined} />
    <Space wrap aria-label="처리 결과 집계">
      <span>대상 {result.targetCount}건</span>
      <span>시도 {result.attemptedCount}건</span>
      <span>저장 {result.updatedCount}건</span>
      <span>건너뜀 {result.skippedCount}건</span>
      <span>실패 {result.failedCount}건</span>
      <span>미시도 {result.targetCount - result.attemptedCount}건</span>
    </Space>
    {result.failures.length > 0 && <Table
      size="small" rowKey="propertyId" dataSource={result.failures}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      columns={[
        { title: "건물 ID", dataIndex: "propertyId", width: 100 },
        { title: "실패 사유", dataIndex: "reason", render: (reason: string) => failureReasons[reason] ?? reason },
      ]}
    />}
  </Space>;
}

export function PropertyGeocodingButton() {
  const [open, setOpen] = useState(false);
  const started = useRef(false);
  const mutation = useGeocodeProperties();
  const finished = Boolean(mutation.data) || mutation.isError;
  const problem = parseProblemDetail(mutation.error);

  function start() {
    if (started.current) return;
    started.current = true;
    mutation.mutate();
  }

  return <>
    <Button onClick={() => { mutation.reset(); started.current = false; setOpen(true); }}
      disabled={mutation.isPending}>건물 주소 일괄 처리</Button>
    <Modal title="건물 주소 일괄 처리" open={open} width={640}
      onCancel={() => { if (!mutation.isPending) setOpen(false); }}
      closable={!mutation.isPending} keyboard={!mutation.isPending} mask={{ closable: false }}
      footer={finished ? <Button onClick={() => setOpen(false)}>닫기</Button> : <Space>
        <Button disabled={mutation.isPending} onClick={() => setOpen(false)}>취소</Button>
        <Button type="primary" loading={mutation.isPending} disabled={mutation.isPending} onClick={start}>
          {mutation.isPending ? "처리 중" : "처리 시작"}
        </Button>
      </Space>}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          현재 검색 조건과 관계없이, 주소가 있고 위도·경도가 모두 없는 전체 건물의 좌표를 조회해 저장합니다.
          건물 이름과 주소, 이미 저장된 좌표는 변경하지 않습니다.
        </Typography.Paragraph>
        {!finished && <Alert type="info" showIcon
          title={mutation.isPending ? "건물 주소를 처리하고 있습니다." : "건물 수에 따라 처리 시간이 길어질 수 있습니다."}
          description="완료 결과가 나올 때까지 이 화면을 유지해 주세요." />}
        {mutation.data && <GeocodingResult result={mutation.data} />}
        {mutation.isError && <Alert type="error" showIcon title="처리 결과를 확인하지 못했습니다."
          description={<>
            <p>{problem?.detail ?? "서버 연결 또는 응답에 문제가 발생했습니다."}</p>
            <p>일부 건물은 이미 처리되었을 수 있습니다. 서버 처리 상태를 확인한 뒤 다시 실행해 주세요.</p>
          </>} />}
      </Space>
    </Modal>
  </>;
}
