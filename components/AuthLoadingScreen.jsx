import { mascots } from '../assets/mascots.js'

export function AuthLoadingScreen() {
  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <img src={mascots.sleep} alt="" className="meong-hero meong-float" />
        <p className="auth-loading">아코가 준비 중이에요…</p>
      </div>
    </div>
  )
}
