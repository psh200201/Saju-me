import { mascots } from '../assets/mascots.js'

export function AppHeader({ user, readingsCount }) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <img src={mascots.scroll} alt="" className="meong-header" />
        <div>
          <h1>사주 보기</h1>
          <p className="app-lead">
            {user
              ? '아코가 프로필을 보고 흐름을 읽어 줄게요. 다정하게, 하지만 정확하게.'
              : '로그인 없이 바로 체험해 보세요. 전체 해석은 로그인 후 열립니다.'}
          </p>
        </div>
      </div>
      {readingsCount != null && readingsCount > 0 && (
        <p className="trust-stat">
          <img src={mascots.heart} alt="" className="trust-stat-meong" />
          <span>
            총 <strong>{readingsCount.toLocaleString('ko-KR')}</strong>개의 사주가
            생성되었습니다
          </span>
        </p>
      )}
    </header>
  )
}
