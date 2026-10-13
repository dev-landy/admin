import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Spin } from 'antd';
import { MaintenanceDetail } from '@/features/maintenance/components/MaintenanceDetail';
export default async function MaintenanceRequestPage({ params }: {params:Promise<{requestId:string}>}) {
  const {requestId}=await params;
  if(!/^[1-9]\d*$/.test(requestId) || !Number.isSafeInteger(Number(requestId))) notFound();
  return <Suspense fallback={<Spin />}><MaintenanceDetail requestId={Number(requestId)} /></Suspense>;
}
