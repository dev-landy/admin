import type { ContractRegistrationValues, ContractTenantValues } from "./types";

/** 미완성 초안과 최종 등록 요청을 분리한다. 임대료를 기간별 금액으로 환산하지 않는다. */
export function toContractRegistrationValues(values: ContractTenantValues): ContractRegistrationValues {
  if (!values.name?.trim() || !values.phone?.trim() || !values.startDate || values.paymentDay == null) {
    throw new Error("계약 등록에 필요한 이름, 연락처, 시작일과 납부일을 확인해 주세요.");
  }
  const common = {
    contractType: values.contractType,
    parkingEnabled: values.parkingEnabled,
    vehicleNumber: values.vehicleNumber,
    name: values.name.trim(),
    phone: values.phone.trim(),
    roomNumber: values.roomNumber,
    startDate: values.startDate,
    paymentDay: values.paymentDay,
    rentPrice: values.rentPrice ?? 0,
    maintenanceFee: values.maintenanceFee ?? 0,
    depositAmount: values.depositAmount ?? 0,
  };
  if (values.rentChargeFrequency === "ONE_TIME") {
    if (!values.endDate) throw new Error("계약기간 일시납은 계약 종료일이 필요합니다.");
    if (values.billingTiming !== "PREPAID") throw new Error("계약기간 일시납은 선불만 가능합니다.");
    return { ...common, rentChargeFrequency: "ONE_TIME", billingTiming: "PREPAID", endDate: values.endDate };
  }
  if (values.rentChargeFrequency !== "MONTHLY") throw new Error("임대료 납부 유형을 확인해 주세요.");
  return { ...common, rentChargeFrequency: "MONTHLY", billingTiming: values.billingTiming, endDate: values.endDate };
}
