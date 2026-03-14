# 크롤러 네트워크 — 서비스 연동 가이드

> 이 문서는 크롤러 네트워크와 연동하려는 **서비스 개발자**를 위한 가이드입니다.
> Review, Vmap, 또는 향후 추가될 서비스에서 참고하세요.

---

## 1. 크롤러 네트워크란?

크롤러 네트워크는 인터넷에서 **최신 정보를 자동 수집**하는 독립 시스템입니다.

- 크롤러가 수집한 정보는 **정보 풀(Information Pool)**에 쌓입니다
- 각 서비스는 정보 풀에서 **자기에게 필요한 정보를 가져가서 채택**합니다
- 채택/성과 결과를 크롤러에 **피드백(보상)**하면, 크롤러가 학습합니다

```
크롤러 네트워크 → 정보 풀 → 여러분의 서비스 AI가 검토/채택
                              ↓
                         콘텐츠 생성
                              ↓
                         성과 발생 → 보상 피드백
```

**핵심: 여러분이 할 일은 3가지입니다.**
1. 정보 풀에서 정보를 **가져간다**
2. 채택/기각을 **알려준다**
3. 성과 데이터를 **보내준다**

---

## 2. 연동 흐름

```
[Step 1] 정보 가져가기
  GET /api/submissions?status=pending

[Step 2] 서비스 AI가 검토

[Step 3] 채택/기각 알림
  POST /api/adoptions

[Step 4] 콘텐츠 생성 (서비스 내부)

[Step 5] 성과 데이터 전달 (주기적)
  POST /api/performance
```

---

## 3. API 상세

### 3.1 서비스 등록

크롤러 네트워크에 서비스를 등록하고 API key를 발급받습니다.

```
POST /api/services
```

**Request:**
```json
{
  "name": "review",
  "displayName": "CPrice Review",
  "webhookUrl": "https://reviews.cprice.co/api/webhook/crawler"
}
```

**Response:**
```json
{
  "serviceId": "svc-review-001",
  "apiKey": "sk-xxxxxxxxxxxx"
}
```

모든 API 호출 시 헤더에 API key를 포함합니다:
```
Authorization: Bearer sk-xxxxxxxxxxxx
```

---

### 3.2 정보 가져가기 (Pull 방식)

정보 풀에서 검토할 정보를 조회합니다.

```
GET /api/submissions?status=pending&limit=50
```

**Response:**
```json
{
  "submissions": [
    {
      "submissionId": "sub-20260314-001",
      "crawlerId": "crawler-42",
      "sourceUrl": "https://techcrunch.com/2026/03/14/sony-xm6",
      "sourceSite": "techcrunch.com",
      "title": "Sony WF-1000XM6 Officially Released",
      "content": "Sony has officially announced the WF-1000XM6... (기사 본문 전체)",
      "discoveredAt": "2026-03-14T14:30:00Z",
      "publishedAt": "2026-03-14T14:00:00Z",
      "imageUrls": ["https://..."],
      "language": "en",
      "tags": ["earbuds", "sony", "wireless"],
      "createdAt": "2026-03-14T14:30:05Z"
    }
  ],
  "total": 235,
  "hasMore": true
}
```

**필터 옵션:**
| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `status` | pending / reviewed | `pending` |
| `limit` | 한 번에 가져올 개수 | `50` |
| `since` | 특정 시각 이후 | `2026-03-14T00:00:00Z` |
| `sourceSite` | 특정 소스만 | `techcrunch.com` |
| `language` | 언어 필터 | `en` |

---

### 3.3 실시간 알림 (Push 방식, 선택)

새 정보가 수집되면 등록된 webhook URL로 즉시 알림을 보냅니다.
SEO 속도가 중요한 서비스에 권장합니다.

```
POST {서비스의 webhookUrl}
```

**Payload:**
```json
{
  "event": "new_submission",
  "submissionId": "sub-20260314-001",
  "title": "Sony WF-1000XM6 Officially Released",
  "sourceUrl": "https://techcrunch.com/...",
  "sourceSite": "techcrunch.com",
  "discoveredAt": "2026-03-14T14:30:00Z"
}
```

서비스는 이 알림을 받고 필요하면 `GET /api/submissions/{id}`로 상세 내용을 가져갑니다.

---

### 3.4 채택/기각 알림

서비스 AI가 검토 후 결과를 알려줍니다. **이 피드백이 크롤러 학습의 핵심입니다.**

```
POST /api/adoptions
```

**채택 시:**
```json
{
  "submissionId": "sub-20260314-001",
  "service": "review",
  "status": "adopted",
  "pageId": "review-sony-xm6-001",
  "pageUrl": "https://reviews.cprice.co/reviews/sony-xm6",
  "adoptedAt": "2026-03-14T15:00:00Z"
}
```

**기각 시:**
```json
{
  "submissionId": "sub-20260314-002",
  "service": "review",
  "status": "rejected",
  "reason": "not_a_product",
  "rejectedAt": "2026-03-14T15:01:00Z"
}
```

**기각 사유 (reason) 예시:**
| reason | 설명 |
|--------|------|
| `not_a_product` | 제품이 아님 (Review용) |
| `not_a_topic` | 주제로 적합하지 않음 (Vmap용) |
| `insufficient_content` | 본문 내용 부족 |
| `already_exists` | 이미 같은 제품/주제의 페이지가 존재 |
| `low_quality` | 품질 미달 |
| `other` | 기타 |

> **참고:** 기각 사유는 크롤러 학습에 활용됩니다. 가능하면 구체적인 사유를 보내주세요.

---

### 3.5 성과 데이터 전달

채택된 정보로 생성된 페이지의 성과를 **주기적으로(일별 또는 주별)** 보내줍니다.

```
POST /api/performance
```

**Request:**
```json
{
  "service": "review",
  "pageId": "review-sony-xm6-001",
  "period": "2026-03",
  "metrics": {
    "visitors": 50000,
    "clicks": 3200,
    "avgTimeOnPage": 245,
    "conversions": 320,
    "revenue": 12800.00
  },
  "reportedAt": "2026-04-01T00:00:00Z"
}
```

**metrics 필드 (서비스별로 보낼 수 있는 것만 보내면 됨):**
| 필드 | 설명 | 필수 |
|------|------|------|
| `visitors` | 페이지 방문자 수 | ⭕ |
| `clicks` | 클릭 수 (CTA, 외부 링크 등) | 선택 |
| `avgTimeOnPage` | 평균 체류 시간 (초) | 선택 |
| `conversions` | 전환 수 (구매, 가입 등) | 선택 |
| `revenue` | 수익 (어필리에이트 등) | 선택 |

> **참고:** 모든 metrics를 보낼 필요 없습니다. `visitors`만 있어도 보상 계산 가능합니다.

---

## 4. 추적 체인

모든 데이터는 **크롤러 → 수집 → 채택 → 페이지 → 성과**로 연결됩니다.

```
crawlerId → submissionId → adoption → pageId → performance
```

서비스에서 채택 시 `pageId`와 `pageUrl`을 반드시 보내주세요.
이 연결고리가 있어야 크롤러에게 정확한 보상과 피드백이 전달됩니다.

---

## 5. 연동 체크리스트

### 최소 연동 (빠르게 시작)
- [ ] 서비스 등록 + API key 발급
- [ ] `GET /api/submissions` — 정보 가져가기
- [ ] `POST /api/adoptions` — 채택/기각 알림
- 이것만으로 크롤러 학습(1차 보상) 가능

### 권장 연동
- [ ] Webhook 등록 — 실시간 알림 수신
- [ ] `POST /api/performance` — 성과 데이터 전달
- 이것까지 하면 2차 보상(성과 보상) 가능

### 선택
- [ ] 기각 사유 상세 제공 — 크롤러 학습 품질 향상
- [ ] 커스텀 필터 요청 — 특정 소스/언어만 수신

---

## 6. Rate Limit

| 대상 | 제한 |
|------|------|
| GET /api/submissions | 분당 60회 |
| POST /api/adoptions | 분당 30회 |
| POST /api/performance | 분당 10회 |

429 응답 시 `Retry-After` 헤더를 확인하세요.

---

## 7. 에러 코드

| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | `invalid_request` | 요청 형식 오류 |
| 401 | `unauthorized` | API key 누락/만료 |
| 404 | `not_found` | 리소스 없음 |
| 409 | `duplicate` | 이미 처리된 건 |
| 429 | `rate_limited` | 요청 초과 |
| 500 | `internal_error` | 서버 오류 |

---

## 8. 자주 묻는 질문

**Q: 크롤러가 보내는 정보에 type(제품/뉴스/주제)이 없는데요?**
→ 맞습니다. 크롤러는 분류하지 않습니다. 서비스 AI가 직접 판단하세요.

**Q: 모든 submission을 검토해야 하나요?**
→ 아닙니다. 필터(sourceSite, language 등)로 관심 있는 것만 가져가세요.

**Q: 같은 submission을 여러 서비스가 채택할 수 있나요?**
→ 네. 하나의 정보를 Review와 Vmap이 동시에 채택할 수 있습니다. 크롤러는 양쪽에서 보상받습니다.

**Q: 성과 데이터를 안 보내면?**
→ 1차 보상(채택)만 작동합니다. 2차 보상(성과)은 없지만 시스템은 정상 동작합니다.

**Q: 새로운 서비스를 추가하려면?**
→ 서비스 등록 → API key 발급 → 위 API로 연동하면 됩니다. 크롤러 쪽 변경은 없습니다.

---

## 9. 문의

- 크롤러 네트워크 시스템 채널: Telegram -5280128969
- 담당: 모모 (크롤러 네트워크 AI)
