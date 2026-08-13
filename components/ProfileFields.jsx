export function ProfileFields({
  values,
  onChange,
  fieldErrors = {},
  disabled,
  nameInputRef,
  idPrefix = 'profile',
  radioName = 'profileCalendarType',
}) {
  function update(key, value) {
    onChange({ ...values, [key]: value })
  }

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>
          이름 <span className="required">필수</span>
        </label>
        <input
          ref={nameInputRef}
          id={`${idPrefix}-name`}
          type="text"
          placeholder="이름을 입력하세요"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          disabled={disabled}
          autoComplete="name"
          className={fieldErrors.name ? 'has-error' : ''}
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-birthDate`}>
          생년월일 <span className="required">필수</span>
        </label>
        <input
          id={`${idPrefix}-birthDate`}
          type="date"
          value={values.birthDate}
          onChange={(e) => update('birthDate', e.target.value)}
          disabled={disabled}
          className={fieldErrors.birthDate ? 'has-error' : ''}
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-birthTime`}>
          태어난 시간 <span className="optional">선택</span>
        </label>
        <input
          id={`${idPrefix}-birthTime`}
          type="time"
          value={values.birthTime}
          onChange={(e) => update('birthTime', e.target.value)}
          disabled={disabled}
        />
        <p className="field-hint">모르면 비워 두어도 됩니다.</p>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-gender`}>
          성별 <span className="required">필수</span>
        </label>
        <select
          id={`${idPrefix}-gender`}
          value={values.gender}
          onChange={(e) => update('gender', e.target.value)}
          disabled={disabled}
          className={fieldErrors.gender ? 'has-error' : ''}
        >
          <option value="">선택하세요</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
      </div>

      <fieldset className="calendar-type" disabled={disabled}>
        <legend>양력 / 음력</legend>
        <label>
          <input
            type="radio"
            name={radioName}
            value="solar"
            checked={values.calendarType === 'solar'}
            onChange={(e) => update('calendarType', e.target.value)}
          />
          양력
        </label>
        <label>
          <input
            type="radio"
            name={radioName}
            value="lunar"
            checked={values.calendarType === 'lunar'}
            onChange={(e) => update('calendarType', e.target.value)}
          />
          음력
        </label>
      </fieldset>
    </>
  )
}
