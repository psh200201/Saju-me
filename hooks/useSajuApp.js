import { useEffect, useRef, useState } from 'react'
import { PENDING_RESULT_KEY } from '../constants/storage.js'
import { trackEvent } from '../lib/analytics.js'
import { analyzeSaju } from '../lib/gemini.js'
import { supabase } from '../lib/supabase.js'
import { getUserLabel } from '../utils/format.js'
import { getPreviewResult } from '../utils/preview.js'
import {
  buildReadingPayload,
  buildUserPayload,
  emptyProfileForm,
  getProfileFieldErrors,
  profileToForm,
} from '../utils/profileForm.js'
import { getShareUrl } from '../utils/share.js'

export function useSajuApp() {
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

  const [form, setForm] = useState(emptyProfileForm())
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

  const { name, birthDate, birthTime, gender, calendarType } = form

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
    setForm(profileToForm(nextProfile))
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

  async function loadReadings(currentUser = user) {
    if (!currentUser) {
      setReadings([])
      setListLoading(false)
      return
    }

    setListLoading(true)
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, name, birth_date, created_at')
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

  async function saveCurrentResult(
    fullText = result,
    profileReady = profile,
    snapshot = null,
    currentUser = user,
    currentForm = form,
  ) {
    if (!currentUser || !profileReady || !fullText) return null

    const { data, error: insertError } = await supabase
      .from('saju_readings')
      .insert({
        name: (snapshot?.name ?? currentForm.name).trim() || profileReady.name,
        birth_date:
          snapshot?.birthDate || currentForm.birthDate || profileReady.birth_date,
        birth_time:
          snapshot?.birthTime ||
          currentForm.birthTime ||
          profileReady.birth_time ||
          null,
        gender: snapshot?.gender || currentForm.gender || profileReady.gender,
        calendar_type:
          snapshot?.calendarType ||
          currentForm.calendarType ||
          profileReady.calendar_type,
        result: fullText,
        user_id: currentUser.id,
      })
      .select('id, name, birth_date, created_at, share_token, is_shared')
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
      await loadReadings(user)

      const raw = sessionStorage.getItem(PENDING_RESULT_KEY)
      if (!raw) {
        if (!nextProfile) setShowOnboarding(true)
        return
      }

      try {
        const pending = JSON.parse(raw)
        if (pending?.result) {
          const pendingForm = {
            name: pending.name ?? '',
            birthDate: pending.birthDate ?? '',
            birthTime: pending.birthTime ?? '',
            gender: pending.gender ?? '',
            calendarType: pending.calendarType ?? 'solar',
          }
          setForm(pendingForm)
          setResult(pending.result)
          setSelectedId(null)
          setShareToken(null)
          setIsShared(false)
          setResultRevealKey((key) => key + 1)

          if (nextProfile) {
            try {
              await saveCurrentResult(pending.result, nextProfile, pending, user, pendingForm)
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

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!user) return

    const mode = showOnboarding ? 'onboarding' : 'edit'
    trackEvent('save_profile', { mode })

    const nextErrors = getProfileFieldErrors(profileForm)
    setProfileErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setError('이름, 생년월일, 성별은 필수입니다.')
      return
    }

    setProfileSaving(true)
    setError('')

    const payload = buildUserPayload(user.id, profileForm)
    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, updated_at')
      .single()

    setProfileSaving(false)

    if (saveError) {
      console.error(saveError)
      trackEvent('save_profile_error', { mode })
      setError('프로필 저장에 실패했습니다.')
      return
    }

    const wasOnboarding = showOnboarding
    trackEvent('save_profile_success', { mode })
    setProfile(data)
    setShowOnboarding(false)
    setShowProfileEdit(false)
    applyProfileToForm(data)

    const pendingRaw = sessionStorage.getItem(PENDING_RESULT_KEY)
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw)
        if (pending?.result && !selectedId) {
          const pendingForm = {
            name: pending.name ?? data.name,
            birthDate: pending.birthDate ?? data.birth_date,
            birthTime: pending.birthTime ?? '',
            gender: pending.gender ?? data.gender,
            calendarType: pending.calendarType ?? data.calendar_type,
          }
          setForm(pendingForm)
          setResult(pending.result)
          await saveCurrentResult(pending.result, data, pending, user, pendingForm)
          showToast('전체 결과가 저장되었습니다')
          return
        }
      } catch (err) {
        console.error(err)
      }
    }

    if (!selectedId && result) {
      try {
        await saveCurrentResult(result, data, null, user, profileToForm(data))
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
    trackEvent('open_profile_edit')
    setProfileForm(profileToForm(profile))
    setProfileErrors({})
    setError('')
    setShowProfileEdit(true)
  }

  function openOnboarding() {
    trackEvent('open_onboarding', { source: 'paywall' })
    setShowOnboarding(true)
  }

  async function handleSelectReading(id) {
    trackEvent('select_reading')
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

    setForm({
      name: data.name ?? '',
      birthDate: data.birth_date ?? '',
      birthTime: data.birth_time ? String(data.birth_time).slice(0, 5) : '',
      gender: data.gender ?? '',
      calendarType: data.calendar_type ?? 'solar',
    })
    setResult(data.result ?? '')
    setShareToken(data.share_token ?? null)
    setIsShared(Boolean(data.is_shared))
    setResultRevealKey((key) => key + 1)
  }

  function handleNewReading({ silent = false } = {}) {
    if (!silent) trackEvent('new_reading')
    sessionStorage.removeItem(PENDING_RESULT_KEY)
    const alreadyOnNewPage = !selectedId && !result && !loading

    if (alreadyOnNewPage) {
      applyProfileToForm(profile)
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        formRef.current?.classList.remove('is-attention')
        void formRef.current?.offsetWidth
        formRef.current?.classList.add('is-attention')
      })
      if (!silent) showToast('이미 새 사주 화면이 열려 있어요')
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
    if (!silent) showToast('새 사주 화면으로 이동했어요')
  }

  async function handleGoogleLogin(source = 'unknown') {
    trackEvent('login_click', { method: 'google', source })
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
      trackEvent('login_error', { method: 'google', source })
      setError('Google 로그인에 실패했습니다.')
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    trackEvent('logout')
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
      trackEvent('copy_result_blocked')
      showToast('전체 복사는 로그인 후 가능해요')
      return
    }
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      trackEvent('copy_result')
      showToast('해석 내용을 복사했습니다')
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error(err)
      setError('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
    }
  }

  async function handleShareResult() {
    if (!selectedId) {
      setError('먼저 저장된 사주 결과에서 공유해 주세요.')
      return
    }

    trackEvent('share_result_click')
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
      trackEvent('share_result_error')
      setError('공유 링크를 만들지 못했습니다.')
      return
    }

    setShareToken(data.share_token)
    setIsShared(true)

    const shareUrl = getShareUrl(data.share_token)
    const shareTitle = `${name}님 사주 해석`
    const shareText = '아코가 풀어 준 사주 결과를 확인해 보세요.'

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        trackEvent('share_result', { method: 'native' })
        showToast('공유했어요')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      trackEvent('share_result', { method: 'clipboard' })
      showToast('공유 링크를 복사했습니다')
    } catch (err) {
      if (err?.name === 'AbortError') {
        trackEvent('share_result_cancel')
        return
      }
      try {
        await navigator.clipboard.writeText(shareUrl)
        trackEvent('share_result', { method: 'clipboard_fallback' })
        showToast('공유 링크를 복사했습니다')
      } catch (copyError) {
        console.error(copyError)
        trackEvent('share_result_error')
        setError('공유에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    }
  }

  async function handleDeleteReading() {
    if (!selectedId) return
    const ok = window.confirm('이 저장된 사주를 삭제할까요?')
    if (!ok) {
      trackEvent('delete_reading_cancel')
      return
    }

    trackEvent('delete_reading')
    setDeleting(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', selectedId)

    setDeleting(false)

    if (deleteError) {
      console.error(deleteError)
      trackEvent('delete_reading_error')
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
    trackEvent('generate_reading', {
      calendar_type: calendarType,
      has_birth_time: Boolean(birthTime),
      is_guest: !user,
      is_rerun: Boolean(editingId),
    })

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
        trackEvent('generate_reading_success', { mode: 'guest_preview' })
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
        trackEvent('generate_reading_success', { mode: 'needs_profile' })
        setShowOnboarding(true)
        showToast('전체 저장을 위해 프로필을 먼저 만들어 주세요')
        return
      }

      if (editingId) {
        const { data, error: updateError } = await supabase
          .from('saju_readings')
          .update(buildReadingPayload(user.id, form, fullText))
          .eq('id', editingId)
          .select('id, name, birth_date, created_at, share_token, is_shared')
          .single()

        if (updateError) {
          console.error(updateError)
          trackEvent('generate_reading_save_error', { mode: 'update' })
          setError('사주 결과는 생성됐지만 수정 저장에 실패했습니다.')
          return
        }

        setSelectedId(data.id)
        setShareToken(data.share_token ?? null)
        setIsShared(Boolean(data.is_shared))
        setReadings((prev) => prev.map((item) => (item.id === editingId ? data : item)))
        trackEvent('generate_reading_success', { mode: 'updated' })
        showToast('사주가 수정되었습니다')
      } else {
        await saveCurrentResult(fullText, profile)
        trackEvent('generate_reading_success', { mode: 'saved' })
        showToast('사주가 저장되었습니다')
      }
    } catch (err) {
      console.error(err)
      trackEvent('generate_reading_error')
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

  return {
    authLoading,
    blockingUi,
    user,
    profile,
    profileLoading,
    profileForm,
    setProfileForm,
    profileErrors,
    profileSaving,
    showOnboarding,
    showProfileEdit,
    setShowOnboarding,
    setShowProfileEdit,
    setError,
    form,
    setForm,
    result,
    loading,
    listLoading,
    error,
    readings,
    selectedId,
    shareToken,
    isShared,
    sharing,
    resultRevealKey,
    toast,
    toastLeaving,
    copied,
    deleting,
    readingsCount,
    authBusy,
    resultRef,
    formRef,
    profileNameRef,
    showResultPanel,
    viewingSaved,
    paywallActive,
    isPaywalled,
    displayResult,
    canSubmit,
    isBusy,
    shareUrl,
    userLabel,
    userAvatar,
    formDisabled,
    handleSaveProfile,
    openProfileEdit,
    openOnboarding,
    handleSelectReading,
    handleNewReading,
    handleGoogleLogin,
    handleLogout,
    handleCopyResult,
    handleShareResult,
    handleDeleteReading,
    handleAnalyze,
  }
}
