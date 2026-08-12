import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import { analyzeSaju } from './gemini.js'
import { supabase } from './supabase.js'

function ResultSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="skeleton-line w90" />
      <div className="skeleton-line w70" />
      <div className="skeleton-line w95" />
      <div className="skeleton-gap" />
      <div className="skeleton-line w80" />
      <div className="skeleton-line w60" />
      <div className="skeleton-line w88" />
      <div className="skeleton-gap" />
      <div className="skeleton-line w75" />
      <div className="skeleton-line w92" />
    </div>
  )
}

function formatGender(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return ''
}

function formatCalendar(value) {
  return value === 'lunar' ? '음력' : '양력'
}

function formatShortDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const resultRef = useRef(null)
  const nameInputRef = useRef(null)
  const formRef = useRef(null)
  const toastTimerRef = useRef(null)

  function showToast(message) {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 2600)
  }

  async function loadReadings() {
    setListLoading(true)
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      setError('저장된 사주 목록을 불러오지 못했습니다.')
      setListLoading(false)
      return
    }

    setReadings(data ?? [])
    setListLoading(false)
  }

  useEffect(() => {
    loadReadings()
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!selectedId || !result || loading) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId, resultRevealKey, result, loading])

  useEffect(() => {
    if (!loading) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading])

  function validateForm() {
    const nextErrors = {}
    if (!name.trim()) nextErrors.name = true
    if (!birthDate) nextErrors.birthDate = true
    if (!gender) nextErrors.gender = true
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSelectReading(id) {
    setError('')
    setFieldErrors({})
    setCopied(false)
    setSelectedId(id)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('name, birth_date, birth_time, gender, calendar_type, result')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error(fetchError)
      setError('저장된 사주를 불러오지 못했습니다.')
      return
    }

    setName(data.name ?? '')
    setBirthDate(data.birth_date ?? '')
    setBirthTime(data.birth_time ? String(data.birth_time).slice(0, 5) : '')
    setGender(data.gender ?? '')
    setCalendarType(data.calendar_type ?? 'solar')
    setResult(data.result ?? '')
    setResultRevealKey((key) => key + 1)
  }

  function handleNewReading() {
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
    setResult('')
    setError('')
    setFieldErrors({})
    setSelectedId(null)
    setResultRevealKey(0)
    setCopied(false)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
    })
  }

  async function handleCopyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      showToast('해석 내용을 복사했습니다')
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
      setError('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    setResult('')
    setSelectedId(null)
    setCopied(false)

    if (!validateForm()) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    setLoading(true)
    try {
      const fullText = await analyzeSaju(
        { name: name.trim(), birthDate, birthTime, gender, calendarType },
        {
          onChunk: (text) => setResult(text),
        },
      )

      const { data, error: insertError } = await supabase
        .from('saju_readings')
        .insert({
          name: name.trim(),
          birth_date: birthDate,
          birth_time: birthTime || null,
          gender,
          calendar_type: calendarType,
          result: fullText,
        })
        .select('id, name, created_at')
        .single()

      if (insertError) {
        console.error(insertError)
        setError('사주 결과는 생성됐지만 저장에 실패했습니다.')
        return
      }

      setSelectedId(data.id)
      setReadings((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
      showToast('사주가 저장되었습니다')
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const showResultPanel = loading || result
  const viewingSaved = Boolean(selectedId && result && !loading)
  const canSubmit = Boolean(name.trim() && birthDate && gender) && !loading

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <div className="sidebar-heading">
          <h2 className="sidebar-title">저장된 사주</h2>
          {!listLoading && (
            <span className="sidebar-count">{readings.length}</span>
          )}
        </div>

        <button
          type="button"
          className="sidebar-new"
          onClick={handleNewReading}
          disabled={loading}
        >
          새 사주 만들기
        </button>

        {listLoading ? (
          <div className="sidebar-loading" aria-live="polite">
            목록 불러오는 중…
          </div>
        ) : readings.length === 0 ? (
          <p className="sidebar-empty">
            아직 저장된 사주가 없습니다.
            <span>첫 사주를 만들어 보세요.</span>
          </p>
        ) : (
          <ul className="sidebar-list">
            {readings.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar-item ${selectedId === item.id ? 'is-active' : ''}`}
                  onClick={() => handleSelectReading(item.id)}
                  disabled={loading}
                  aria-current={selectedId === item.id ? 'true' : undefined}
                >
                  <span className="sidebar-item-name">{item.name}</span>
                  <span className="sidebar-item-date">
                    {formatShortDate(item.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="app">
        <header className="app-header">
          <h1>사주 입력</h1>
          <p className="app-lead">이름·생년월일·성별을 입력하면 사주 해석을 바로 확인할 수 있어요.</p>
        </header>

        {viewingSaved && (
          <div className="mode-banner" role="status">
            <div>
              <strong>{name}</strong>님의 저장된 사주를 보고 있습니다.
            </div>
            <button type="button" className="mode-banner-btn" onClick={handleNewReading}>
              새 사주 만들기
            </button>
          </div>
        )}

        <form ref={formRef} className="saju-form" onSubmit={handleAnalyze} noValidate>
          <div className="field">
            <label htmlFor="name">
              이름 <span className="required">필수</span>
            </label>
            <input
              ref={nameInputRef}
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }))
              }}
              disabled={loading}
              autoComplete="name"
              aria-invalid={fieldErrors.name ? 'true' : undefined}
              className={fieldErrors.name ? 'has-error' : ''}
            />
          </div>

          <div className="field">
            <label htmlFor="birthDate">
              생년월일 <span className="required">필수</span>
            </label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value)
                if (fieldErrors.birthDate) {
                  setFieldErrors((prev) => ({ ...prev, birthDate: false }))
                }
              }}
              disabled={loading}
              aria-invalid={fieldErrors.birthDate ? 'true' : undefined}
              className={fieldErrors.birthDate ? 'has-error' : ''}
            />
          </div>

          <div className="field">
            <label htmlFor="birthTime">
              태어난 시간 <span className="optional">선택</span>
            </label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={loading}
            />
            <p className="field-hint">모르면 비워 두어도 됩니다.</p>
          </div>

          <div className="field">
            <label htmlFor="gender">
              성별 <span className="required">필수</span>
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value)
                if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: false }))
              }}
              disabled={loading}
              aria-invalid={fieldErrors.gender ? 'true' : undefined}
              className={fieldErrors.gender ? 'has-error' : ''}
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>

          <fieldset className="calendar-type" disabled={loading}>
            <legend>양력 / 음력</legend>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="solar"
                checked={calendarType === 'solar'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              양력
            </label>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="lunar"
                checked={calendarType === 'lunar'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              음력
            </label>
          </fieldset>

          <button type="submit" className="submit-btn" disabled={!canSubmit && !loading}>
            {loading ? '해석 생성 중…' : viewingSaved ? '다시 사주 보기' : '사주 보기'}
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {showResultPanel && (
          <section
            ref={resultRef}
            className={`result ${viewingSaved ? 'is-saved' : ''} ${loading ? 'is-live' : ''}`}
            key={resultRevealKey || 'live'}
            aria-live={loading ? 'polite' : undefined}
          >
            <div className="result-header">
              <div className="result-title-row">
                <h2>
                  {viewingSaved || (!loading && name)
                    ? `${name}님 사주 해석`
                    : '사주 해석'}
                  {loading && <span className="streaming-badge">작성 중</span>}
                  {viewingSaved && <span className="saved-badge">저장됨</span>}
                </h2>
                {!loading && result && (
                  <div className="result-actions">
                    <button type="button" className="ghost-btn" onClick={handleCopyResult}>
                      {copied ? '복사됨' : '복사'}
                    </button>
                  </div>
                )}
              </div>

              {(viewingSaved || (!loading && result)) && (
                <dl className="result-meta">
                  <div>
                    <dt>생년월일</dt>
                    <dd>
                      {birthDate} ({formatCalendar(calendarType)})
                    </dd>
                  </div>
                  <div>
                    <dt>태어난 시간</dt>
                    <dd>{birthTime || '모름'}</dd>
                  </div>
                  <div>
                    <dt>성별</dt>
                    <dd>{formatGender(gender)}</dd>
                  </div>
                </dl>
              )}
            </div>

            {loading && (
              <div className="progress-bar" aria-hidden="true">
                <span />
              </div>
            )}

            <div
              className={`result-body ${loading ? 'is-streaming' : ''} ${viewingSaved ? 'is-revealed' : ''}`}
            >
              {loading && !result ? (
                <ResultSkeleton />
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  {loading && <span className="cursor" aria-hidden="true" />}
                </>
              )}
            </div>

            {viewingSaved && (
              <div className="result-footer">
                <button type="button" className="ghost-btn" onClick={handleNewReading}>
                  새 사주 만들기
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
