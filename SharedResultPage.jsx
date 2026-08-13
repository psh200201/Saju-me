import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import meongImg from './assets/mascot/meong.png'
import { supabase } from './supabase.js'

function formatGender(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return ''
}

function formatCalendar(value) {
  return value === 'lunar' ? '음력' : '양력'
}

function SharedResultPage() {
  const { shareToken } = useParams()
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      if (!shareToken) {
        setError('잘못된 공유 링크입니다.')
        setLoading(false)
        return
      }

      const { data, error: rpcError } = await supabase.rpc('get_shared_reading', {
        p_token: shareToken,
      })

      if (cancelled) return

      if (rpcError) {
        console.error(rpcError)
        setError('사주 결과를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setError('공유된 사주 결과를 찾을 수 없습니다. 링크가 만료됐거나 비공개일 수 있어요.')
        setReading(null)
        setLoading(false)
        return
      }

      setReading(row)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [shareToken])

  return (
    <div className="share-page">
      <div className="share-shell">
        <header className="share-top">
          <img src={meongImg} alt="" className="meong-header" />
          <div>
            <p className="share-eyebrow">사주 전문가 멍</p>
            <h1>공유된 사주 결과</h1>
            <p className="share-lead">로그인 없이 확인할 수 있는 해석이에요.</p>
          </div>
        </header>

        {loading && <p className="share-status">결과를 불러오는 중…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!loading && reading && (
          <section className="result is-saved share-result">
            <div className="result-header">
              <div className="result-title-row">
                <h2>{reading.name}님 사주 해석</h2>
                <span className="saved-badge">공유됨</span>
              </div>
              <dl className="result-meta">
                <div>
                  <dt>생년월일</dt>
                  <dd>
                    {reading.birth_date} ({formatCalendar(reading.calendar_type)})
                  </dd>
                </div>
                <div>
                  <dt>태어난 시간</dt>
                  <dd>
                    {reading.birth_time
                      ? String(reading.birth_time).slice(0, 5)
                      : '모름'}
                  </dd>
                </div>
                <div>
                  <dt>성별</dt>
                  <dd>{formatGender(reading.gender)}</dd>
                </div>
              </dl>
            </div>

            <div className="meong-narrator">
              <img src={meongImg} alt="" className="meong-narrator-img" />
              <div>
                <p className="meong-narrator-label">사주 전문가 멍</p>
                <p className="meong-narrator-text">
                  친구가 공유한 해석이에요. 말투는 다정하지만, 분석은 정확하게 적어 두었어요.
                </p>
              </div>
            </div>

            <div className="result-body is-revealed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reading.result}</ReactMarkdown>
            </div>
          </section>
        )}

        <div className="share-footer">
          <Link to="/" className="submit-btn share-home-btn">
            내 사주도 보러 가기
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SharedResultPage
