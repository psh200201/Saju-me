export function getPreviewResult(text, { knownFull = true } = {}) {
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
