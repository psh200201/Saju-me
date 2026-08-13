import { mascots } from '../assets/mascots.js'
import { formatBirthTime, formatCalendar, formatGender } from '../utils/format.js'

export function ProfileCard({ profile, isBusy, onEdit }) {
  return (
    <section className="profile-card">
      <div className="profile-card-visual">
        <img src={mascots.expert} alt="" className="meong-profile-side" />
      </div>
      <div className="profile-card-body">
        <div className="profile-card-header">
          <h2>내 프로필</h2>
          <button type="button" className="ghost-btn" onClick={onEdit} disabled={isBusy}>
            수정
          </button>
        </div>
        <dl className="profile-meta">
          <div>
            <dt>이름</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>생년월일</dt>
            <dd>
              {profile.birth_date} ({formatCalendar(profile.calendar_type)})
            </dd>
          </div>
          <div>
            <dt>태어난 시간</dt>
            <dd>{formatBirthTime(profile.birth_time)}</dd>
          </div>
          <div>
            <dt>성별</dt>
            <dd>{formatGender(profile.gender)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
