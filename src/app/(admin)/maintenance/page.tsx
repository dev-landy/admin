import { Suspense } from 'react';
import { Spin } from 'antd';
import { MaintenanceList } from '@/features/maintenance/components/MaintenanceList';
export default function MaintenancePage() { return <Suspense fallback={<Spin />}><MaintenanceList /></Suspense>; }
