export default function AdminLoading() {
  return (
    <div className="admin-page-loading">
      <p role="status">화면을 불러오는 중입니다.</p>
      <div className="admin-loading-placeholder" aria-hidden="true" />
    </div>
  );
}
