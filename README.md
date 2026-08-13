# Saju-me

이름·생년월일·태어난 시간·성별·양력/음력을 입력하면 **Gemini API**로 사주를 해석해 주는 웹 서비스입니다.

## 주요 기능

- Google 로그인 (Supabase Auth)
- 유저 프로필(`users`) 저장 및 첫 로그인 프로필 모달
- 사주 입력 폼 (프로필 자동 불러오기)
- Gemini `gemini-3.6-flash` 기반 사주 해석
- 해석 결과 **실시간 스트리밍**
- 사주 결과(`saju_readings`) 저장/조회/수정/삭제
- 결과 공유 링크 (`/result/:token`, 로그인 없이 열람)
- 사이드바 히스토리

## 기술 스택

- React + Vite
- Supabase (Auth, Database, RLS)
- Google Gemini Interactions API
- react-markdown, remark-gfm

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고해 프로젝트 루트에 `.env`를 만듭니다.

```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```

`.env`는 Git에 올리지 마세요.

### 3. Supabase Google 로그인 설정

1. **Authentication → Sign In / Providers → Google**에서 Enable 후 Client ID / Secret 저장
2. Google Cloud Console OAuth 클라이언트의 **Authorized redirect URI**에 아래를 등록합니다.
   - `https://kswamtxpbdaarnmdunju.supabase.co/auth/v1/callback`
3. **Authentication → URL Configuration**에 앱 주소를 추가합니다.
   - Site URL (로컬): `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
   - 배포 시 Netlify URL도 Redirect URLs에 추가

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 표시되는 주소(예: `http://localhost:5173`)로 접속합니다.

## 빌드

```bash
npm run build
npm run preview
```

## Netlify / Vercel 배포

1. GitHub 저장소를 배포 플랫폼에 연결합니다.
2. 환경 변수에 아래를 추가합니다.
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. 배포 후 Supabase Redirect URLs에 사이트 URL을 추가합니다.
   - 예: `https://saju-me-woad.vercel.app/**`
4. **Trigger deploy**로 다시 배포합니다.

공개 사이트: https://saju-me-woad.vercel.app/

## 프로젝트 구조

```
App.jsx              # 로그인, 입력 폼, CRUD, 스트리밍 UI
App.css / index.css  # 스타일
gemini.js            # Gemini API 스트리밍 호출
supabase.js          # Supabase 클라이언트
sajuSystemPrompt.js  # 사주 해석 시스템 프롬프트
vite.config.js       # Vite 설정 (env 주입 플러그인)
```

## 라이선스

개인 학습·프로젝트용입니다.
