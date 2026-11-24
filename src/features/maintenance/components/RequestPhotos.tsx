'use client';
import { useState } from 'react';
import { App, Alert, Button, Empty, Image, Skeleton, Typography } from 'antd';
import { RefreshButton } from '@/components/RefreshButton';
import { parseProblemDetail } from '@/lib/api/problem';
import { usePhotoUrls } from '../hooks';
import { downloadPhoto, photoFileName } from '../photoDownload';
import type { Photo } from '../types';
import styles from './maintenance.module.css';
export function RequestPhotos({requestId,photos}:{requestId:number;photos:Photo[]}) {
  const {message}=App.useApp();
  const urls=usePhotoUrls(requestId,photos);
  const [saving,setSaving]=useState(false);
  const [broken,setBroken]=useState<ReadonlySet<number>>(new Set());
  if (!photos.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="첨부된 사진이 없습니다." />;
  async function save(indexes:number[]) {
    setSaving(true);
    try {
      let fallback=false;
      for (const index of indexes) {
        const url=urls[index]?.data?.url;
        if (url && !(await downloadPhoto(url,photoFileName(requestId,index,photos[index].contentType)))) fallback=true;
      }
      if (fallback) message.info('브라우저가 직접 저장을 막아 새 탭에서 열었습니다. 새 탭에서 이미지를 저장하세요.');
    } finally { setSaving(false); }
  }
  const ready=urls.every(item=>item.data);
  return <div className={styles.stack}>
    <div className={styles.photoToolbar}>
      <Typography.Text type="secondary">사진 속 개인정보를 확인한 후 필요한 범위에서만 업체에 보내세요. 사진을 메신저 창으로 끌어다 놓아도 됩니다.</Typography.Text>
      <Button disabled={!ready} loading={saving} onClick={()=>void save(photos.map((_,index)=>index))}>전체 저장</Button>
    </div>
    <Image.PreviewGroup>
      <div className={styles.photoGrid}>
        {photos.map((photo,index)=>{
          const item=urls[index];
          const label=`사진 ${index+1}`;
          const isBroken=broken.has(photo.photoId);
          const retry=()=>{setBroken(prev=>new Set([...prev].filter(id=>id!==photo.photoId)));void item?.refetch();};
          return <figure key={photo.photoId} className={styles.photoTile}>
            {item?.error || isBroken ? <Alert type="error" title={(item?.error && parseProblemDetail(item.error)?.detail) || '사진을 불러오지 못했습니다.'}
                action={<RefreshButton aria-label={`${label} 다시 불러오기`} loading={item?.isFetching} onClick={retry}>다시</RefreshButton>} />
              : item?.data ? <Image src={item.data.url} alt={`수리 요청 첨부 ${label}`} referrerPolicy="no-referrer" className={styles.photoThumb}
                onError={()=>setBroken(prev=>new Set([...prev,photo.photoId]))} />
              : <Skeleton.Image active aria-label={`${label}을 불러오는 중`} />}
            <figcaption className={styles.photoCaption}>
              <span>{label} · {Math.ceil(photo.sizeBytes/1024)}KB</span>
              <Button size="small" type="link" disabled={!item?.data || saving} onClick={()=>void save([index])}>저장</Button>
            </figcaption>
          </figure>;
        })}
      </div>
    </Image.PreviewGroup>
  </div>;
}
