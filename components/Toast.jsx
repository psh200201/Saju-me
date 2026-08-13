export function Toast({ message, leaving }) {
  if (!message) return null
  return (
    <div className={`toast ${leaving ? 'is-leaving' : ''}`} role="status">
      {message}
    </div>
  )
}
