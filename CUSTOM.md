# Jellyfin Web 커스텀 변경 사항

## 정리 기준

- 작성일: 2026-09-18.
- 대상 브랜치: `feature/custom_ui`.
- 로컬 `master`와의 공통 조상 이후 최종 코드 차이 및 커스텀 커밋을 기준으로 정리한다. 업스트림 병합 자체는 커스텀 기능으로 계산하지 않는다.
- 아래 내용은 현재 구현에 대한 설명이며, 이번 문서 작성 중 빌드·테스트·브라우저 실행 검증은 수행하지 않았다.

## 1. 기본 테마와 브랜딩

- 기본 테마를 `Dark`에서 `Purple Haze`로 변경했다. 설정 파일과 React/MUI 테마의 기본 색상 모드에 모두 반영했다.
- 저장소 내 커스텀 배너 2종과 투명 아이콘을 추가하고, 기존 `@jellyfin/ux-web` 이미지 대신 사용하도록 연결했다.
- 적용 위치는 시작 화면, 테마 헤더, TV 레이아웃, 사이드바 헤더, 서버 선택 버튼, 로고 화면보호기다.
- 기본값 변경이며 기존 사용자의 저장된 테마를 일괄 덮어쓰는 기능은 아니다.

관련 파일:

- [src/config.json](src/config.json)
- [src/themes/index.ts](src/themes/index.ts)
- [src/themes/_base/_theme.scss](src/themes/_base/_theme.scss)
- [src/styles/site.scss](src/styles/site.scss)
- [src/assets/img/banner-dark.png](src/assets/img/banner-dark.png)
- [src/assets/img/banner-light.png](src/assets/img/banner-light.png)
- [src/assets/img/icon-transparent.png](src/assets/img/icon-transparent.png)

## 2. 홈 화면 기본 구성

기본 홈 섹션 순서를 다음과 같이 단순화했다.

1. 작은 라이브러리 타일
2. 이어서 시청
3. 최근 추가 미디어
4. 다음 에피소드
5. 나머지 섹션은 표시하지 않음(`None`)

오디오·책 이어보기와 라이브 TV를 기본 구성에서 제외했다. 기능 자체를 삭제하거나 사용자 지정 홈 구성을 강제로 초기화하는 변경은 아니다. 서버 `feature/custom`의 기본 표시 설정과 함께 적용한다.

관련 파일: [src/constants/homeSectionType.ts](src/constants/homeSectionType.ts).

## 3. 일반 사용자 비밀번호 변경 화면 제한

- 로그인한 사용자가 관리자일 때만 비밀번호 변경 영역을 표시한다.
- 기존 비밀번호 폼에서 일반 사용자의 `EnableUserPreferenceAccess`만으로 변경 영역이 노출되지 않도록 했다.
- 대시보드 사용자 편집 화면의 비밀번호 탭과 해당 콘텐츠도 관리자에게만 표시한다. 숨겨진 탭 경로로 접근할 때 탭 선택값을 보정한다.
- 웹 UI 수준의 제한이다. 이 변경만으로 서버 비밀번호 변경 API나 다른 클라이언트의 요청이 차단되는 것은 아니다.

관련 파일:

- [src/components/dashboard/users/UserPasswordForm.tsx](src/components/dashboard/users/UserPasswordForm.tsx)
- [src/apps/dashboard/routes/users/edit.tsx](src/apps/dashboard/routes/users/edit.tsx)

## 4. TMDb 인물 별칭 관리

### 관리자 화면

- 관리자 대시보드에 **TMDB 인물 별칭** 메뉴와 `/dashboard/personaliases` 경로를 추가했다.
- 기존 별칭 목록 조회, 신규 등록, 수정, 삭제를 지원한다.
- TMDb 인물명 검색과 페이지 이동, 여러 페이지에 걸친 다중 선택을 지원한다.
- 사진, TMDb ID, 생년월일, 출생지, 약력을 확인한 뒤 별칭을 편집한다.
- 이미 별칭이 등록된 인물은 검색 결과에서 신규 선택하지 않고 기존 목록에서 수정한다.
- 한국어·영어 UI 문자열을 추가했다. 인물 검색 및 상세 정보는 서버를 통해 조회하며 브라우저에 TMDb API 키를 전달하지 않는다.

### 입력 검증과 저장 흐름

- 원래 이름과 같은 별칭, 공백뿐인 별칭, 선택 항목 간 중복 이름을 검사한다. 이름 비교 시 유니코드 정규화, 공백 및 대소문자 차이를 정리한다.
- 다른 TMDb ID나 라이브러리 인물과의 충돌은 서버 검증 결과를 표시한다.
- 여러 인물은 순서대로 저장한다. 전체를 하나의 트랜잭션으로 저장하지 않으며 중간 실패 시 이미 저장된 항목과 나머지 편집 내용을 구분해 유지한다.
- 모든 별칭 저장이 끝나면 검색어·원래 이름·변경 전 별칭에 연결된 작품의 갱신을 요청하고 예약된 작품 수를 표시한다.
- 갱신 예약만 실패하면 대화상자를 유지한다. 재시도 시 완료한 별칭 저장을 건너뛰고 갱신 예약을 다시 요청한다.

### 운영 시 주의사항

- 서버 `feature/custom`의 `/TmdbPersonAliases` API가 필요하다. 웹만 배포해서 사용할 수 있는 기능은 아니다.
- 저장 후 갱신은 비동기 예약이다. 예약 건수는 실제 메타데이터 수집·이미지 다운로드 성공 건수가 아니다.
- 관련 작품은 **모든 메타데이터 교체 및 현재 이미지 교체** 대상으로 예약되므로 수동 편집한 메타데이터와 이미지도 바뀔 수 있다.
- 별칭 삭제 시 작품 갱신을 자동 예약하지 않는다.

관련 파일:

- [src/apps/dashboard/routes/personaliases.tsx](src/apps/dashboard/routes/personaliases.tsx)
- [src/apps/dashboard/features/personAliases/components/PersonAliasDialog.tsx](src/apps/dashboard/features/personAliases/components/PersonAliasDialog.tsx)
- [src/apps/dashboard/features/personAliases/api/usePersonAliases.ts](src/apps/dashboard/features/personAliases/api/usePersonAliases.ts)
- [src/apps/dashboard/features/personAliases/validation.ts](src/apps/dashboard/features/personAliases/validation.ts)
- [src/apps/dashboard/features/personAliases/validation.test.ts](src/apps/dashboard/features/personAliases/validation.test.ts)
- [src/apps/dashboard/components/drawer/sections/ServerDrawerSection.tsx](src/apps/dashboard/components/drawer/sections/ServerDrawerSection.tsx)
- [src/apps/dashboard/routes/_asyncRoutes.ts](src/apps/dashboard/routes/_asyncRoutes.ts)
- [src/strings/ko.json](src/strings/ko.json)
- [src/strings/en-us.json](src/strings/en-us.json)

## 5. 의존성과 검증 코드

- [package.json](package.json)에 `npm` 및 Windows x64용 `sass-embedded-win32-x64` 의존성을 추가하고 [package-lock.json](package-lock.json)에 반영했다.
- 별칭 입력 검증 단위 테스트를 추가했다. 테스트 파일의 존재와 이번 작성 시 테스트 실행 여부는 구분한다.

## 주요 커스텀 커밋

| 커밋 | 변경 내용 |
| --- | --- |
| `02eba91281` | 일반 사용자 비밀번호 변경 메뉴 제한 |
| `00a35da2cd` | 기본 테마 및 브랜딩 변경 |
| `6d8937cc37` | 패키지 설정 변경 |
| `b5912c4427` | TMDb 인물 별칭 관리 화면 추가 |
| `863a201c5c` | 별칭 저장 후 관련 작품 갱신 연동 |

표는 커스텀 커밋의 요약이며, 업스트림 병합 과정에서 조정된 내용까지 포함한 현재 동작은 위 기능별 설명을 기준으로 한다.
