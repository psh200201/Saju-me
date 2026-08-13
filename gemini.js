import { SAJU_SYSTEM_PROMPT } from './sajuSystemPrompt.js'
import { GEMINI_API_KEY } from 'virtual:gemini-env'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'

/**
 * 사주 해석을 스트리밍으로 요청한다.
 * @param {object} form
 * @param {{ onChunk?: (text: string) => void }} [options]
 * @returns {Promise<string>}
 */
export async function analyzeSaju(form, { onChunk } = {}) {
  const apiKey = GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 .env에 없습니다. 개발 서버를 재시작해 주세요.')
  }

  const genderLabel =
    form.gender === 'male' ? '남성' : form.gender === 'female' ? '여성' : '미선택'
  const calendarLabel = form.calendarType === 'lunar' ? '음력' : '양력'

  const input = `사주 전문가 멍의 시선으로 다음 사람의 사주를 해석해 주세요.
다정한 말투로 말하되, 분석은 냉철하고 명확하게 해 주세요.

- 이름: ${form.name}
- 생년월일: ${form.birthDate} (${calendarLabel})
- 태어난 시간: ${form.birthTime || '모름'}
- 성별: ${genderLabel}

위 정보를 바탕으로 사주명식을 구성하고, 성격·기질·재능을 분석해 주세요.`

  const response = await fetch(`${API_URL}?alt=sse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'gemini-3.6-flash',
      system_instruction: SAJU_SYSTEM_PROMPT,
      input,
      stream: true,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const message =
      data?.error?.message ||
      data?.message ||
      `Gemini API 오류 (${response.status})`
    throw new Error(message)
  }

  if (!response.body) {
    throw new Error('스트리밍 응답을 받을 수 없습니다.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE는 빈 줄로 이벤트 구분
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) {
      const dataLines = rawEvent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())

      if (dataLines.length === 0) continue
      const payload = dataLines.join('\n')
      if (!payload || payload === '[DONE]') continue

      let event
      try {
        event = JSON.parse(payload)
      } catch {
        continue
      }

      const chunk = extractDeltaText(event)
      if (chunk) {
        fullText += chunk
        onChunk?.(fullText)
        continue
      }

      // 완료 이벤트에 전체 텍스트가 오는 경우
      const completeText =
        event.output_text ||
        event.outputText ||
        extractTextFromSteps(event.steps) ||
        extractTextFromOutputs(event.outputs)

      if (completeText && completeText.length > fullText.length) {
        fullText = completeText
        onChunk?.(fullText)
      }
    }
  }

  if (!fullText.trim()) {
    throw new Error('Gemini 응답이 비어 있습니다.')
  }

  return fullText
}

/** Interactions API SSE 이벤트에서 텍스트 조각 추출 */
function extractDeltaText(event) {
  if (!event || typeof event !== 'object') return ''

  const eventType = event.event_type || event.eventType || event.type || ''

  const delta = event.delta
  if (delta) {
    if (typeof delta === 'string') return delta
    if (delta.type === 'text' && typeof delta.text === 'string') return delta.text
    if (typeof delta.text === 'string') return delta.text
    if (typeof delta.content === 'string') return delta.content
  }

  // content 배열 안의 text
  const content = event.content || event.step?.content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part?.type === 'text' && part.text) return part.text
        return part?.text || ''
      })
      .join('')
  }

  if (
    typeof event.text === 'string' &&
    (String(eventType).includes('delta') || eventType === 'text')
  ) {
    return event.text
  }

  return ''
}

function extractTextFromSteps(steps) {
  if (!Array.isArray(steps)) return ''
  const texts = []
  for (const step of steps) {
    const content = step?.content
    if (typeof content === 'string') {
      texts.push(content)
      continue
    }
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (part?.type === 'text' && part.text) texts.push(part.text)
      else if (part?.text) texts.push(part.text)
    }
  }
  return texts.join('\n').trim()
}

function extractTextFromOutputs(outputs) {
  if (!Array.isArray(outputs)) return ''
  return outputs
    .map((o) => o?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim()
}