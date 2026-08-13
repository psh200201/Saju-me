export function formatGender(value) {
  if (value === 'male') return '남성'
  if (value === 'female') return '여성'
  return ''
}

export function formatCalendar(value) {
  return value === 'lunar' ? '음력' : '양력'
}

export function formatShortDate(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${Number(match[2])}월 ${Number(match[3])}일`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function getUserLabel(user, profile) {
  return (
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '사용자'
  )
}

export function formatBirthTime(value) {
  if (!value) return '모름'
  return String(value).slice(0, 5)
}
