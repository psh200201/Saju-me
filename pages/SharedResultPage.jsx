import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { mascots } from '../assets/mascots.js'
import { trackEvent } from '../lib/analytics.js'
import { supabase } from '../lib/supabase.js'
import { formatBirthTime, formatCalendar, formatGender } from '../utils/format.js'

export default function SharedResultPage() {
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
        trackEvent('shared_result_view', { status: 'invalid' })
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
        trackEvent('shared_result_view', { status: 'error' })
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setError('공유된 사주 결과를 찾을 수 없습니다. 링크가 만료됐거나 비공개일 수 있어요.')
        setReading(null)
        setLoading(false)
        trackEvent('shared_result_view', { status: 'not_found' })
        return
      }

      setReading(row)
      setLoading(false)
      trackEvent('shared_result_view', { status: 'success' })
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
          <img src={mascots.scroll} alt="" className="meong-header" />
          <div>
            <p className="share-eyebrow">사주 전문가 아코</p>
            <h1>공유된 사주 결과</h1>
            <p className="share-lead">로그인 없이 확인할 수 있는 해석이에요.</p>
          </div>
        </header>

        {loading && (
          <div className="share-status-art">
            <img src={mascots.sleep} alt="" className="meong-share-status meong-float" />
            <p className="share-status">결과를 불러오는 중…</p>
          </div>
        )}
        {error && (
          <div className="share-status-art">
            <img src={mascots.wave} alt="" className="meong-share-status" />
            <p className="error" role="alert">
              {error}
            </p>
          </div>
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
                  <dd>{formatBirthTime(reading.birth_time)}</dd>
                </div>
                <div>
                  <dt>성별</dt>
                  <dd>{formatGender(reading.gender)}</dd>
                </div>
              </dl>
            </div>

            <div className="meong-narrator">
              <img src={mascots.reading} alt="" className="meong-narrator-img" />
              <div>
                <p className="meong-narrator-label">사주 전문가 아코</p>
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
          <Link
            to="/"
            className="submit-btn share-home-btn"
            onClick={() => trackEvent('shared_result_cta_click')}
          >
            내 사주도 보러 가기
          </Link>
        </div>
      </div>
    </div>
  )
}
