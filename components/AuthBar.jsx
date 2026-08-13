import { mascots } from '../assets/mascots.js'

export function AuthBar({
  user,
  userLabel,
  userAvatar,
  isBusy,
  authBusy,
  profile,
  showOnboarding,
  onOpenProfileEdit,
  onLogout,
  onGoogleLogin,
}) {
  return (
    <div className="auth-bar">
      {user ? (
        <>
          <div className="auth-user">
            {userAvatar ? (
              <img className="auth-avatar" src={userAvatar} alt="" />
            ) : (
              <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">
                {userLabel.slice(0, 1)}
              </span>
            )}
            <div>
              <p className="auth-name">{userLabel}</p>
              <p className="auth-email">{user.email}</p>
            </div>
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={onOpenProfileEdit}
              disabled={isBusy || !profile || showOnboarding}
            >
              프로필 수정
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={onLogout}
              disabled={authBusy || isBusy}
            >
              로그아웃
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="auth-user">
            <img src={mascots.wave} alt="" className="auth-avatar" />
            <div>
              <p className="auth-name">게스트로 체험 중</p>
              <p className="auth-email">전체 결과는 로그인 후 확인할 수 있어요</p>
            </div>
          </div>
          <div className="auth-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={onGoogleLogin}
              disabled={authBusy}
            >
              {authBusy ? '로그인 중…' : 'Google 로그인'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
