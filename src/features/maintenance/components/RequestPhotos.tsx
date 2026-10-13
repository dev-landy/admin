'use client';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Modal, Typography } from 'antd';
import { parseProblemDetail } from '@/lib/api/problem';
import { fetchPhotoUrl } from '../api';
import type { Photo } from '../types';
import styles from './maintenance.module.css';
export function RequestPhotos({requestId,photos}:{requestId:number;photos:Photo[]}) {
  const [selected,setSelected] = useState<number>();
  const [url,setUrl] = useState<string>();
  const [expires,setExpires] = useState<string>();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string>();
  const sequence = useRef(0);
  useEffect(()=>()=>{sequence.current++;},[]);
  useEffect(()=>{
    if (!expires) return;
    const timer = window.setTimeout(()=>{setUrl(undefined);setError('열람 시간이 만료되었습니다. 다시 열어 주세요.');},Math.max(0,Date.parse(expires)-Date.now()));
    return ()=>window.clearTimeout(timer);
  },[expires]);
  async function show(photoId:number) {
    const token=++sequence.current;
    setSelected(photoId);setUrl(undefined);setError(undefined);setBusy(true);
    try {const result=await fetchPhotoUrl(requestId,photoId);if(token===sequence.current){setUrl(result.url);setExpires(result.expiresAt);}}
    catch(err){if(token===sequence.current)setError(parseProblemDetail(err)?.detail ?? '사진을 불러오지 못했습니다.');}
    finally{if(token===sequence.current)setBusy(false);}
  }
  function close(){sequence.current++;setSelected(undefined);setUrl(undefined);setExpires(undefined);setBusy(false);}
  return <>{photos.length ? <div className="admin-actions">{photos.map((photo,index)=><Button key={photo.photoId} onClick={()=>void show(photo.photoId)}>사진 {index+1} · {Math.ceil(photo.sizeBytes/1024)}KB</Button>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="첨부된 사진이 없습니다." />}
    {selected !== undefined && <Modal open title="요청 사진" onCancel={close} footer={<Button onClick={close}>닫기</Button>} width={800}>
      <Typography.Paragraph type="secondary">사진 속 개인정보를 확인한 후 필요한 범위에서만 사용하세요.</Typography.Paragraph>
      {busy && <span role="status">사진을 불러오는 중입니다.</span>}
      {error && <Alert type="error" title={error} action={<Button onClick={()=>void show(selected)}>다시 열기</Button>} />}
      {/* Signed URLs are transient and must bypass image optimization/persistent caching. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img className={styles.photo} src={url} alt="수리 요청 첨부 사진" referrerPolicy="no-referrer" onError={()=>{setUrl(undefined);setError('사진을 표시하지 못했습니다. 다시 열어 주세요.');}} />}
    </Modal>}
  </>;
}
