# Autonomous Web Crawler Network — 설계 문서

> 작성일: 2026-03-14
> 최종 수정: 2026-03-15
> 작성자: 모모 (크롤러 네트워크 AI)
> 참여자: 태성 정, Andy Shim (빈구)

---

## 1. 프로젝트 개요

### 1.1 목적
인터넷에서 **최신 정보를 가장 빠르게 발견**하여, 연결된 서비스들이 **경쟁자보다 먼저 콘텐츠를 생성**하고 **SEO를 선점**할 수 있도록 지원하는 **독립적인 크롤러 네트워크 시스템**.

### 1.2 연결 서비스
| 서비스 | 설명 | URL |
|--------|------|-----|
| CPrice Review | AI 제품 리뷰 작성/업데이트, 구매 행동 분석, 개인 맞춤 추천 | reviews.cprice.co |
| VMAP | 주제별 아티클 + 유튜브 영상 큐레이션, 학습 경로 제공 | vmaps.cprice.co |

### 1.3 핵심 장점
- **SEO 선점** — 남들보다 빠르게 발견 → 빠르게 콘텐츠 생성 → 검색 상위
- **자가 개선** — 보상 기반 학습으로 시간이 갈수록 똑똑해짐
- **확장성** — 서비스 추가 시 크롤러 변경 없음
- **24시간 자동 운영** — 크롤러 발견 → AI 생성 → 사용자 피드백 → 개선
- **데이터 자산** — 수집된 정보 자체가 가치

---

## 2. 핵심 설계 철학

### 2.1 크롤러는 서비스에 종속되지 않는다

크롤러는 Vmap이나 Review 서비스가 뭘 원하는지 **모른다**. 인터넷에서 유용해 보이는 정보를 최대한 빨리, 풍부하게 수집할 뿐이다.

### 2.2 판단은 서비스 AI가 한다

수집된 정보를 각 서비스 AI가 독립적으로 검토하고 채택 여부를 결정한다. 크롤러는 type 분류(제품/뉴스/트렌드)를 하지 않는다.

### 2.3 보상이 방향을 설정한다

크롤러에게 "무엇을 찾아라"고 지시하지 않는다. 보상 시스템에 의해 자연스럽게 가치 있는 정보를 찾는 방향으로 수렴한다.

### 2.4 범용 데이터, 서비스별 가공

크롤러는 범용 데이터(URL, 제목, 본문, 뷰카운트, 시각)를 수집하고, 서비스별로 필요한 추가 데이터(ASIN, 영상 URL 등)는 서비스 쪽에서 가공한다. 서비스가 추가돼도 크롤러 코드/포맷은 변경 없고, 탐색 소스만 추가하면 된다.

### 2.5 크롤러 시스템은 데이터를 영구 보관하지 않는다

수집된 정보는 크롤러 시스템 DB에 임시 저장되고, 서비스가 가져가서 채택/기각 처리가 완료되면 일정 기간 후 삭제한다. 보상 기록과 학습 통계만 영구 보관한다.

---

## 3. 시스템 아키텍처

### 3.1 전체 구조

```
┌──────────────────────────────────────────┐
│         크롤러 시스템 (독립 운영)           │
│                                          │
│  Crawler #1   Crawler #2   Crawler #N    │
│  (Tech News)  (Products)   (Trends)      │
│       │           │           │          │
│       └───────────┼───────────┘          │
│                   ↓                      │
│         ┌──────────────────┐             │
│         │   DB + API 서버   │             │
│         │ (임시 저장/경유지) │             │
│         └────────┬─────────┘             │
│                  │                       │
│         ┌────────┴─────────┐             │
│         │   보상 시스템      │             │
│         │ (계산/학습/통계)   │             │
│         └────────┬─────────┘             │
└──────────────────┼───────────────────────┘
                   │ API
        ┌──────────┼──────────┐
        ↓                     ↓
  ┌───────────┐         ┌───────────┐
  │ Review AI │         │  Vmap AI  │
  │ 채택/보상  │         │ 채택/보상  │
  └─────┬─────┘         └─────┬─────┘
        ↓                     ↓
  리뷰 페이지 생성        비디오맵 생성
        ↓                     ↓
     성과 측정              성과 측정
        ↓                     ↓
   성과 데이터 전달       성과 데이터 전달
```

---

## 4. 크롤러 설계

### 4.1 크롤러의 역할
- 인터넷에서 **유용한 정보 후보를 발견**
- 트렌딩 뉴스, 새로운 기술/지식, 신제품, 제품 스펙/리뷰/출시 정보 등
- **판단하지 않음** — 가능한 많은 유용한 후보 정보를 수집
- **본문을 최대한 풍부하게** 수집 (URL만 보내면 서비스 AI 부담 증가)

### 4.2 수집 데이터 포맷 (범용)

```json
{
  "crawlerId": "crawler-42",
  "crawlerVersion": "v3.1",
  "sourceUrl": "https://...",
  "sourceSite": "techcrunch.com",
  "title": "Sony WF-1000XM6 Released",
  "content": "기사 본문 전체 텍스트...",
  "discoveredAt": "2026-03-14T14:30:00Z",
  "publishedAt": "2026-03-14T14:00:00Z",
  "viewCount": 125000,
  "imageUrls": ["https://..."],
  "language": "en",
  "tags": ["earbuds", "sony"]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `crawlerId` | ✅ | 크롤러 식별자 |
| `crawlerVersion` | ✅ | 크롤러 버전 (학습/롤백용) |
| `sourceUrl` | ✅ | 원본 URL (중복 감지) |
| `sourceSite` | ✅ | 출처 사이트 도메인 |
| `title` | ✅ | 제목 |
| `content` | ✅ | 본문 (풍부할수록 채택률 높음, 300자+ 권장) |
| `discoveredAt` | ✅ | 크롤러 발견 시각 (속도 측정) |
| `publishedAt` | 선택 | 원본 게시 시각 (속도 보상 가중치) |
| `viewCount` | 선택 | 페이지 조회수/upvote 등 (인기도 지표) |
| `imageUrls` | 선택 | 이미지 URL 목록 |
| `language` | 선택 | 콘텐츠 언어 |
| `tags` | 선택 | 키워드 태그 |

> **type 필드 없음** — 크롤러는 분류하지 않음. 서비스 AI가 판단.

### 4.3 다중 크롤러 구조

크롤러는 여러 개 운영:

- **병렬 수집** → 속도 향상
- **장애 격리** → 하나 차단돼도 나머지 계속 운영
- **전략 다양성** → 보상에 따라 자연 특화

```
초기: 모든 크롤러가 비슷하게 시작
  ↓ 보상 축적
결과: 각 크롤러가 자기만의 전략으로 특화
  - Crawler A → Tech News Specialist
  - Crawler B → Product Launch Hunter
  - Crawler C → Social Trend Finder
```

### 4.4 크롤러 행동 규칙

**탐색 소스 (초기)**
- 주요 뉴스 사이트 (Tech 위주)
- 제품 출시 사이트 (Amazon New Releases, Product Hunt)
- 커뮤니티 트렌드 (Reddit, YouTube 트렌드)
- 공식 브랜드 사이트

**탐색 주기 (사이트별 차등)**
- Tech News → 30분
- 제품 출시 사이트 → 1~2시간
- YouTube 트렌드 → 2~3시간
- 일반 블로그 → 6시간

**우선순위**
- 최신 게시물/업데이트/신제품 발표 우선

### 4.5 중복 처리
- **중복 정보 제출은 차단** — sourceUrl 기준 (Bloom Filter + DB UNIQUE)
- **중복 방문은 허용** — 같은 사이트를 여러 크롤러가 방문 OK (새 글 발견을 위해)
- 같은 주제/제품이지만 다른 URL → 서비스 AI가 판단

### 4.6 안티봇 대응
- 프록시 로테이션 (Residential 프록시 풀)
- User-Agent / 핑거프린트 로테이션
- 요청 간격 랜덤화 (1~5초)
- Playwright Stealth 모드 (JS 렌더링 필요 시)
- robots.txt 존중
- 도메인별 Rate Limiter

---

## 5. 보상 시스템

### 5.1 보상 구조

#### 1차 보상 — 채택 보상
서비스 AI가 크롤러의 정보를 채택하면 보상 지급.

**보상 가중치:**
- 채택 자체 = 기본 보상
- 속도 가산 = `publishedAt` → `discoveredAt` 차이가 작을수록 추가
- 콘텐츠 풍부함 가산 = 본문이 풍부할수록 추가

#### 2차 보상 — 성과 보상
채택된 정보로 생성된 콘텐츠의 성과에 따라 추가 보상.

**성과 지표:**
- 페이지 방문자 수
- 클릭률
- 사용자 체류시간
- 구매 전환 (Review의 경우)

**계산량 관리:**
- 성과 측정 기간 제한 (채택 후 30일)
- 일별 스냅샷 집계 → 상세 데이터 만료
- 크롤러별 요약 점수만 유지

### 5.2 보상 판단 주체

| 보상 | 판단 주체 | 방법 |
|------|----------|------|
| 1차 (채택) | 각 서비스 AI | 채택 시 크롤러 시스템에 알림 |
| 2차 (성과) | 각 서비스 | 성과 데이터를 주기적으로 크롤러 시스템에 전달 |

보상 계산은 **크롤러 시스템**이 수행. 서비스는 채택 여부와 성과 데이터만 전달.

### 5.3 추적 체인 (Traceability) — 필수

정보의 전체 수명을 추적:

```
submission(수집) → adoption(채택) → page(페이지 생성) → performance(성과) → reward(보상)
```

크롤러에게 "왜 보상받았는지" 피드백 제공:
- 어떤 소스에서
- 어떤 정보로
- 어떤 버전의 크롤러로
- 어떤 서비스에서 채택됐고
- 어떤 성과가 발생했는지

### 5.4 크롤러 학습

보상 데이터를 기반으로 크롤러가 자가 학습:

```
보상 높은 패턴 → 빈도 증가
보상 낮은 패턴 → 빈도 감소
보상 없는 패턴 → 점진적 중단
```

**버전별 성과 추적:**
```
crawler-42 v2.0 → 채택률 30%
crawler-42 v3.0 → 채택률 45%
crawler-42 v3.1 → 채택률 42% ← 퇴보 감지 → 롤백 판단 가능
```

---

## 6. API 플로우

### 6.1 전체 흐름

```
1단계: 크롤러 수집 → POST /api/submissions → 크롤러 시스템 DB 저장
       → sourceUrl 중복이면 skip
       → 저장 시 webhook으로 서비스에 알림

2단계: 서비스가 가져감
       ← webhook 수신 (Push, 기본)
       ← GET /api/submissions (Pull, 보완)

3단계: 서비스가 채택/기각 알림
       → POST /api/adoptions

4단계: 성과 발생 → 크롤러 시스템에 전달
       → POST /api/performance

5단계: 크롤러 학습
       ← GET /api/crawlers/{id}/rewards

6단계: 서비스 한도 관리
       → POST /api/services/{id}/status
       → 모든 서비스 비활성 → 크롤러 정지
```

### 6.2 API 엔드포인트

**크롤러 → 크롤러 시스템**
```
POST /api/submissions              정보 제출
GET  /api/crawlers/{id}/feedback   채택/기각 결과 조회
GET  /api/crawlers/{id}/rewards    보상 내역 조회
```

**서비스 → 크롤러 시스템**
```
GET  /api/submissions              검토할 정보 목록 조회
POST /api/adoptions                채택 알림
POST /api/performance              성과 데이터 전달
POST /api/services/{id}/status     서비스 상태 변경 (활성/비활성/한도)
```

**크롤러 관리**
```
POST /api/crawlers                 크롤러 등록
GET  /api/crawlers/{id}            크롤러 상태 조회
GET  /api/crawlers/{id}/stats      크롤러 통계 (버전별 포함)
```

### 6.3 인증

| 키 유형 | 용도 | 발급 |
|---------|------|------|
| Admin key | 서비스/크롤러 등록, 시스템 설정 | 수동 (초기) |
| Service key | 정보 조회, 채택 알림, 성과 전달 | 서비스 등록 시 |
| Crawler key | 정보 제출, 피드백 조회 | 크롤러 등록 시 |

> 서비스 등록은 초기에 CLI/수동으로 처리. Admin API는 서비스가 늘어나면 추가.

### 6.4 서비스 한도 관리

각 서비스는 일일 처리 한도를 설정:
```json
{
  "review": { "dailyLimit": 100, "todayCount": 73, "active": true },
  "vmap": { "dailyLimit": 50, "todayCount": 50, "active": false }
}
```

- 서비스가 `active: false` 알림 → 해당 서비스에 webhook 중단
- 모든 서비스 비활성 → 크롤러 정지
- 다음 날 자동 재개

---

## 7. 데이터베이스 스키마 (초안)

### 7.1 핵심 테이블

```sql
-- 크롤러 등록/관리
crawlers
  id, name, api_key, current_version, strategy, status, created_at

-- 수집 정보 저장 (임시, 처리 완료 후 일정 기간 후 삭제)
submissions
  id, crawler_id, crawler_version, source_url(UNIQUE), source_site,
  title, content, discovered_at, published_at, view_count,
  image_urls, language, tags,
  status(pending/adopted/rejected), created_at

-- 채택 기록
adoptions
  id, submission_id, service(review/vmap/...), page_id, page_url,
  adopted_at

-- 성과 기록 (스냅샷)
performance
  id, page_id, service, period(monthly),
  visitors, clicks, conversions, engagement_score,
  recorded_at

-- 보상 기록 (영구 보관)
rewards
  id, crawler_id, crawler_version, submission_id,
  type(adoption/performance), service, amount, reason,
  created_at

-- 크롤러 학습 요약 (영구 보관)
crawler_stats
  crawler_id, crawler_version, source_site,
  adoption_rate, avg_reward,
  total_submissions, total_adoptions, last_updated

-- 서비스 등록/상태
services
  id, name, display_name, api_key, webhook_url,
  daily_limit, today_count, active, created_at
```

### 7.2 데이터 보관 정책
- `submissions` — 채택/기각 처리 완료 후 7일 보관 후 삭제
- `rewards`, `crawler_stats` — 영구 보관 (학습용)
- `adoptions`, `performance` — 영구 보관 (추적 체인)

---

## 8. 리뷰 서비스 연동 스펙 (리뷰 모모 제공)

- 제출 포맷: crawlerId, sourceUrl, title, content, discoveredAt, tags, language
- type 분류 안 함 (리뷰 AI가 판단)
- sourceUrl 기준 중복 제거, 같은 제품 다른 URL → AI 판단
- 크롤러별 API key, 분당 10~30건
- 피드백: accepted / duplicate / rejected + 비동기 피드백 조회
- 콘텐츠 풍부함이 핵심 (제목만 ❌, 본문 300자+ ✅, 전문 ✅✅)
- 속도 메타데이터: discoveredAt + publishedAt
- Tech 카테고리 우세, Amazon 구매 가능 물리 제품 우선, ASIN 있으면 가치 높음

---

## 9. 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 언어 | Python | 크롤링 생태계 최강, AI/ML 연동 |
| API 서버 | FastAPI | 비동기, 빠름, 자동 문서화 |
| DB | PostgreSQL | 기존 서비스와 동일, 검증됨 |
| 캐시/큐/이벤트 | Redis | 하나로 3역할, 가성비 |
| 태스크 스케줄링 | Celery | Python 네이티브, 크롤러 태스크 관리 |
| HTTP 크롤링 | httpx + asyncio | 비동기 대량 요청 |
| JS 렌더링 | Playwright (Stealth) | SPA/동적 페이지 대응 |
| 본문 추출 | trafilatura | 기사 본문 추출 정확도 최상급 |
| LLM 크롤링 | Crawl4AI | AI 친화적, Rate limiting 내장 |
| 배포 | Docker Compose | 원클릭 로컬/서버 환경 구성 |
| URL 중복 체크 | Bloom Filter (Redis) | 메모리 효율적, 수백만 URL 대응 |

---

## 10. 개발 로드맵

### Phase 1: 기반 구조 (1~2주)
- [ ] 프로젝트 셋업 (저장소, Docker Compose)
- [ ] DB 스키마 구현 (추적 체인 + 버전 추적 포함)
- [ ] 크롤러 시스템 API (제출, 조회, 중복 처리)
- [ ] 크롤러 등록/관리 API
- [ ] 서비스 등록 (CLI/수동)
- [ ] Bloom Filter URL 중복 체크
- [ ] 도메인별 Politeness (Rate Limiter)
- [ ] 모니터링 대시보드 (기본)

### Phase 2: 기본 크롤러 (2~3주)
- [ ] 크롤링 엔진 (Crawl4AI + httpx + Playwright)
- [ ] 본문 추출 (trafilatura)
- [ ] 초기 소스 설정 (Tech News, Amazon, YouTube)
- [ ] 프록시 로테이션 + 안티봇 대응
- [ ] DNS 캐싱
- [ ] 리뷰 서비스 연동
- [ ] Vmap 서비스 연동 (스펙 확인 필요)
- [ ] 서비스 한도 관리 + 크롤러 정지/재개

### Phase 3: 보상 & 학습 (3~4주)
- [ ] 1차 보상 시스템 (채택 보상)
- [ ] 크롤러 피드백 API (버전별 성과 포함)
- [ ] 크롤러 학습 로직 (소스 가중치 조정)
- [ ] 2차 보상 시스템 (성과 보상, 스냅샷 방식)
- [ ] 콘텐츠 변경 감지 (ETag, 해시)
- [ ] 적응형 스케줄링

### Phase 4: 고도화 (이후)
- [ ] 크롤러 자율 확장 (새 소스 발견)
- [ ] 크롤러 간 경쟁 랭킹 시스템
- [ ] 멀티 리전 배포
- [ ] 실시간 트렌드 감지
- [ ] 특허 출원 연계

---

## 11. 미확정 사항 (연동하면서 결정)

- [ ] 배포 서버 환경 (클라우드/VPS, 스펙)
- [ ] Vmap 서비스 연동 스펙
- [ ] 보상 점수 구체적 산정 기준
- [ ] 크롤러 학습 알고리즘 상세 (강화학습? 규칙 기반?)
- [ ] 2차 보상 기여도 분리 방법
- [ ] 크롤러 소스 배분 전략 (자유 방문 vs 1차 배분)
- [ ] 감점 시스템 도입 여부

---

## 12. 관련 리소스

| 항목 | 위치 |
|------|------|
| 크롤러 네트워크 GitHub | https://github.com/cpagent78/crawler-network |
| CPrice 코드 | ~/projects/cprice_project (GitHub: lanore78/cprice_project) |
| VMAP 코드 | ~/projects/vmap (GitHub: lanore78/vmap) |
| CPrice Review 방 | Telegram: -1003519814080 |
| VMAP 방 | Telegram: -5250790563 |
| 특허명세서 방 | Telegram: -5207964296 |
| 이 방 (크롤러네트워크) | Telegram: -5280128969 |
