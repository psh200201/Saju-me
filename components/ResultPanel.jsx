import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { mascots } from '../assets/mascots.js'
import { formatCalendar, formatGender } from '../utils/format.js'
import { ResultSkeleton } from './ResultSkeleton.jsx'

export function ResultPanel({
  resultRef,
  resultRevealKey,
  name,
  birthDate,
  birthTime,
  gender,
  calendarType,
  loading,
  result,
  displayResult,
  viewingSaved,
  isPaywalled,
  paywallActive,
  selectedId,
  isShared,
  shareUrl,
  sharing,
  deleting,
  copied,
  authBusy,
  user,
  onCopy,
  onShare,
  onDelete,
  onNewReading,
  onGoogleLogin,
  onOpenOnboarding,
}) {
  const narratorImg = isPaywalled
    ? mascots.heart
    : viewingSaved
      ? mascots.scroll
      : mascots.reading

  return (
    <section
      ref={resultRef}
      className={`result ${viewingSaved ? 'is-saved' : ''} ${loading ? 'is-live' : ''} ${isPaywalled ? 'is-paywalled' : ''}`}
      key={resultRevealKey || 'live'}
      aria-live={loading ? 'polite' : undefined}
    >
      <div className="result-header">
        <div className="result-title-row">
          <h2>
            {viewingSaved || (!loading && name) ? `${name}님 사주 해석` : '사주 해석'}
            {loading && <span className="streaming-badge">작성 중</span>}
            {viewingSaved && <span className="saved-badge">저장됨</span>}
            {isPaywalled && <span className="preview-badge">미리보기</span>}
          </h2>
          {!loading && result && !isPaywalled && (
            <div className="result-actions">
              <button type="button" className="ghost-btn" onClick={onCopy}>
                {copied ? '복사됨' : '복사'}
              </button>
              {selectedId && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={onShare}
                  disabled={sharing}
                >
                  {sharing ? '공유 준비 중…' : isShared ? '다시 공유' : '공유'}
                </button>
              )}
              {viewingSaved && (
                <button
                  type="button"
                  className="ghost-btn danger"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  {deleting ? '삭제 중…' : '삭제'}
                </button>
              )}
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

      {loading && (
        <div className="meong-analyzing-wrap">
          <img src={mascots.analyze} alt="" className="meong-analyzing meong-float" />
          <p className="meong-analyzing-text">아코가 사주를 꼼꼼히 살펴보는 중…</p>
        </div>
      )}

      {!loading && result && (
        <div className="meong-narrator">
          <img src={narratorImg} alt="" className="meong-narrator-img" />
          <div>
            <p className="meong-narrator-label">사주 전문가 아코</p>
            <p className="meong-narrator-text">
              {isPaywalled
                ? '앞부분은 먼저 보여 드릴게요. 이어지는 해석은 로그인하면 열려요.'
                : '편하게 들어 주세요. 말투는 다정하지만, 분석은 냉정하게 할게요.'}
            </p>
          </div>
        </div>
      )}

      <div
        className={`result-body ${loading ? 'is-streaming' : ''} ${viewingSaved ? 'is-revealed' : ''} ${isPaywalled ? 'is-paywalled' : ''}`}
      >
        {loading && (!result || paywallActive) ? (
          <>
            <ResultSkeleton />
            {paywallActive && (
              <p className="result-generating-hint">아코가 해석을 쓰고 있어요…</p>
            )}
          </>
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayResult}</ReactMarkdown>
            {loading && <span className="cursor" aria-hidden="true" />}
          </>
        )}

        {isPaywalled && (
          <div className="result-paywall">
            <div className="result-paywall-fade" aria-hidden="true">
              <div className="skeleton-line w90" />
              <div className="skeleton-line w70" />
              <div className="skeleton-line w95" />
              <div className="skeleton-gap" />
              <div className="skeleton-line w80" />
              <div className="skeleton-line w60" />
              <div className="skeleton-line w88" />
            </div>
            <div className="result-paywall-card">
              <img src={mascots.heart} alt="" className="result-paywall-meong" />
              <h3>나머지 해석이 잠겨 있어요</h3>
              <p>
                {user
                  ? '프로필을 저장하면 전체 결과와 저장 기능을 바로 쓸 수 있어요.'
                  : '로그인하면 전체 해석을 보고, 저장·공유까지 이어갈 수 있어요.'}
              </p>
              {user ? (
                <button type="button" className="submit-btn" onClick={onOpenOnboarding}>
                  프로필 저장하고 전체 보기
                </button>
              ) : (
                <button
                  type="button"
                  className="google-btn"
                  onClick={onGoogleLogin}
                  disabled={authBusy}
                >
                  <span className="google-icon" aria-hidden="true">
                    G
                  </span>
                  {authBusy ? '로그인 중…' : 'Google로 로그인하고 전체 보기'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {viewingSaved && isShared && shareUrl && (
        <div className="share-link-box">
          <p className="share-link-label">공유 링크</p>
          <code className="share-link-url">{shareUrl}</code>
        </div>
      )}

      {viewingSaved && (
        <div className="result-footer">
          <button type="button" className="ghost-btn" onClick={onNewReading}>
            새 사주 보기
          </button>
        </div>
      )}
    </section>
  )
}
