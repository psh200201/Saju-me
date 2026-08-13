# 사주-me

[사주-me](https://saju-me-woad.vercel.app/)는 **사주 전문가 아코**와 함께하는 AI 사주 해석 서비스입니다.  
이름·생년월일·성별(선택: 태어난 시간, 양력/음력)을 입력하면 Gemini가 다정하지만 정확하게 성격·기질·재능을 풀어 줍니다.

**공개 사이트:** https://saju-me-woad.vercel.app/

## 주요 기능

- **게스트 미리보기** — 로그인 없이 해석 일부를 먼저 확인, 전체는 로그인 후 열람
- **Google 로그인** (Supabase Auth) — 전체 결과·저장·공유 이용
- **유저 프로필** — 첫 로그인 온보딩 / 프로필 수정, 이후 폼 자동 채움
- **사주 해석** — Gemini `gemini-3.6-flash`, 결과 **실시간 스트리밍**
- **히스토리 CRUD** — 저장·조회·수정·삭제, 사이드바 목록
- **공유 링크** — `/result/:shareToken` (로그인 없이 열람)
- **SEO·분석** — OG 메타, sitemap/robots, Google Analytics 4 이벤트 추적

## 기술 스택

| 영역 | 사용 |
|------|------|
| UI | React 19 + Vite |
| 라우팅 | react-router-dom |
| 백엔드 | Supabase (Auth, Postgres, RLS) |
| AI | Google Gemini (`@google/genai`) |
| 마크다운 | react-markdown, remark-gfm |
| 분석 | Google Analytics 4 (gtag) |

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.example`을 참고해 프로젝트 루트에 `.env`를 만듭니다.

```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```

`.env`는 Git에 올리지 마세요.

### 3. Supabase Google 로그인

1. **Authentication → Sign In / Providers → Google**에서 Enable 후 Client ID / Secret 저장
2. Google Cloud Console OAuth 클라이언트의 **Authorized redirect URI**에 등록  
   - `https://<project-ref>.supabase.co/auth/v1/callback`
3. **Authentication → URL Configuration**
   - Site URL (로컬): `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
   - 배포 URL도 Redirect URLs에 추가 (예: `https://saju-me-woad.vercel.app/**`)

### 4. 개발 서버

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 등으로 접속합니다.

## 빌드

```bash
npm run build
npm run preview
```

## Vercel 배포

1. GitHub 저장소를 Vercel에 연결합니다.
2. 환경 변수에 아래를 추가합니다.
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. 배포 후 Supabase Redirect URLs에 사이트 URL을 추가합니다.
4. 필요 시 **Redeploy**로 다시 배포합니다.

## 프로젝트 구조

```
App.jsx                 # 페이지 조립
main.jsx                # 라우터 + SPA page_view
components/             # Sidebar, Form, Result, Auth, Profile 등
hooks/useSajuApp.js     # 앱 상태·핸들러·GA 이벤트
pages/SharedResultPage.jsx
lib/
  analytics.js          # gtag 헬퍼
  gemini.js             # 사주 해석 API
  supabase.js
  sajuSystemPrompt.js
utils/                  # format, preview, profile, share
styles/                 # app.css, index.css
assets/                 # 아코 마스코트
public/                 # favicon, OG, sitemap, robots, GSC 검증
```

## 라이선스

개인 학습·프로젝트용입니다.
