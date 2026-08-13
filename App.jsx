import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import meongImg from './assets/mascot/meong.png'
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

function getUserLabel(user, profile) {
  return (
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '사용자'
  )
}

function emptyProfileForm() {
  return {
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: profile.birth_time ? String(profile.birth_time).slice(0, 5) : '',
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

function ProfileFields({
  values,
  onChange,
  fieldErrors,
  disabled,
  nameInputRef,
}) {
  function update(key, value) {
    onChange({ ...values, [key]: value })
  }

  return (
    <>
      <div className="field">
        <label htmlFor="profile-name">
          이름 <span className="required">필수</span>
        </label>
        <input
          ref={nameInputRef}
          id="profile-name"
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
        <label htmlFor="profile-birthDate">
          생년월일 <span className="required">필수</span>
        </label>
        <input
          id="profile-birthDate"
          type="date"
          value={values.birthDate}
          onChange={(e) => update('birthDate', e.target.value)}
          disabled={disabled}
          className={fieldErrors.birthDate ? 'has-error' : ''}
        />
      </div>

      <div className="field">
        <label htmlFor="profile-birthTime">
          태어난 시간 <span className="optional">선택</span>
        </label>
        <input
          id="profile-birthTime"
          type="time"
          value={values.birthTime}
          onChange={(e) => update('birthTime', e.target.value)}
          disabled={disabled}
        />
        <p className="field-hint">모르면 비워 두어도 됩니다.</p>
      </div>

      <div className="field">
        <label htmlFor="profile-gender">
          성별 <span className="required">필수</span>
        </label>
        <select
          id="profile-gender"
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
            name="profileCalendarType"
            value="solar"
            checked={values.calendarType === 'solar'}
            onChange={(e) => update('calendarType', e.target.value)}
          />
          양력
        </label>
        <label>
          <input
            type="radio"
            name="profileCalendarType"
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

function getPreviewResult(text, { knownFull = true } = {}) {
  if (!text) return ''
  const target = knownFull
    ? Math.max(Math.floor(text.length * 0.48), 180)
    : Math.min(720, text.length)
  if (!knownFull && text.length <= 720) return text
  const paragraphBreak = text.lastIndexOf('\n\n', target)
  const cut =
    paragraphBreak > target * 0.35
      ? paragraphBreak
      : Math.min(target, text.length)
  if (cut >= text.length) return text
  return `${text.slice(0, cut).trimEnd()}\n\n…`
}

const PENDING_RESULT_KEY = 'saju-me-pending-result'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm())
  const [profileErrors, setProfileErrors] = useState({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)

  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState('')
  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [shareToken, setShareToken] = useState(null)
  const [isShared, setIsShared] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [toast, setToast] = useState('')
  const [toastLeaving, setToastLeaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [readingsCount, setReadingsCount] = useState(null)

  const resultRef = useRef(null)
  const formRef = useRef(null)
  const profileNameRef = useRef(null)
  const toastTimerRef = useRef(null)
  const toastClearRef = useRef(null)

  function showToast(message) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (toastClearRef.current) clearTimeout(toastClearRef.current)

    setToastLeaving(false)
    setToast(message)

    toastTimerRef.current = setTimeout(() => {
      setToastLeaving(true)
      toastClearRef.current = setTimeout(() => {
        setToast('')
        setToastLeaving(false)
      }, 280)
    }, 2600)
  }

  function applyProfileToForm(nextProfile = profile) {
    const form = profileToForm(nextProfile)
    setName(form.name)
    setBirthDate(form.birthDate)
    setBirthTime(form.birthTime)
    setGender(form.gender)
    setCalendarType(form.calendarType)
  }

  function clearReadingView() {
    setResult('')
    setError('')
    setSelectedId(null)
    setShareToken(null)
    setIsShared(false)
    setResultRevealKey(0)
    setCopied(false)
    sessionStorage.removeItem(PENDING_RESULT_KEY)
  }

  async function loadProfile(currentUser) {
    if (!currentUser) {
      setProfile(null)
      setShowOnboarding(false)
      return null
    }

    setProfileLoading(true)
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, name, birth_date, birth_time, gender, calendar_type, updated_at')
      .eq('id', currentUser.id)
      .maybeSingle()

    setProfileLoading(false)

    if (fetchError) {
      console.error(fetchError)
      setError('프로필을 불러오지 못했습니다.')
      return null
    }

    if (!data) {
      setProfile(null)
      setProfileForm(emptyProfileForm())
      setShowOnboarding(true)
      setShowProfileEdit(false)
      return null
    }

    setProfile(data)
    setShowOnboarding(false)
    applyProfileToForm(data)
    return data
  }

  async function loadReadings() {
    if (!user) {
      setReadings([])
      setListLoading(false)
      return
    }

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
    let mounted = true

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, '?'))
    const authError =
      hashParams.get('error_description') ||
      hashParams.get('error') ||
      new URLSearchParams(window.location.search).get('error_description')
    if (authError) {
      setError(decodeURIComponent(authError.replace(/\+/g, ' ')))
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) console.error(sessionError)
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      setAuthBusy(false)
    })

    ;(async () => {
      const { data, error: countError } = await supabase.rpc('get_readings_count')
      if (!mounted) return
      if (countError) {
        console.error(countError)
        return
      }
      const total = Number(data)
      if (Number.isFinite(total)) setReadingsCount(total)
    })()

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (toastClearRef.current) clearTimeout(toastClearRef.current)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setProfile(null)
      setReadings([])
      setListLoading(false)
      setShowOnboarding(false)
      setShowProfileEdit(false)
      setSelectedId(null)
      setShareToken(null)
      setIsShared(false)
      return
    }

    ;(async () => {
      const nextProfile = await loadProfile(user)
      await loadReadings()

      const raw = sessionStorage.getItem(PENDING_RESULT_KEY)
      if (!raw) {
        if (!nextProfile) setShowOnboarding(true)
        return
      }

      try {
        const pending = JSON.parse(raw)
        if (pending?.result) {
          setName(pending.name ?? '')
          setBirthDate(pending.birthDate ?? '')
          setBirthTime(pending.birthTime ?? '')
          setGender(pending.gender ?? '')
          setCalendarType(pending.calendarType ?? 'solar')
          setResult(pending.result)
          setSelectedId(null)
          setShareToken(null)
          setIsShared(false)
          setResultRevealKey((key) => key + 1)

          if (nextProfile) {
            try {
              await saveCurrentResult(pending.result, nextProfile, pending)
              showToast('전체 결과가 저장되었습니다')
            } catch (err) {
              console.error(err)
              showToast('로그인은 됐어요. 전체 결과 저장을 다시 시도해 주세요')
            }
          } else {
            setShowOnboarding(true)
            showToast('전체 결과를 보려면 프로필을 저장해 주세요')
          }
          return
        }
      } catch (err) {
        console.error(err)
      }

      if (!nextProfile) {
        setShowOnboarding(true)
      }
    })()
  }, [user?.id, authLoading])

  useEffect(() => {
    if (!selectedId || !result || loading) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId, resultRevealKey, result, loading])

  useEffect(() => {
    if (!loading) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading])

  useEffect(() => {
    if (!(showOnboarding || showProfileEdit)) return
    requestAnimationFrame(() => profileNameRef.current?.focus())
  }, [showOnboarding, showProfileEdit])

  function validateProfileValues(values) {
    const nextErrors = {}
    if (!values.name.trim()) nextErrors.name = true
    if (!values.birthDate) nextErrors.birthDate = true
    if (!values.gender) nextErrors.gender = true
    setProfileErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildUserPayload(values) {
    return {
      id: user.id,
      name: values.name.trim(),
      birth_date: values.birthDate,
      birth_time: values.birthTime || null,
      gender: values.gender,
      calendar_type: values.calendarType,
    }
  }

  function buildReadingPayload(resultText) {
    return {
      name: name.trim(),
      birth_date: birthDate,
      birth_time: birthTime || null,
      gender,
      calendar_type: calendarType,
      result: resultText,
      user_id: user.id,
    }
  }

  async function saveCurrentResult(
    fullText = result,
    profileReady = profile,
    snapshot = null,
  ) {
    if (!user || !profileReady || !fullText) return null

    const { data, error: insertError } = await supabase
      .from('saju_readings')
      .insert({
        name: (snapshot?.name ?? name).trim() || profileReady.name,
        birth_date: snapshot?.birthDate || birthDate || profileReady.birth_date,
        birth_time:
          snapshot?.birthTime ||
          birthTime ||
          profileReady.birth_time ||
          null,
        gender: snapshot?.gender || gender || profileReady.gender,
        calendar_type:
          snapshot?.calendarType ||
          calendarType ||
          profileReady.calendar_type,
        result: fullText,
        user_id: user.id,
      })
      .select('id, name, created_at, share_token, is_shared')
      .single()

    if (insertError) {
      console.error(insertError)
      throw insertError
    }

    setSelectedId(data.id)
    setShareToken(data.share_token ?? null)
    setIsShared(Boolean(data.is_shared))
    setReadings((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
    setReadingsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev))
    sessionStorage.removeItem(PENDING_RESULT_KEY)
    return data
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!user) return

    if (!validateProfileValues(profileForm)) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    setProfileSaving(true)
    setError('')

    const payload = buildUserPayload(profileForm)
    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, updated_at')
      .single()

    setProfileSaving(false)

    if (saveError) {
      console.error(saveError)
      setError('프로필 저장에 실패했습니다.')
      return
    }

    const wasOnboarding = showOnboarding
    setProfile(data)
    setShowOnboarding(false)
    setShowProfileEdit(false)
    applyProfileToForm(data)

    const pendingRaw = sessionStorage.getItem(PENDING_RESULT_KEY)
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw)
        if (pending?.result && !selectedId) {
          setName(pending.name ?? data.name)
          setBirthDate(pending.birthDate ?? data.birth_date)
          setBirthTime(pending.birthTime ?? '')
          setGender(pending.gender ?? data.gender)
          setCalendarType(pending.calendarType ?? data.calendar_type)
          setResult(pending.result)
          await saveCurrentResult(pending.result, data, pending)
          showToast('전체 결과가 저장되었습니다')
          return
        }
      } catch (err) {
        console.error(err)
      }
    }

    if (!selectedId && result) {
      try {
        await saveCurrentResult(result, data)
        showToast('프로필과 결과가 저장되었습니다')
        return
      } catch {
        showToast('프로필은 저장됐고, 결과는 다시 저장해 주세요')
        return
      }
    }

    showToast(wasOnboarding ? '프로필이 저장되었습니다' : '프로필이 수정되었습니다')
  }

  function openProfileEdit() {
    setProfileForm(profileToForm(profile))
    setProfileErrors({})
    setError('')
    setShowProfileEdit(true)
  }

  async function handleSelectReading(id) {
    setError('')
    setCopied(false)
    setSelectedId(id)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('name, birth_date, birth_time, gender, calendar_type, result, share_token, is_shared')
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
    setShareToken(data.share_token ?? null)
    setIsShared(Boolean(data.is_shared))
    setResultRevealKey((key) => key + 1)
  }

  function handleNewReading({ silent = false } = {}) {
    sessionStorage.removeItem(PENDING_RESULT_KEY)
    const alreadyOnNewPage = !selectedId && !result && !loading

    if (alreadyOnNewPage) {
      applyProfileToForm(profile)
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        formRef.current?.classList.remove('is-attention')
        // restart animation
        void formRef.current?.offsetWidth
        formRef.current?.classList.add('is-attention')
      })
      if (!silent) {
        showToast('이미 새 사주 화면이 열려 있어요')
      }
      return
    }

    clearReadingView()
    applyProfileToForm(profile)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      formRef.current?.classList.remove('is-attention')
      void formRef.current?.offsetWidth
      formRef.current?.classList.add('is-attention')
    })
    if (!silent) {
      showToast('새 사주 화면으로 이동했어요')
    }
  }

  async function handleGoogleLogin() {
    setAuthBusy(true)
    setError('')

    if (result) {
      sessionStorage.setItem(
        PENDING_RESULT_KEY,
        JSON.stringify({
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
          result,
        }),
      )
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (signInError) {
      console.error(signInError)
      setError('Google 로그인에 실패했습니다.')
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    setAuthBusy(true)
    setError('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error(signOutError)
      setError('로그아웃에 실패했습니다.')
      setAuthBusy(false)
      return
    }
    showToast('로그아웃했습니다')
  }

  async function handleCopyResult() {
    if (!result) return
    if (!user || (!profile && !selectedId)) {
      showToast('전체 복사는 로그인 후 가능해요')
      return
    }
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

  function getShareUrl(token) {
    return `${window.location.origin}/result/${token}`
  }

  async function handleShareResult() {
    if (!selectedId) {
      setError('먼저 저장된 사주 결과에서 공유해 주세요.')
      return
    }

    setSharing(true)
    setError('')

    const { data, error: shareError } = await supabase
      .from('saju_readings')
      .update({ is_shared: true })
      .eq('id', selectedId)
      .select('share_token, is_shared')
      .single()

    setSharing(false)

    if (shareError || !data?.share_token) {
      console.error(shareError)
      setError('공유 링크를 만들지 못했습니다.')
      return
    }

    setShareToken(data.share_token)
    setIsShared(true)

    const shareUrl = getShareUrl(data.share_token)
    const shareTitle = `${name}님 사주 해석`
    const shareText = '멍이 풀어 준 사주 결과를 확인해 보세요.'

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        showToast('공유했어요')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      showToast('공유 링크를 복사했습니다')
    } catch (err) {
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(shareUrl)
        showToast('공유 링크를 복사했습니다')
      } catch (copyError) {
        console.error(copyError)
        setError('공유에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    }
  }

  async function handleDeleteReading() {
    if (!selectedId) return
    const ok = window.confirm('이 저장된 사주를 삭제할까요?')
    if (!ok) return

    setDeleting(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', selectedId)

    setDeleting(false)

    if (deleteError) {
      console.error(deleteError)
      setError('삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    setReadings((prev) => prev.filter((item) => item.id !== selectedId))
    setReadingsCount((prev) => (typeof prev === 'number' ? Math.max(prev - 1, 0) : prev))
    handleNewReading({ silent: true })
    showToast('저장된 사주를 삭제했습니다')
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    setError('')
    setCopied(false)

    if (!name.trim() || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    const editingId = user && profile ? selectedId : null
    if (!editingId) {
      setSelectedId(null)
      setShareToken(null)
      setIsShared(false)
      setResult('')
    }

    setLoading(true)
    try {
      const fullText = await analyzeSaju(
        { name: name.trim(), birthDate, birthTime, gender, calendarType },
        { onChunk: (text) => setResult(text) },
      )

      if (!user) {
        sessionStorage.setItem(
          PENDING_RESULT_KEY,
          JSON.stringify({
            name: name.trim(),
            birthDate,
            birthTime,
            gender,
            calendarType,
            result: fullText,
          }),
        )
        showToast('미리보기가 준비됐어요. 로그인하면 전체를 볼 수 있어요')
        return
      }

      if (!profile) {
        sessionStorage.setItem(
          PENDING_RESULT_KEY,
          JSON.stringify({
            name: name.trim(),
            birthDate,
            birthTime,
            gender,
            calendarType,
            result: fullText,
          }),
        )
        setShowOnboarding(true)
        showToast('전체 저장을 위해 프로필을 먼저 만들어 주세요')
        return
      }

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('saju_readings')
          .update(buildReadingPayload(fullText))
          .eq('id', editingId)
          .select('id, name, created_at, share_token, is_shared')
          .single()

        if (updateError) {
          console.error(updateError)
          setError('사주 결과는 생성됐지만 수정 저장에 실패했습니다.')
          return
        }

        setSelectedId(data.id)
        setShareToken(data.share_token ?? null)
        setIsShared(Boolean(data.is_shared))
        setReadings((prev) => prev.map((item) => (item.id === editingId ? data : item)))
        showToast('사주가 수정되었습니다')
      } else {
        await saveCurrentResult(fullText, profile)
        showToast('사주가 저장되었습니다')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const showResultPanel = loading || result
  const viewingSaved = Boolean(selectedId && result && !loading)
  const paywallActive = Boolean(
    result && ((!user && !selectedId) || (user && !profile && !selectedId)),
  )
  const isPaywalled = Boolean(paywallActive && !loading)
  const displayResult = paywallActive
    ? getPreviewResult(result, { knownFull: !loading })
    : result
  const canSubmit = Boolean(name.trim() && birthDate && gender) && !loading
  const isBusy = loading || deleting || profileSaving || sharing
  const shareUrl = shareToken ? getShareUrl(shareToken) : ''
  const userLabel = user ? getUserLabel(user, profile) : ''
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const blockingUi = Boolean(user && (showOnboarding || profileLoading))
  const formDisabled = isBusy

  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-hero">
          <img src={meongImg} alt="" className="meong-hero meong-float" />
          <p className="auth-loading">멍이 준비 중이에요…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`layout ${blockingUi ? 'is-blocked' : ''}`}>
      <aside className="sidebar" aria-label="저장된 사주 목록">
        <div className="sidebar-brand">
          <img src={meongImg} alt="" className="meong-sidebar" />
          <div>
            <p className="sidebar-brand-name">사주 전문가 멍</p>
            <p className="sidebar-brand-sub">다정하게, 정확하게</p>
          </div>
        </div>

        <div className="sidebar-heading">
          <h2 className="sidebar-title">저장된 사주</h2>
          {user && !listLoading && (
            <span className="sidebar-count">{readings.length}</span>
          )}
        </div>

        <button
          type="button"
          className="sidebar-new"
          onClick={handleNewReading}
          disabled={isBusy}
        >
          새 사주 보기
        </button>

        {!user ? (
          <div className="sidebar-guest">
            <p className="sidebar-empty">
              로그인하면 해석을 저장하고
              <span>언제든 다시 볼 수 있어요.</span>
            </p>
            <button
              type="button"
              className="google-btn sidebar-login"
              onClick={handleGoogleLogin}
              disabled={authBusy}
            >
              <span className="google-icon" aria-hidden="true">
                G
              </span>
              Google로 로그인
            </button>
          </div>
        ) : listLoading || profileLoading ? (
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
                  disabled={isBusy}
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
                  onClick={openProfileEdit}
                  disabled={isBusy || !profile || showOnboarding}
                >
                  프로필 수정
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleLogout}
                  disabled={authBusy || isBusy}
                >
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-user">
                <img src={meongImg} alt="" className="auth-avatar" />
                <div>
                  <p className="auth-name">게스트로 체험 중</p>
                  <p className="auth-email">전체 결과는 로그인 후 확인할 수 있어요</p>
                </div>
              </div>
              <div className="auth-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleGoogleLogin}
                  disabled={authBusy}
                >
                  {authBusy ? '로그인 중…' : 'Google 로그인'}
                </button>
              </div>
            </>
          )}
        </div>

        {profile && (
          <section className="profile-card">
            <div className="profile-card-header">
              <h2>내 프로필</h2>
              <button
                type="button"
                className="ghost-btn"
                onClick={openProfileEdit}
                disabled={isBusy}
              >
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
                <dd>
                  {profile.birth_time
                    ? String(profile.birth_time).slice(0, 5)
                    : '모름'}
                </dd>
              </div>
              <div>
                <dt>성별</dt>
                <dd>{formatGender(profile.gender)}</dd>
              </div>
            </dl>
          </section>
        )}

        <header className="app-header">
          <div className="app-header-row">
            <img src={meongImg} alt="" className="meong-header" />
            <div>
              <h1>사주 보기</h1>
              <p className="app-lead">
                {user
                  ? '멍이 프로필을 보고 흐름을 읽어 줄게요. 다정하게, 하지만 정확하게.'
                  : '로그인 없이 바로 체험해 보세요. 전체 해석은 로그인 후 열립니다.'}
              </p>
            </div>
          </div>
          {readingsCount != null && readingsCount > 0 && (
            <p className="trust-stat">
              총 <strong>{readingsCount.toLocaleString('ko-KR')}</strong>개의 사주가
              생성되었습니다
            </p>
          )}
        </header>

        {viewingSaved && (
          <div className="mode-banner" role="status">
            <div>
              <strong>{name}</strong>님의 저장된 사주를 보고 있습니다.
            </div>
            <button type="button" className="mode-banner-btn" onClick={handleNewReading}>
              새 사주 보기
            </button>
          </div>
        )}

        <form
          ref={formRef}
          className="saju-form"
          onSubmit={handleAnalyze}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={formDisabled}
            />
          </div>

          <div className="field">
            <label htmlFor="birthTime">태어난 시간</label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              disabled={formDisabled}
            />
          </div>

          <div className="field">
            <label htmlFor="gender">
              성별 <span className="required">필수</span>
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
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

        {error && !showOnboarding && !showProfileEdit && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {showResultPanel && (
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
                    <button type="button" className="ghost-btn" onClick={handleCopyResult}>
                      {copied ? '복사됨' : '복사'}
                    </button>
                    {selectedId && (
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={handleShareResult}
                        disabled={sharing}
                      >
                        {sharing ? '공유 준비 중…' : isShared ? '다시 공유' : '공유'}
                      </button>
                    )}
                    {viewingSaved && (
                      <button
                        type="button"
                        className="ghost-btn danger"
                        onClick={handleDeleteReading}
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

            {!loading && result && (
              <div className="meong-narrator">
                <img src={meongImg} alt="" className="meong-narrator-img" />
                <div>
                  <p className="meong-narrator-label">사주 전문가 멍</p>
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
                    <p className="result-generating-hint">멍이 해석을 쓰고 있어요…</p>
                  )}
                </>
              ) : (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayResult}
                  </ReactMarkdown>
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
                    <img src={meongImg} alt="" className="result-paywall-meong" />
                    <h3>나머지 해석이 잠겨 있어요</h3>
                    <p>
                      {user
                        ? '프로필을 저장하면 전체 결과와 저장 기능을 바로 쓸 수 있어요.'
                        : '로그인하면 전체 해석을 보고, 저장·공유까지 이어갈 수 있어요.'}
                    </p>
                    {user ? (
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => setShowOnboarding(true)}
                      >
                        프로필 저장하고 전체 보기
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="google-btn"
                        onClick={handleGoogleLogin}
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
                <button type="button" className="ghost-btn" onClick={handleNewReading}>
                  새 사주 보기
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {(showOnboarding || showProfileEdit) && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <h2 id="profile-modal-title">
              {showOnboarding ? '프로필 정보를 입력해 주세요' : '프로필 수정'}
            </h2>
            <p className="modal-lead">
              {showOnboarding
                ? sessionStorage.getItem(PENDING_RESULT_KEY)
                  ? '거의 다 왔어요. 프로필만 저장하면 잠겨 있던 전체 해석이 바로 열려요.'
                  : '처음 오셨네요. 멍이 사주를 보려면 기본 정보가 필요해요. 저장해 두면 다음부터 바로 불러올게요.'
                : '저장된 프로필은 새 사주 해석 시 자동으로 불러와요.'}
            </p>

            <form className="modal-form" onSubmit={handleSaveProfile} noValidate>
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
                    onClick={() => {
                      setShowProfileEdit(false)
                      setError('')
                    }}
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
      )}

      {toast && (
        <div
          className={`toast ${toastLeaving ? 'is-leaving' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
