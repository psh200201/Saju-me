export function ModeBanner({ name, onNewReading }) {
  return (
    <div className="mode-banner" role="status">
      <div>
        <strong>{name}</strong>님의 저장된 사주를 보고 있습니다.
      </div>
      <button type="button" className="mode-banner-btn" onClick={onNewReading}>
        새 사주 보기
      </button>
    </div>
  )
}
