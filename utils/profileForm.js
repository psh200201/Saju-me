export function emptyProfileForm() {
  return {
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    calendarType: 'solar',
  }
}

export function profileToForm(profile) {
  if (!profile) return emptyProfileForm()
  return {
    name: profile.name ?? '',
    birthDate: profile.birth_date ?? '',
    birthTime: profile.birth_time ? String(profile.birth_time).slice(0, 5) : '',
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? 'solar',
  }
}

export function getProfileFieldErrors(values) {
  const nextErrors = {}
  if (!values.name.trim()) nextErrors.name = true
  if (!values.birthDate) nextErrors.birthDate = true
  if (!values.gender) nextErrors.gender = true
  return nextErrors
}

export function buildUserPayload(userId, values) {
  return {
    id: userId,
    name: values.name.trim(),
    birth_date: values.birthDate,
    birth_time: values.birthTime || null,
    gender: values.gender,
    calendar_type: values.calendarType,
  }
}

export function buildReadingPayload(userId, form, resultText) {
  return {
    name: form.name.trim(),
    birth_date: form.birthDate,
    birth_time: form.birthTime || null,
    gender: form.gender,
    calendar_type: form.calendarType,
    result: resultText,
    user_id: userId,
  }
}
