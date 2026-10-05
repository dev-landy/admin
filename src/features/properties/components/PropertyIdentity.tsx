import { EntityCell } from "@/components/EntityCell";

type PropertyIdentityValue = { propertyId: number; name: string; address: string | null };

export function PropertyIdentity({ property }: { property: PropertyIdentityValue }) {
  return <EntityCell primary={property.name} secondary={property.address || "주소 미등록"} meta={`건물 #${property.propertyId}`} />;
}

export function PropertyDeletionDescription({ property }: { property: PropertyIdentityValue }) {
  return <>
    <PropertyIdentity property={property} />
    <p>마지막 남은 건물이거나 등록된 임차인 계약 정보가 남아 있으면 삭제할 수 없습니다.</p>
  </>;
}
