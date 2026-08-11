import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import { analyzeSaju } from './gemini.js'

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

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    setResult('')

    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    setLoading(true)
    try {
      await analyzeSaju(
        { name, birthDate, birthTime, gender, calendarType },
        {
          // 글자가 오는 즉시 화면에 반영
          onChunk: (text) => setResult(text),
        },
      )
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const showResultPanel = loading || result

  return (
    <div className="app">
      <h1>사주 입력</h1>

      <form onSubmit={handleAnalyze}>
        <label htmlFor="name">이름</label>
        <input
          id="name"
          type="text"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />

        <label htmlFor="birthDate">생년월일</label>
        <input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={loading}
        />

        <label htmlFor="birthTime">태어난 시간</label>
        <input
          id="birthTime"
          type="time"
          value={birthTime}
          onChange={(e) => setBirthTime(e.target.value)}
          disabled={loading}
        />

        <label htmlFor="gender">성별</label>
        <select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          disabled={loading}
        >
          <option value="">선택하세요</option>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>

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

        <button type="submit" disabled={loading}>
          {loading ? '해석 생성 중…' : '사주 보기'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {showResultPanel && (
        <section className="result">
          <h2>
            사주 해석
            {loading && <span className="streaming-badge">작성 중</span>}
          </h2>
          <div className={`result-body ${loading ? 'is-streaming' : ''}`}>
            {loading && !result ? (
              <ResultSkeleton />
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                {loading && <span className="cursor" aria-hidden="true" />}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
