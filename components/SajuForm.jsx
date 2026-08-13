export function SajuForm({
  formRef,
  values,
  onChange,
  onSubmit,
  formDisabled,
  canSubmit,
  loading,
  viewingSaved,
  user,
  profile,
}) {
  function update(key, value) {
    onChange({ ...values, [key]: value })
  }

  return (
    <form
      ref={formRef}
      className="saju-form"
      onSubmit={onSubmit}
      noValidate
      onAnimationEnd={(e) => {
        if (e.target === formRef.current) {
          formRef.current?.classList.remove('is-attention')
        }
      }}
    >
      <p className="form-note">
        {viewingSaved
          ? '당시 해석에 사용된 정보예요. 새 해석은 현재 프로필 기준으로 다시 만들 수 있어요.'
          : user && profile
            ? '아래 값은 프로필에서 불러왔어요. 이번만 바꿔서 해석해도 괜찮아요.'
            : '이름, 생년월일, 성별만 입력하면 바로 해석을 받을 수 있어요.'}
      </p>

      <div className="field">
        <label htmlFor="name">
          이름 <span className="required">필수</span>
        </label>
        <input
          id="name"
          type="text"
          placeholder="이름을 입력하세요"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          disabled={formDisabled}
        />
      </div>

      <div className="field">
        <label htmlFor="birthDate">
          생년월일 <span className="required">필수</span>
        </label>
        <input
          id="birthDate"
          type="date"
          value={values.birthDate}
          onChange={(e) => update('birthDate', e.target.value)}
          disabled={formDisabled}
        />
      </div>

      <div className="field">
        <label htmlFor="birthTime">태어난 시간</label>
        <input
          id="birthTime"
          type="time"
          value={values.birthTime}
          onChange={(e) => update('birthTime', e.target.value)}
          disabled={formDisabled}
        />
      </div>

      <div className="field">
        <label htmlFor="gender">
          성별 <span className="required">필수</span>
        </label>
        <select
          id="gender"
          value={values.gender}
          onChange={(e) => update('gender', e.target.value)}
          disabled={formDisabled}
        >
          <option value="">선택하세요</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
      </div>

      <fieldset className="calendar-type" disabled={formDisabled}>
        <legend>양력 / 음력</legend>
        <label>
          <input
            type="radio"
            name="calendarType"
            value="solar"
            checked={values.calendarType === 'solar'}
            onChange={(e) => update('calendarType', e.target.value)}
          />
          양력
        </label>
        <label>
          <input
            type="radio"
            name="calendarType"
            value="lunar"
            checked={values.calendarType === 'lunar'}
            onChange={(e) => update('calendarType', e.target.value)}
          />
          음력
        </label>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="submit-btn" disabled={!canSubmit && !loading}>
          {loading
            ? '해석 생성 중…'
            : viewingSaved
              ? '다시 사주 보기'
              : '사주 보기'}
        </button>
      </div>
    </form>
  )
}
