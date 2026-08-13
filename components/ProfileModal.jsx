import { mascots } from '../assets/mascots.js'
import { PENDING_RESULT_KEY } from '../constants/storage.js'
import { ProfileFields } from './ProfileFields.jsx'

export function ProfileModal({
  showOnboarding,
  showProfileEdit,
  profileForm,
  setProfileForm,
  profileErrors,
  profileSaving,
  profileNameRef,
  error,
  onSubmit,
  onCancelEdit,
}) {
  if (!(showOnboarding || showProfileEdit)) return null

  const hasPending = Boolean(sessionStorage.getItem(PENDING_RESULT_KEY))

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <img
          src={showOnboarding ? mascots.wave : mascots.profile}
          alt=""
          className="modal-mascot"
        />
        <h2 id="profile-modal-title">
          {showOnboarding ? '프로필 정보를 입력해 주세요' : '프로필 수정'}
        </h2>
        <p className="modal-lead">
          {showOnboarding
            ? hasPending
              ? '거의 다 왔어요. 프로필만 저장하면 잠겨 있던 전체 해석이 바로 열려요.'
              : '처음 오셨네요. 아코가 사주를 보려면 기본 정보가 필요해요. 저장해 두면 다음부터 바로 불러올게요.'
            : '저장된 프로필은 새 사주 해석 시 자동으로 불러와요.'}
        </p>

        <form className="modal-form" onSubmit={onSubmit} noValidate>
          <ProfileFields
            values={profileForm}
            onChange={setProfileForm}
            fieldErrors={profileErrors}
            disabled={profileSaving}
            nameInputRef={profileNameRef}
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            {!showOnboarding && (
              <button
                type="button"
                className="secondary-btn"
                onClick={onCancelEdit}
                disabled={profileSaving}
              >
                취소
              </button>
            )}
            <button type="submit" className="submit-btn" disabled={profileSaving}>
              {profileSaving
                ? '저장 중…'
                : showOnboarding
                  ? '저장하고 시작하기'
                  : '프로필 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
