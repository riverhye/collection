# collection — 기획

- 작성: 2026-06-19 (grill-me 세션 정리)
- **"콘텐츠판 옵시디언"** — 넷플릭스·유튜브·책·글 등 흩어진 콘텐츠를 한 곳에 모아 다시 찾는, 로컬·개인용 수집함 앱.

---

## 1. 컨셉

| 항목 | 결정 |
|---|---|
| 정체성 | "콘텐츠판 옵시디언" — 로컬·가벼움·개인 소유 공간, 비소셜 |
| 성격 | **수집함(archive)**. - "보는중/완료" 수동 상태전환 없음 |
| 핵심 가치 | 정리/검색(흩어진 걸 모아 다시 찾기) + 옵시디언식 "내 걸로 내 공간 채우기" |
| 관심 표시 | `favorite` 북마크 플래그 하나만 |

### 비목표 (Non-goals)
- "현재 보고 있는 콘텐츠 자동 감지" (OS 권한 장벽)
- 소셜 / 공유 / 공개 프로필
- 진행률 / 평점 / "도감 빈칸 채우기"
- 클라우드 동기화 (로컬 전용)

---

## 2. 데이터 모델

### 분류 2축 (직교)
- **`type`** — 정규 enum. *어댑터/meta 출처가 다른 것만* 분리: `movie | tv | youtube | book | article | etc`
  - 애니메이션 = 별도 타입 아님 → movie/tv + 장르(meta)
  - 웹툰 = MVP는 `etc`, 수요 보이면 승격
  - 원칙: enum은 "분류표"가 아니라 "어댑터 붙일 만큼 자주 쓰는 것" 목록
- **`source`** — 자유 라벨. "어디서 접했나": `netflix`, `youtube`, `극장`, `교보`, `밀리의서재`… (선택)

### 테이블

> 테이블명 `entries`는 **임시 placeholder** — 앱 이름/브랜딩 확정 후 일괄 rename 검토.

```
entries
  id            text(uuid)  PK
  title         text        NOT NULL      -- 유일한 필수값
  type          text        NOT NULL DEFAULT 'etc'
  source        text        NULL
  url           text        NULL
  thumbnail     text        NULL          -- 외부 이미지 URL (다운로드 X, expo-image 캐시)
  memo          text        NULL
  favorite      int(0/1)    DEFAULT 0
  meta          text(json)  NULL          -- 타입별 스냅샷 (아래 표)
  experienced_date  text/int NULL         -- "실제 본/읽은 날"(선택, 비우면 created_at 폴백)
  created_at    int         NOT NULL       -- 시스템 타임스탬프
  updated_at    int         NOT NULL

tags        (id, name)
entry_tags  (entry_id, tag_id)            -- 조인. 태그 필터/자동완성/개수 쿼리용
```

### 타입별 `meta` 필드

| 타입 | 저장하는 meta | 외부ID(dedup 키) | 어댑터 |
|---|---|---|---|
| movie | year, director, genres[], runtime | tmdbId | TMDB |
| tv | year, seasons, genres[] | tmdbId | TMDB |
| youtube | channel, duration, publishedAt | videoId | YouTube Data API |
| book | author, publisher, pubDate, pageCount | isbn | 네이버책 |
| article | siteName, author?, publishedAt?, **summary(저장)** | url | OG 파싱 |
| etc | 자유 | — | 없음 |

**규칙**
- meta는 **타입별 TS 인터페이스**로 타입 안전 보장, 어댑터가 모양 책임 (저장 전 검증). 저장은 통합(JSON 한 칸), 모양은 타입별로 엄격.
- meta는 **비정규화 스냅샷** — 항목마다 자기 복사본. 한 항목 수정해도 다른 항목에 파급 없음.
- `summary`: 통일 필드명. 영화·TV·유튜브·책은 **저장 안 하고 상세 볼 때 외부ID로 fetch**(오프라인이면 안 뜸). `article`만 재조회 API가 없어 저장. 어댑터가 외부 필드(TMDB `overview` / 네이버 `description` / `og:description`)를 `summary`로 매핑.
- 장르: meta.genres에만. 사용자 태그에 **자동 편입 안 함**. "장르 필터"는 태그와 별개 제공.
- 변동값(viewCount·평점) 저장 안 함 (스냅샷이 금방 거짓이 됨).

### 저장 철학
- 외부 데이터는 **정규화 스냅샷 + 외부ID**로 영구 저장. API 원본 통째 저장 X. fetch-on-demand 금지(오프라인·영속성).
- 외부ID로 "새로고침"은 선택적 (수동 수정 덮어쓰기 주의: 묻기/보존).
- 용량: 텍스트 메타는 무시할 수준(1만 개 ≈ 20MB). 무게는 이미지뿐 → `thumbnail`은 URL만 저장 + `expo-image` 디스크 캐시(본 것만, 상한). 전부 다운로드 X.

---

## 3. 정보구조 (IA) · 화면

- **1차 브라우징 축** = 태그·타입·검색 (옵시디언식). 캘린더는 *보기 옵션*(experienced_date 가진 것만), 메인 아님.
- **하단 탭 2개**: `수집함` + `설정`. 추가는 **플로팅 + 버튼**.
- **목록**: 리스트 기본 + 그리드/캘린더 토글. 썸네일 없는 항목(기사·etc)은 타입 아이콘.
- **검색**: 범위 = 제목 + 메모 + 태그 (1차 `LIKE`, 후에 FTS5).
- **필터 4축**: 타입 / 태그 / favorite / 기간(experienced_date). 태그 다중 = AND 기본 + OR 토글.
- "둘러보기"(랜덤·1년 전 오늘)는 후순위.

### 추가(입력) 흐름
**타입 먼저 선택**(칩 6개) → 타입별 맞춤 입력/조회. `기타`가 항상 탈출구. (DB는 title만 NOT NULL 유지)

```
[타입 선택] ── 영화·TV·책 → 제목 입력 → 외부DB 라이브 검색
            ├─ 유튜브·기사 → URL 붙여넣기 → 파싱
            └─ 기타 → 자유 텍스트
```

진입 수단 (단계별):
- **1차**: 텍스트 입력 (+외부DB 검색)
- **2차**: URL 붙여넣기 파싱 → 이어서 **공유시트**(share extension, 같은 파싱 재사용)
- **3차**: 카메라 OCR
- OTT(넷플릭스 등)는 새 진입수단 아님 = 수동 텍스트 + TMDB 검색의 한 사례

#### URL 파싱 (2차) — 전처리기 + 어댑터 추출 2단
- **① 전처리(라우터)**: URL 인식·정규화 → 단축링크 펼치기, `m.`/추적파라미터(`utm_*`) 제거, 타입 판별(youtube vs article), 유튜브 videoId를 한 형태로 정규화. 결과로 넘길 어댑터 결정.
- **② 추출**: 어댑터별. 유튜브 = videoId로 YouTube Data API(깔끔). 기사 = 페이지 OG 태그(`og:title/description/image`) 파싱.
- 어댑터에 `fromUrl(url)` 진입점을 두고 그 앞에 전처리기를 둔다.
- **OG 파싱은 프록시 경유**(아래 §4 참고): 온디바이스 정규식 파싱은 SPA·봇차단·웹CORS에 약해서, 키 숨김 겸용 무상태 프록시에서 처리. (유튜브는 API라 영향 없음)

### 외부 DB 조회 UX (2차)
- 타이핑 라이브 목록(넷플릭스식) + 디바운스 ~300ms.
- 결과 카드 = 썸네일 + 제목 + **보조줄**(영화: 연도·감독 / 책: 저자·출판사 / 유튜브: 채널).
- 고르면 → 상세 편집 화면(meta 자동 채움) → 태그·메모·experienced_date 추가 → 저장.
- **"직접 입력하기" 항상 노출** (검색 중에도, 결과 없을 때도). 검색은 거들 뿐 수동 항상 가능.
- 타입당 어댑터 1개로 시작(책=네이버책). registry는 멀티 가능하게 짓되 호출은 우선순위 1개.

### 상세 / 편집 화면
- 기본 **"보기뷰"**(깔끔한 정보카드) + 우상단 **"편집" 버튼** → 편집뷰(필드가 input). 설정에서 "기본: 보기/편집" 토글.
- ♥좋아요·메모/태그 빠른추가는 보기뷰에서도 바로.
- **3구획** ("위 = 내 것, 아래 = 외부"):
  ```
  〔기본 정보〕 썸네일/타입색 fallback · 제목 ♥ · 타입칩 · source
  〔내가 추가〕 태그 · 본 날 · 메모
  〔외부 정보〕 meta 상세 · summary · [원문 열기][새로고침][삭제]
  ```
- meta는 편집뷰에서 수정 가능, 평소 읽기전용(실수 방지).

### 중복(dedup)
- **강한 식별자**(외부ID: tmdbId/isbn/videoId, 또는 정규화 url) 일치 → 경고문 없이 **기존 항목 상세로 이동** + **"다른 작품이에요"** 버튼(누르면 별개 row 생성).
- **제목만 일치** → 막지도 이동도 안 함. 하단에 "비슷한 N개" 힌트만(눌러야 펼침).
- url 없는 타입(책)은 ISBN이 강한 식별자 역할(조회 시 부여). → dedup은 "강한 식별자가 붙는 순간" 강해짐.

---

## 4. 아키텍처

- 레이어: `app`(라우팅) → `domain/service` → `data/repository` → SQLite. domain은 RN 의존성 없게.
- **Source Adapter 패턴** — 출처별 외부 API를 공통 인터페이스로 추상화, registry로 매핑. 새 출처 = 어댑터 파일 하나 추가. (실질적으로 "Type Adapter": registry 키는 `type`)
- repository 레이어로 DB 격리 → 나중에 클라우드 동기화 추가 가능하게.

### 데이터는 로컬, 서버는 헬퍼만
- **데이터 = 로컬 우선** (폰의 SQLite가 원본). 클라우드 데이터 저장/동기화는 **미래 옵션** — 계정·인증·인프라·비용·프라이버시를 끌고 오고 "가볍고 개인적인" 컨셉과 충돌하므로 지금 커밋 안 함. repository 격리 덕에 나중에 데이터 소스만 갈아끼우면 됨.
- **가벼운 무상태 프록시 서버 도입** (EAS Hosting API routes 등): ① 외부 API 키 숨김(앱에 박지 않음), ② 기사 OG 파싱 견고하게 대행. **사용자 데이터는 저장 안 함.** → 배포 숙제 #2 해소.

### 확정 스택
- React Native + Expo **SDK 56** (expo ~56.0.11, RN 0.85.3, React 19.2), TypeScript, Expo Router
- Node 22.22.3 고정
- 스타일링: NativeWind v5 + react-native-css + Tailwind v4
- 데이터: expo-sqlite + **Drizzle ORM**
- 카메라/OCR(3차): react-native-vision-camera / @react-native-ml-kit/text-recognition / expo-image-manipulator (vision-camera의 RN 0.85 호환 확인 필요)
- 외부 DB: TMDB, 네이버 책 검색, YouTube Data API, Google Books
- Expo Go 불가(서드파티 네이티브 모듈) → **dev client 빌드** 사용

---

## 5. 카메라 OCR (3차, 세부 미확정)
- 실물(책 표지·포스터) 대상. "가장 큰 글자 = 제목 후보" 휴리스틱(ML Kit bounding box로 폰트 크기 추정).
- "확정값" 아니라 사용자가 확인/수정하는 **미리 채운 후보** → 외부DB 검색으로 연결.
- 파이프라인 단계 분리(촬영→크롭→OCR→제목추출→사용자확정→검색→저장)로 실패 격리.
- **세부 설계는 다음 grill 세션 과제.**

---

## 6. 배포(앱스토어) 숙제
> 로컬 DB라 **데이터 동기화 이슈 없음** — 스키마만 공유, 데이터는 기기별 격리(설치 = 각자의 SQLite 섬).

1. ⭐ **Drizzle 스키마 마이그레이션을 1차부터 켜둘 것** — 앱 업데이트 시 기존 사용자 데이터 보존. (로컬DB 앱 1순위 과제)
2. **API 키 노출** — 앱에 박으면 전체 사용자 공유·남용. → **무상태 프록시 도입으로 해소**(키 숨김 + OG 파싱 겸용, §4 참고). 데이터는 저장 안 함.
3. **백업/복원** — 앱 삭제·폰 교체 시 데이터 증발. → export / iCloud 백업 (나중 단계 로드맵).

---

## 7. 구현 순서

1. **1차** — 항목 CRUD + 타입 선택 입력 + 태그/메모/날짜 수동입력 + 리스트/검색/필터 + 상세·편집 + dedup(제목/url) + **Drizzle 마이그레이션 셋업**
2. **2차** — 외부 DB 조회(어댑터: TMDB·네이버책·YouTube·OG) + URL 파싱 + 공유시트 + 외부ID dedup + 새로고침
3. **3차** — 카메라 + OCR 자동화

---

## 8. 미해결 / 다음 과제
실제 개발 들어가기 전, 모든 설정 파일을 하나씩 공부 및 이해한 후에 진행할 것.

### 설정 파일 공부 순서
바깥 지도 → 앱 정체성 → 코드 처리 파이프라인 → 데이터 설정 순으로 본다.

#### DONE

**babel.config.js** — 트랜스파일 규칙
- Expo preset + `.sql` inline import

**package.json** — 프로젝트 명세서 (deps/scripts/entrypoint)
- `main: expo-router/entry` = 앱 진입점
  - RN의 `registerRootComponent`(AppRegistry 등록) 호출을 자동화
  - 루트 컴포넌트 자리에 `ctx`(`require.context`로 `src/app` 폴더 스캔)를 꽂아 파일기반 라우팅

**app.json** — 앱 정체성 · 네이티브 설정의 단일 소스
- `scheme: "collection"` = 딥링크 (`collection://...`로 앱 특정 화면 열기, 공유시트/URL붙여넣기 토대)
- `plugins` = config plugin: prebuild 때 네이티브 파일(Info.plist/AndroidManifest/gradle) 수정하는 js 함수
  - 대부분 라이브러리 제공(expo-router/expo-sqlite 등), 이름만 적으면 실행
  - plugin이 네이티브를 바꿈 → Expo Go(네이티브 고정) 불가 → dev client 빌드 필요
- CNG(Continuous Native Generation): ios/android 폴더 미보유, `npx expo prebuild`로 생성
- experiments: `typedRoutes`(라우트 경로 TS 검증) · `reactCompiler`(자동 메모이제이션)

**tsconfig.json** — TypeScript 컴파일러 규칙
- `extends: expo/tsconfig.base` — Expo 기본 설정 상속(baseUrl 등 포함), 차이만 덮어씀
- `strict: true` — 엄격 검사 전체 ON (§2 meta 타입안전의 전제)
- `paths` alias — `@/*`→`./src/*`, `@/assets/*`→`./assets/*` (상대경로 지옥 회피)
  - 런타임도 동작: metro의 getDefaultConfig가 tsconfig paths를 자동으로 읽어 리졸버에 연결 (babel module-resolver 불필요)
- `include`의 `.expo/types` = typedRoutes 자동생성 타입(app.json과 짝), `*-env.d.ts`=자동 선언

#### DOING
- metro.config.js — Expo 번들러 설정. NativeWind 연결 + `.sql` 확장자 허용.

#### REST
- postcss.config.mjs — Tailwind v4 PostCSS 플러그인.
- src/global.css — Tailwind/NativeWind 스타일 진입점 + 전역 폰트 토큰.
- drizzle.config.ts — SQLite/Expo용 Drizzle 설정. `src/db/schema.ts`로 이어짐.
- .nvmrc — Node 버전 고정.
- expo-env.d.ts / nativewind-env.d.ts — 자동 타입 선언. 읽기만 하고 수정하지 않음.
- .gitignore — git 추적 제외 목록.

- [ ] 앱 이름 / 브랜딩 → 확정 시 `entries` 테이블명 등 rename
- [ ] 카메라 OCR 파이프라인 세부 설계
- [ ] "새로고침" 시 수동 수정 보존 정책
- [ ] 프록시 서버 구체화 (호스팅·엔드포인트 설계) — 방향은 §4에서 확정(도입)
- [ ] 백업/복원 방식 (클라우드 저장은 미래 옵션)
