import { mascots } from '../assets/mascots.js'

export function GuestGuide() {
  return (
    <div className="mascot-guide size-md">
      <img src={mascots.profile} alt="" className="mascot-illust" />
      <div>
        <p className="mascot-guide-title">먼저 기본 정보만 알려 주세요</p>
        <p className="mascot-guide-text">
          이름·생년월일·성별이면 충분해요. 아코가 바로 흐름을 읽어 줄게요.
        </p>
      </div>
    </div>
  )
}
