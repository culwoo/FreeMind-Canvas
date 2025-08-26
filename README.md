# 🧠 FreeMind Canvas AI

AI-powered mind mapping canvas application with intelligent drawing analysis.

[![Deploy Backend](https://img.shields.io/badge/deploy-railway-0066cc)](https://railway.app)
[![Deploy Frontend](https://img.shields.io/badge/deploy-vercel-000000)](https://vercel.com)

## 🏗️ Architecture

This is a monorepo containing:
- **Frontend** (`/frontend`) - Static web app deployed on Vercel
- **Backend** (`/backend`) - API proxy server deployed on Railway

## 🚀 Quick Deploy

### Automatic Deployment (Recommended)
1. **Fork this repository**
2. **Deploy Backend to Railway**: Connect your GitHub repo to Railway
3. **Deploy Frontend to Vercel**: Connect your GitHub repo to Vercel
4. **Set Environment Variables** (see below)

### Environment Variables

#### Railway (Backend)
```
ANTHROPIC_API_KEY=your_api_key_here
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

#### Vercel (Frontend) 
No environment variables needed - handled automatically via `config.js`

## 💻 Local Development

AI 기반 마인드맵 캔버스 애플리케이션

## ✨ 주요 기능

- 🎨 **직관적인 그리기**: 펜, 텍스트, 도형, 지우개 도구
- 🎯 **스마트 AI 도우미**: 사고 확장을 위한 AI 질문 생성
- 💾 **자동 저장**: 30초마다 자동으로 작업 저장
- 📱 **반응형 디자인**: 데스크톱과 모바일 지원
- 🌙 **다크 모드**: 자동/수동 다크 모드 지원
- ⚡ **PWA**: 오프라인에서도 사용 가능

## 🚀 개발 환경 설정

### 필요 조건
- Node.js 16.0.0 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Vite + CORS 프록시)
npm run dev

# 대안: Express 프록시 서버 실행 (CORS 완전 해결)
npm run dev:proxy

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

#### ⚠️ CORS 이슈 해결

AI 기능을 위해 Anthropic API를 호출하므로 CORS 이슈가 발생할 수 있습니다. 다음 방법으로 해결하세요:

**방법 1: Vite 개발 서버 (권장)**
```bash
npm run dev
# → http://localhost:3000 (자동으로 브라우저 열림)
# → Vite 내장 프록시로 CORS 해결
```

**방법 2: Express 프록시 서버**
```bash
npm run dev:proxy
# → http://localhost:3001 (수동으로 브라우저에서 접속)
# → Express 기반 완전한 CORS 해결
```

### 테스트

```bash
# 테스트 실행
npm test

# 테스트 감시 모드
npm run test:watch

# 테스트 UI
npm run test:ui
```

### 코드 품질

```bash
# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix
```

## 🏗️ 프로젝트 구조

```
freemind-canvas-ai/
├── index.html          # 메인 HTML 파일
├── app.js             # 메인 JavaScript 로직
├── style.css          # 스타일시트
├── test/              # 테스트 파일들
│   ├── setup.js       # 테스트 환경 설정
│   └── app.test.js    # 메인 테스트
├── package.json       # 의존성 및 스크립트
├── vite.config.js     # Vite 설정
└── .eslintrc.json     # ESLint 설정
```

## 🔧 설정

애플리케이션 설정은 `app.js` 상단의 `CONFIG` 객체에서 관리됩니다:

```javascript
const CONFIG = {
    canvas: {
        width: 2000,
        height: 1500,
        maxWidth: 2000,
        maxHeight: 1500,
        margin: 32
    },
    drawing: {
        defaultPenSize: 5,
        defaultEraserSize: 20,
        penSizes: [2, 5, 10, 15, 20],
        eraserSizes: [10, 20, 40, 60, 80],
        defaultColor: '#000000'
    },
    history: {
        maxSize: 30  // 실행취소 히스토리 최대 개수
    },
    autoSave: {
        intervalMs: 30000  // 자동 저장 간격 (밀리초)
    },
    ai: {
        loadingDelayMs: 1500,
        maxQuestions: 3
    }
};
```

## 📱 사용법

1. **그리기**: 펜 도구를 선택하고 캔버스에 그리기
2. **텍스트 추가**: 캔버스를 더블클릭하여 텍스트 입력
3. **색상 변경**: 색상 팔레트에서 원하는 색상 선택
4. **크기 조절**: 브러시 크기 버튼으로 펜/지우개 크기 조절
5. **AI 도움**: 'AI 도움' 버튼을 클릭하여 사고 확장 질문 받기
6. **실행취소/다시실행**: Ctrl+Z/Ctrl+Y 또는 버튼 사용

## 🔒 보안

- Content Security Policy (CSP) 적용
- 안전한 localStorage 사용
- XSS 방지를 위한 입력 검증

## 🎯 성능 최적화

- 히스토리 크기 제한으로 메모리 사용량 관리
- 효율적인 캔버스 렌더링
- CSS 하드웨어 가속 애니메이션
- 자동 저장 쓰로틀링

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 GitHub Issues를 통해 연락해 주세요.