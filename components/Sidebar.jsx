import { mascots } from '../assets/mascots.js'
import { formatShortDate } from '../utils/format.js'

export function Sidebar({
  user,
  readings,
  selectedId,
  listLoading,
  profileLoading,
  isBusy,
  authBusy,
  onNewReading,
  onSelectReading,
  onGoogleLogin,
}) {
  return (
    <aside className="sidebar" aria-label="저장된 사주 목록">
      <div className="sidebar-brand">
        <img src={mascots.wave} alt="" className="meong-sidebar" />
        <div>
          <p className="sidebar-brand-name">사주 전문가 아코</p>
          <p className="sidebar-brand-sub">다정하게, 정확하게</p>
        </div>
      </div>

      <div className="sidebar-heading">
        <h2 className="sidebar-title">저장된 사주</h2>
        {user && !listLoading && (
          <span className="sidebar-count">{readings.length}</span>
        )}
      </div>

      <button
        type="button"
        className="sidebar-new"
        onClick={onNewReading}
        disabled={isBusy}
      >
        새 사주 보기
      </button>

      {!user ? (
        <div className="sidebar-guest">
          <div className="sidebar-empty-art">
            <img src={mascots.sleep} alt="" className="meong-sidebar-empty" />
            <p className="sidebar-empty">
              로그인하면 해석을 저장하고
              <span>언제든 다시 볼 수 있어요.</span>
            </p>
          </div>
          <button
            type="button"
            className="google-btn sidebar-login"
            onClick={onGoogleLogin}
            disabled={authBusy}
          >
            <span className="google-icon" aria-hidden="true">
              G
            </span>
            Google로 로그인
          </button>
        </div>
      ) : listLoading || profileLoading ? (
        <div className="sidebar-loading" aria-live="polite">
          목록 불러오는 중…
        </div>
      ) : readings.length === 0 ? (
        <div className="sidebar-empty-art">
          <img src={mascots.mascot} alt="" className="meong-sidebar-empty" />
          <p className="sidebar-empty">
            아직 저장된 사주가 없습니다.
            <span>첫 사주를 만들어 보세요.</span>
          </p>
        </div>
      ) : (
        <ul className="sidebar-list">
          {readings.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-item ${selectedId === item.id ? 'is-active' : ''}`}
                onClick={() => onSelectReading(item.id)}
                disabled={isBusy}
                aria-current={selectedId === item.id ? 'true' : undefined}
              >
                <span className="sidebar-item-name">{item.name}</span>
                <span className="sidebar-item-date">
                  {formatShortDate(item.birth_date)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
