# Crawler Network

**Autonomous Web Crawler Network for Vmap & Review Services**

인터넷에서 최신 정보를 가장 빠르게 발견하여, 연결된 서비스들이 경쟁자보다 먼저 콘텐츠를 생성하고 SEO를 선점할 수 있도록 지원하는 독립적인 크롤러 네트워크 시스템.

## 핵심 구조

```
Crawler Network (독립 운영)
    ↓
Information Pool (정보 저장소)
    ↓              ↓
Vmap AI        Review AI
(채택 판단)     (채택 판단)
    ↓              ↓
비디오맵 페이지   리뷰 페이지
```

## 설계 철학

- 크롤러는 서비스에 종속되지 않음 — 범용 정보 수집
- 각 서비스 AI가 독립적으로 채택 판단
- 보상 시스템으로 크롤러 자가 학습/개선
- 서비스 추가 시 크롤러 코드 변경 없음

## 아키텍처

> 전체 다이어그램은 [Architecture 문서](./docs/ARCHITECTURE.md) 참조

![System Context](./docs/images/01-system-context.jpg)

## 문서

- [📐 아키텍처 (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md) — 시스템 다이어그램 5장
- [설계 문서 (DESIGN.md)](./DESIGN.md) — 전체 시스템 설계
- [연동 가이드 (INTEGRATION_GUIDE.md)](./INTEGRATION_GUIDE.md) — 서비스 개발자용

## 기술 스택

- Next.js (App Router) + Drizzle ORM
- Neon PostgreSQL (별도 프로젝트)
- 크롤러: Node.js 프로세스 (Mac Mini 로컬)
- 캐시: 로컬 메모리 → Upstash Redis (추후)
- 배포: Vercel

## 연결 서비스

| 서비스 | URL |
|--------|-----|
| CPrice Review | reviews.cprice.co |
| VMAP | vmaps.cprice.co |

## Team

- 태성 정 (@hotdrink7) — 프로젝트 기획/관리
- Andy Shim (@lanore78) — 개발환경/아키텍처
- 모모 (AI) — 크롤러 네트워크 개발
