# KanFlow - 모던 UI 디자인 시스템 명세서 v2.0

> **문서명**: 모던 UI 디자인 시스템 (테마 · 사이징 · 다국어 · 글꼴 · 박스 디자인)  
> **버전**: v2.0  
> **작성일**: 2026-02-25  
> **변경 이력**: v1.0(2026-02-25) → v2.0(2026-02-25) 박스 디자인 제안 챕터 추가  
> **기준 문서**: KanFlow-UIUX-Redesign-SlackPattern-v1.0, KanFlow-FRD-v2.0  
> **벤치마크**: Linear, Vercel Dashboard, Slack 2025, Notion, Apple Bento  
> **근거**: 2025-2026 UI 트렌드 분석(Glassmorphism, Neumorphism, Bento Grid, Flat Modern), Google Fonts, W3C Design Tokens  

---

## 목차

### Part A. 기존 디자인 시스템 (v1.0 내용 유지)
1. [개요 및 적용 범위](#1-개요-및-적용-범위)
2. [글꼴 시스템 (Typography)](#2-글꼴-시스템-typography)
3. [타이포그래피 스케일 (Sizing)](#3-타이포그래피-스케일-sizing)
4. [스페이싱 & 사이징 시스템](#4-스페이싱--사이징-시스템)
5. [테마 시스템 (Light / Dark / Custom)](#5-테마-시스템-light--dark--custom)
6. [디자인 토큰 전체 명세](#6-디자인-토큰-전체-명세)
7. [다국어(i18n) 시스템](#7-다국어i18n-시스템)
8. [컴포넌트별 모던 사이징 명세](#8-컴포넌트별-모던-사이징-명세)
9. [테마 전환 아키텍처](#9-테마-전환-아키텍처)
10. [i18n 기술 아키텍처](#10-i18n-기술-아키텍처)

### Part B. 박스 디자인 시스템 (v2.0 신규)
11. [박스 디자인 현황 분석 & 개선 방향](#11-박스-디자인-현황-분석--개선-방향)
12. [박스 스타일 6종 제안](#12-박스-스타일-6종-제안)
13. [칸반 카드 박스 디자인 적용](#13-칸반-카드-박스-디자인-적용)
14. [패널 & 모달 박스 디자인](#14-패널--모달-박스-디자인)
15. [대시보드 Bento Grid 박스](#15-대시보드-bento-grid-박스)
16. [박스 디자인 토큰 & CSS 명세](#16-박스-디자인-토큰--css-명세)
17. [박스 디자인 선정 매트릭스](#17-박스-디자인-선정-매트릭스)

### Part C. 통합
18. [기존 FRD 변경 영향 분석](#18-기존-frd-변경-영향-분석)
19. [구현 로드맵](#19-구현-로드맵)

---

> **Part A 참조**: 섹션 1~10은 `KanFlow-ModernUI-DesignSystem-v1_0-20260225.md`의 내용과 동일합니다. 글꼴(Pretendard + Inter + Geist Mono), 테마(Light/Dark/System), 사이징(8px 단위), 디자인 토큰(3계층), 다국어(react-i18next ko/en)의 상세 스펙은 해당 문서를 참조하세요. 본 v2.0 문서에서는 Part B(박스 디자인)에 집중합니다.

---

# Part B. 박스 디자인 시스템 (v2.0 신규)

## 11. 박스 디자인 현황 분석 & 개선 방향

### 11.1 현재 박스 디자인 문제점

> **근거**: 첨부된 스크린샷 분석 및 기존 FRD의 카드/패널 스타일 정의 검토

```
현재 KanFlow 박스 디자인 문제 진단:

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  문제 1: 평면적 박스 (Flat & Lifeless)                       │
│  ──────────────────────────────                              │
│  ┌────────────┐                                              │
│  │ Card Title │  ← border: 1px solid #ddd                   │
│  │ Content    │  ← background: #fff                         │
│  │            │  ← shadow: 없음                              │
│  └────────────┘  ← radius: 2-4px                            │
│                                                             │
│  → 깊이감(depth) 없음, 카드가 배경과 분리되지 않음             │
│  → 보더만으로 구분해서 단조로움                                │
│  → 정보 밀도가 높아질수록 읽기 피로 증가                       │
│                                                             │
│  문제 2: 날카로운 모서리 (Sharp Corners)                      │
│  ──────────────────────────────────────                       │
│  ← border-radius: 2-4px                                     │
│  → 올드한 Material Design v1 느낌                            │
│  → 2025 트렌드 대비 너무 각진 인상                            │
│                                                             │
│  문제 3: 획일적 박스 (Monotone Boxes)                         │
│  ──────────────────────────────────                           │
│  → 카드, 패널, 모달, 토스트 모두 같은 스타일                   │
│  → 계층 구분이 안 되어 시각적 피로                             │
│  → 중요도에 따른 시각적 차별화 부재                            │
│                                                             │
│  문제 4: 호버/인터랙션 피드백 부재                             │
│  ──────────────────────────────────                           │
│  → 카드 호버 시 변화 없음 또는 미미                           │
│  → 클릭 가능한 요소와 정적 요소 구분 불가                      │
│  → 사용자가 인터랙티브 요소를 놓침                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 개선 방향 및 벤치마크

```
박스 디자인 개선 전략:

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  전략 1: Elevation System (깊이 체계)                        │
│  → 5단계 Elevation으로 박스 계층화                           │
│  → 벤치마크: Material Design 3, Atlassian, Vercel           │
│                                                             │
│  전략 2: 다양한 박스 스타일 제공                              │
│  → 용도별 6가지 박스 스타일 정의                             │
│  → 같은 카드여도 상태에 따라 스타일 전환                      │
│                                                             │
│  전략 3: 부드러운 모서리 (Soft Rounded)                      │
│  → radius 8-12px로 통일                                     │
│  → 벤치마크: Linear(8px), Notion(8px), Slack(12px)         │
│                                                             │
│  전략 4: 인터랙티브 피드백                                    │
│  → 호버 시 elevation 상승 + 배경색 변화                      │
│  → 드래그 시 shadow 강조 + scale 미세 확대                   │
│  → 클릭(active) 시 살짝 눌림 피드백                          │
│                                                             │
│  전략 5: Light/Dark 모드별 박스 전략 분리                     │
│  → Light: shadow 위주 (떠있는 느낌)                          │
│  → Dark: border 위주 + subtle gradient (구분선 느낌)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. 박스 스타일 6종 제안

### 12.1 전체 박스 스타일 카탈로그

> **근거**: 2025-2026 UI 트렌드 분석 — Glassmorphism(Apple Vision Pro, macOS), Neumorphism(Soft UI), Bento Grid(Apple Keynote), Flat Modern(Linear, Vercel), Outlined(GitHub, Atlassian). 각 스타일의 장단점을 분석하여 KanFlow에 최적화.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    KanFlow 박스 스타일 6종 카탈로그                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  Style A: Elevated (기본 추천 ★)                                        ║
║  Style B: Outlined                                                     ║
║  Style C: Glass (Glassmorphism)                                        ║
║  Style D: Soft (Neumorphism Lite)                                      ║
║  Style E: Gradient Border                                              ║
║  Style F: Flat Filled                                                  ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

### 12.2 Style A: Elevated (기본 추천 ★)

> **벤치마크**: Linear, Vercel Dashboard, Notion

```
Style A: Elevated - 떠있는 카드

  Light Mode:
  ┌──────────────────────┐
  │                      │  background: #FFFFFF
  │   Card Content       │  border: none
  │                      │  border-radius: 8px
  │                      │  box-shadow: 0 1px 3px rgba(0,0,0,0.08),
  └──────────────────────┘               0 1px 2px rgba(0,0,0,0.04)

  Dark Mode:
  ┌──────────────────────┐
  │                      │  background: #1E293B
  │   Card Content       │  border: 1px solid rgba(255,255,255,0.06)
  │                      │  border-radius: 8px
  └──────────────────────┘  box-shadow: 0 1px 3px rgba(0,0,0,0.3)

  호버:                      box-shadow 강화 → 0 4px 12px rgba(0,0,0,0.12)
                             translateY(-1px) 미세 상승 효과
  Active:                    box-shadow 축소 + translateY(0) 눌림

  장점: 정보 밀도 높은 칸반 보드에 최적, 깔끔하고 프로페셔널
  단점: 다소 보수적일 수 있음
  적용: 칸반 카드, 리스트 아이템, 드롭다운 메뉴
```

```css
/* Style A: Elevated */
.box-elevated {
  background: var(--bg-primary);
  border-radius: var(--r-lg);                    /* 8px */
  box-shadow: 0 1px 3px rgba(0,0,0,0.08),
              0 1px 2px rgba(0,0,0,0.04);
  transition: all var(--transition-fast);
}
.box-elevated:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.12),
              0 2px 4px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.box-elevated:active {
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  transform: translateY(0);
}

/* Dark Mode */
[data-theme="dark"] .box-elevated {
  background: var(--bg-secondary);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
[data-theme="dark"] .box-elevated:hover {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
```

---

### 12.3 Style B: Outlined

> **벤치마크**: GitHub, Atlassian Jira, GitLab

```
Style B: Outlined - 테두리 강조 카드

  Light Mode:
  ┌──────────────────────┐
  │                      │  background: #FFFFFF
  │   Card Content       │  border: 1px solid #E2E8F0
  │                      │  border-radius: 8px
  └──────────────────────┘  box-shadow: none

  Dark Mode:
  ┌──────────────────────┐
  │                      │  background: transparent
  │   Card Content       │  border: 1px solid #334155
  │                      │  border-radius: 8px
  └──────────────────────┘  box-shadow: none

  호버:                      border-color → --accent (파란 테두리)
                             background → rgba(37,99,235,0.04) 미세 배경
  드래그 중:                  border: 2px dashed --accent

  장점: 가볍고 심플, 정보 밀도 높아도 산만하지 않음
  단점: 깊이감 부족, 다소 밋밋할 수 있음
  적용: 보드 사이드바 아이템, 체크리스트, 설정 카드
```

```css
/* Style B: Outlined */
.box-outlined {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--r-lg);
  transition: all var(--transition-fast);
}
.box-outlined:hover {
  border-color: var(--accent);
  background: rgba(37, 99, 235, 0.04);
}
/* 선택/활성 상태 */
.box-outlined--selected {
  border-color: var(--accent);
  background: var(--accent-light);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
```

---

### 12.4 Style C: Glass (Glassmorphism)

> **벤치마크**: macOS Big Sur, Apple Vision Pro, Windows 11 Mica, Vercel 랜딩 페이지

```
Style C: Glass - 반투명 유리 효과

  Light Mode:
  ╭──────────────────────╮
  │ ░░░░░░░░░░░░░░░░░░░ │  background: rgba(255,255,255,0.72)
  │ ░░ Card Content  ░░░ │  backdrop-filter: blur(16px) saturate(180%)
  │ ░░░░░░░░░░░░░░░░░░░ │  border: 1px solid rgba(255,255,255,0.4)
  ╰──────────────────────╯  border-radius: 12px
                             box-shadow: 0 8px 32px rgba(0,0,0,0.06)

  Dark Mode:
  ╭──────────────────────╮
  │ ░░░░░░░░░░░░░░░░░░░ │  background: rgba(15,23,42,0.72)
  │ ░░ Card Content  ░░░ │  backdrop-filter: blur(16px) saturate(180%)
  │ ░░░░░░░░░░░░░░░░░░░ │  border: 1px solid rgba(255,255,255,0.08)
  ╰──────────────────────╯  border-radius: 12px

  장점: 고급스러운 느낌, 배경과 자연스럽게 어우러짐
  단점: 성능 비용 (blur), 접근성 주의 (대비 부족 가능)
  적용: 오버레이 팝업, 명령 팔레트, 검색 바, 토스트 알림
  주의: 텍스트 배경에는 최소 opacity 0.72 이상 유지 (WCAG AA)
```

```css
/* Style C: Glass */
.box-glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--r-xl);                     /* 12px */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .box-glass {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
/* Fallback: backdrop-filter 미지원 시 */
@supports not (backdrop-filter: blur(1px)) {
  .box-glass {
    background: rgba(255, 255, 255, 0.95);
  }
}
```

---

### 12.5 Style D: Soft (Neumorphism Lite)

> **벤치마크**: Neumorphism Day & Night, iOS 위젯

```
Style D: Soft - 부드러운 음각/양각 효과 (Neumorphism Lite)

  Light Mode (양각 - Raised):
  ╭──────────────────────╮
  │                      │  background: #F1F5F9
  │   Card Content       │  border: none
  │                      │  border-radius: 12px
  ╰──────────────────────╯  box-shadow: 6px 6px 12px rgba(166,180,200,0.3),
                                       -6px -6px 12px rgba(255,255,255,0.8)

  Light Mode (음각 - Inset):
  ╭──────────────────────╮
  │   ╭────────────────╮ │  (부모: F1F5F9)
  │   │ Pressed Input  │ │  background: #F1F5F9
  │   ╰────────────────╯ │  box-shadow: inset 3px 3px 6px rgba(166,180,200,0.25),
  ╰──────────────────────╯               inset -3px -3px 6px rgba(255,255,255,0.7)

  장점: 독특한 촉감적 느낌, 앱 분위기에 따라 아이덴티티 부여
  단점: 접근성 이슈 (대비 부족), 정보 밀도에 부적합
  적용: 대시보드 위젯, 통계 카드, 토글/슬라이더 배경
  제한: 칸반 카드에는 부적합 (정보 밀도↓), 보조 요소에만 사용
```

```css
/* Style D: Soft Raised */
.box-soft {
  background: var(--gray-100);
  border-radius: var(--r-xl);
  box-shadow: 6px 6px 12px rgba(166, 180, 200, 0.3),
             -6px -6px 12px rgba(255, 255, 255, 0.8);
}
/* Style D: Soft Inset (눌린 상태, 입력 필드용) */
.box-soft-inset {
  background: var(--gray-100);
  border-radius: var(--r-xl);
  box-shadow: inset 3px 3px 6px rgba(166, 180, 200, 0.25),
              inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}
[data-theme="dark"] .box-soft {
  background: var(--gray-800);
  box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.35),
             -6px -6px 12px rgba(55, 65, 81, 0.25);
}
```

---

### 12.6 Style E: Gradient Border

> **벤치마크**: Stripe, Vercel, Linear 프리미엄 카드

```
Style E: Gradient Border - 그라데이션 테두리

  ╭──────────────────────╮   border: gradient (투명 → 파랑 → 보라)
  │                      │   
  │  ✨ Premium Card     │   background: #FFFFFF
  │  중요한 카드, 강조용   │   border-radius: 12px
  │                      │   
  ╰──────────────────────╯   padding: 1px (border 두께)

  그라데이션 방향: top-left → bottom-right
  색상: rgba(99,102,241,0.4) → rgba(168,85,247,0.4)

  장점: 시선 집중 효과, 프리미엄/VIP 느낌
  단점: 남용 시 산만, CSS 구현 약간 복잡 (border-image 제한)
  적용: 현재 선택된 카드, 핀 고정 코멘트, 프리미엄 기능 하이라이트
  빈도: 화면당 최대 1~2개 (남용 금지)
```

```css
/* Style E: Gradient Border (pseudo-element 기법) */
.box-gradient-border {
  position: relative;
  background: var(--bg-primary);
  border-radius: var(--r-xl);
  padding: var(--sp-4);
}
.box-gradient-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r-xl);
  padding: 1px;                        /* border 두께 */
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.4),
    rgba(168, 85, 247, 0.4)
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
/* 호버 시 그라데이션 강화 */
.box-gradient-border:hover::before {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.7),
    rgba(168, 85, 247, 0.7)
  );
}
```

---

### 12.7 Style F: Flat Filled

> **벤치마크**: Slack 메시지 배경, Discord 채널 카드

```
Style F: Flat Filled - 배경색으로 구분

  Light Mode:
  ┌──────────────────────┐
  │                      │  background: #F1F5F9
  │   Card Content       │  border: none
  │                      │  border-radius: 8px
  └──────────────────────┘  box-shadow: none

  Dark Mode:
  ┌──────────────────────┐
  │                      │  background: #1E293B
  │   Card Content       │  border: none
  │                      │  border-radius: 8px
  └──────────────────────┘  box-shadow: none

  호버:                      background 약간 진하게 → #E2E8F0

  장점: 가장 가볍고 심플, 성능 최고, 어디에나 적합
  단점: 깊이감 부족, 중요 요소에는 약함
  적용: 사이드바 아이템, 코멘트 배경, 활동 로그 아이템, 배지
```

```css
/* Style F: Flat Filled */
.box-flat {
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--r-lg);
  transition: background var(--transition-fast);
}
.box-flat:hover {
  background: var(--bg-tertiary);
}
```

---

### 12.8 6종 비교 총괄표

```
박스 스타일 6종 비교 총괄:

┌────────┬───────────┬──────────┬───────────┬──────────┬────────────┬──────────┐
│        │ A.Elevated│ B.Outline│ C.Glass   │ D.Soft   │ E.Gradient │ F.Flat   │
├────────┼───────────┼──────────┼───────────┼──────────┼────────────┼──────────┤
│ 깊이감  │ ★★★★     │ ★★       │ ★★★★★    │ ★★★★     │ ★★★        │ ★        │
│ 가독성  │ ★★★★★    │ ★★★★★   │ ★★★      │ ★★★     │ ★★★★      │ ★★★★★   │
│ 성능    │ ★★★★     │ ★★★★★   │ ★★★      │ ★★★★    │ ★★★★      │ ★★★★★   │
│ 모던 감 │ ★★★★     │ ★★★     │ ★★★★★    │ ★★★★    │ ★★★★★     │ ★★★      │
│ 접근성  │ ★★★★★    │ ★★★★★   │ ★★★      │ ★★★     │ ★★★★      │ ★★★★★   │
│ 다크모드│ ★★★★     │ ★★★★    │ ★★★★★    │ ★★★     │ ★★★★      │ ★★★★    │
├────────┼───────────┼──────────┼───────────┼──────────┼────────────┼──────────┤
│ 추천   │ ★ 기본    │ 보조      │ 오버레이   │ 대시보드 │ 강조 전용   │ 리스트   │
└────────┴───────────┴──────────┴───────────┴──────────┴────────────┴──────────┘
```

---

## 13. 칸반 카드 박스 디자인 적용

### 13.1 칸반 카드 기본: Style A (Elevated)

```
칸반 카드 (기본 상태):

  ┌───────────────────────────┐
  │ 🔴 KF-042                │   ← 좌측 3px 우선순위 바 (Critical: 빨강)
  │                           │
  │ 사용자 인증 구현            │   ← font: 14px, --fw-medium
  │                           │
  │ 🟣 버그  🔵 기능           │   ← 라벨 pill 배지 (radius: full)
  │                           │
  │ 👤👤  📅 D-5  💬 3  📎 2  │   ← 아바타 24px + 메타 정보
  └───────────────────────────┘
  ↑ radius: 8px
  ↑ padding: 12px
  ↑ shadow: 0 1px 3px rgba(0,0,0,0.08)
  ↑ gap (내부 요소 간): 8px

칸반 카드 (호버):

  ┌───────────────────────────────────┐
  │ 🔴 KF-042     [✏️][👤][📅][⋯]   │   ← 호버 액션 바 (플로팅)
  │                                   │
  │ 사용자 인증 구현                    │   ← 배경: 미세 하이라이트
  │                                   │
  │ 🟣 버그  🔵 기능                   │
  │                                   │
  │ 👤👤  📅 D-5  💬 3  📎 2          │
  └───────────────────────────────────┘
  ↑ shadow: 0 4px 12px rgba(0,0,0,0.12)  (강화)
  ↑ transform: translateY(-1px)           (미세 상승)

칸반 카드 (드래그 중):

  ╭───────────────────────────╮
  │ 🔴 KF-042                │   ← 드래그 고스트
  │ 사용자 인증 구현            │   ← opacity: 0.9
  │ 🟣 버그  🔵 기능           │   ← transform: rotate(3deg) scale(1.02)
  │ 👤👤  📅 D-5              │   ← shadow: 0 16px 40px rgba(0,0,0,0.16)
  ╰───────────────────────────╯

칸반 카드 (선택됨 / 현재 보고 있는 카드):

  ┌───────────────────────────┐
  │ 🔴 KF-042                │   ← border-left: 3px solid --accent
  │ 사용자 인증 구현            │   ← background: --accent-light
  │ 🟣 버그  🔵 기능           │      (연한 파랑 배경)
  │ 👤👤  📅 D-5  💬 3  📎 2  │
  └───────────────────────────┘
```

### 13.2 칸반 카드 상태별 스타일 맵

```
칸반 카드 5가지 상태:

State           Shadow                    Border                Background         Transform
──────────────────────────────────────────────────────────────────────────────────────────────────
Default         --shadow-sm               none                  --bg-primary       none
Hover           --shadow-md               none                  --bg-primary       translateY(-1px)
Selected        --shadow-sm               left 3px --accent     --accent-light     none
Dragging        --shadow-xl               none                  --bg-primary       rotate(3deg) scale(1.02)
Overdue         --shadow-sm               left 3px --error      --error-light      none
```

---

## 14. 패널 & 모달 박스 디자인

### 14.1 우측 디테일 패널: Style A + C 하이브리드

```
디테일 패널 (4영역):

  ┌──────────────────────────────────────┐
  │ ← 보드명 > 컬럼명          [↗] [✕]  │  ← 헤더: --bg-secondary
  ├──────────────────────────────────────┤  ← border-bottom: 1px
  │                                      │
  │  📋 KF-042                           │  ← 콘텐츠: --bg-primary
  │  ┌─────────────────────────────────┐ │
  │  │ 사용자 인증 구현                  │ │  ← 제목 인라인 편집
  │  └─────────────────────────────────┘ │
  │                                      │
  │  ── 속성 (Flat Filled 박스) ──        │
  │  ┌─────────────────────────────────┐ │
  │  │ 상태     │ In Progress          │ │  ← Style F 적용
  │  │ 담당자   │ 👤김개발              │ │     background: --bg-secondary
  │  │ 우선순위 │ 🔴 Critical          │ │     radius: 8px
  │  └─────────────────────────────────┘ │
  │                                      │
  │  ── 탭 영역 ──                       │
  │  [설명] [서브태스크] [코멘트 5]       │  ← 탭 아이템: Flat Filled hover
  │                                      │
  │  ┌─────────────────────────────────┐ │
  │  │ 코멘트 영역                      │ │  ← 스크롤 영역
  │  │                                 │ │
  │  │ 👤 김개발  14:30                 │ │  ← 코멘트: Style F (Flat)
  │  │ ┌───────────────────────────┐   │ │
  │  │ │ API 인증 방식을 JWT에서... │   │ │     배경: --bg-secondary
  │  │ │ 👍 2  💡 1                │   │ │     호버 시 --bg-tertiary
  │  │ └───────────────────────────┘   │ │
  │  │                                 │ │
  │  └─────────────────────────────────┘ │
  │                                      │
  │  ┌─────────────────────────────────┐ │
  │  │ 코멘트 입력...                   │ │  ← 컴포저: Outlined 스타일
  │  ├─────────────────────────────────┤ │     focus 시 --border-focus
  │  │ [＋] [Aa] [😊] [@]         [▶] │ │     radius: 8px
  │  └─────────────────────────────────┘ │
  │                                      │
  └──────────────────────────────────────┘
  ↑ 전체 패널: border-left: 1px solid --border-primary
  ↑ shadow: -4px 0 16px rgba(0,0,0,0.06) (좌측으로 그림자)
```

### 14.2 명령 팔레트 (Command Palette): Style C (Glass)

```
명령 팔레트 (Ctrl+K):

  ─── 배경: 딤 오버레이 (--bg-overlay) ───

  ╭────────────────────────────────────────╮
  │ 🔍 명령 또는 카드를 검색하세요...       │  ← Glass 스타일
  ├────────────────────────────────────────┤  ← backdrop-filter: blur(16px)
  │                                        │
  │  최근                                   │
  │  📋 KF-042 사용자 인증 구현             │  ← Flat Filled 아이템
  │  📋 KF-045 프론트 컴포넌트              │
  │                                        │
  │  명령                                   │
  │  ⚡ 새 카드 만들기          Ctrl+N      │
  │  🔀 보드 전환              Ctrl+B      │
  │  🎨 테마 변경              Ctrl+Shift+T│
  │                                        │
  ╰────────────────────────────────────────╯
  ↑ radius: 12px
  ↑ max-width: 640px, center
  ↑ animation: slide-down 200ms
```

### 14.3 토스트 알림: Style C (Glass)

```
토스트 알림 (우하단):

  ╭─────────────────────────────────────╮
  │ ✅  카드가 이동되었습니다            │  ← Glass 스타일
  │     KF-042 → Review 컬럼    [되돌리기]│  ← backdrop-filter: blur(12px)
  ╰─────────────────────────────────────╯  ← radius: 12px
                                           ← 3초 후 자동 닫힘
                                           ← animation: slide-in-from-right
```

### 14.4 드롭다운 메뉴: Style A (Elevated)

```
드롭다운 메뉴:

  ┌─────────────────────────┐
  │ ☐ 🟣 버그               │  ← Elevated 스타일
  │ ☑ 🔵 기능               │  ← shadow: --shadow-lg
  │ ☐ 🟢 개선               │  ← radius: 8px
  │ ☐ 🟡 문서               │  ← 각 아이템: Flat hover
  ├─────────────────────────┤
  │ ＋ 새 라벨 만들기        │  ← 구분선: --border-primary
  └─────────────────────────┘
  ↑ min-width: 200px
  ↑ animation: scale-in 150ms (origin: top)
```

---

## 15. 대시보드 Bento Grid 박스

### 15.1 Bento Grid 레이아웃

> **근거**: Apple Keynote 스타일 Bento Grid는 대시보드 콘텐츠를 모듈형 카드로 배치하는 2025년 핵심 UI 트렌드이다. 프로젝트 관리 도구의 대시보드에 최적.

```
대시보드 Bento Grid:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐ │
│  │ 📊 CFD 차트      │ │ ⏱️ 평균          │ │ 🎯 완료율  │ │
│  │                  │ │ 사이클타임        │ │           │ │
│  │  Style D (Soft)  │ │                  │ │ 78%       │ │
│  │  큰 영역 차트     │ │  3.2일           │ │  ██████░░ │ │
│  │  (2x2 span)     │ │  Style D (Soft)  │ │ Style D   │ │
│  │                  │ │  (1x1)           │ │ (1x1)     │ │
│  │                  │ └─────────────────┘ └───────────┘ │
│  │                  │ ┌─────────────────┐ ┌───────────┐ │
│  │                  │ │ 📈 처리량         │ │ ⚠️ 초과    │ │
│  │                  │ │                  │ │           │ │
│  │                  │ │  주 12건          │ │  3건      │ │
│  │                  │ │  Style D (Soft)  │ │ Style E   │ │
│  └─────────────────┘ │  (1x1)           │ │ Gradient  │ │
│                       └─────────────────┘ │ (강조)     │ │
│                                           └───────────┘ │
│  ┌─────────────────────────────┐ ┌──────────────────┐   │
│  │ 📋 진행 중인 카드 Top 5      │ │ 👥 팀 워크로드    │   │
│  │                              │ │                  │   │
│  │  1. KF-042 사용자 인증 D-5  │ │ 김개발  ████ 4   │   │
│  │  2. KF-045 프론트 D-3       │ │ 이디자인 ██░ 2   │   │
│  │  3. KF-048 코드리뷰 D-1     │ │ 박매니저 █░░ 1   │   │
│  │                              │ │                  │   │
│  │  Style A (Elevated)          │ │ Style A          │   │
│  │  (2x1 span)                  │ │ (1x1)            │   │
│  └─────────────────────────────┘ └──────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Bento Grid CSS:
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(160px, auto);
  gap: 16px (--sp-4);
  padding: 24px (--sp-6);

각 위젯 카드:
  • 숫자 중심 KPI: Style D (Soft) → 부드러운 깊이감
  • 리스트/테이블: Style A (Elevated) → 선명한 구분
  • 경고/강조: Style E (Gradient Border) → 시선 집중
```

### 15.2 Bento 위젯 카드 내부 구조

```
KPI 위젯 카드 (Style D):

  ╭──────────────────────╮
  │ ⏱️ 평균 사이클타임    │  ← 라벨: 12px, --text-secondary
  │                      │
  │      3.2일            │  ← 숫자: 30px, --fw-bold
  │                      │
  │  ▼ 0.5일 (지난 주 대비)│  ← 변화량: --success (초록) 또는 --error
  ╰──────────────────────╯
  ↑ padding: 20px
  ↑ radius: 12px
  ↑ 배경: --gray-100 (Light) / --gray-800 (Dark)
```

---

## 16. 박스 디자인 토큰 & CSS 명세

### 16.1 Elevation 시스템 토큰

```
Elevation (깊이) 5단계 시스템:

Level     용도                 Light Shadow                          Dark 처리
───────────────────────────────────────────────────────────────────────────────────
E0        기본 (깊이 없음)      none                                  none
E1        카드, 리스트 아이템    0 1px 3px rgba(0,0,0,0.08)          border 1px
E2        드롭다운, 팝오버       0 4px 12px rgba(0,0,0,0.12)         border 1px + shadow
E3        모달, 디테일 패널      0 8px 24px rgba(0,0,0,0.14)         border 1px + shadow
E4        드래그 중, 명령팔레트   0 16px 40px rgba(0,0,0,0.16)        shadow 강화
E5        토스트 (최상위)        0 20px 48px rgba(0,0,0,0.18)        shadow 강화
```

### 16.2 컴포넌트 → 박스 스타일 매핑

```
컴포넌트별 박스 스타일 + Elevation 매핑:

컴포넌트             박스 스타일    Elevation   Radius    비고
────────────────────────────────────────────────────────────────────
칸반 카드             A (Elevated)  E1         --r-lg    기본 카드
칸반 카드 (호버)       A             E2         --r-lg    +translateY
칸반 카드 (드래그)     A             E4         --r-lg    +rotate+scale
디테일 패널           A             E3         --r-none  좌측만 shadow
사이드바 아이템       F (Flat)      E0         --r-md    배경색 구분
코멘트 말풍선         F (Flat)      E0         --r-lg    배경색 구분
코멘트 컴포저         B (Outlined)  E0         --r-lg    focus 시 glow
드롭다운 메뉴         A (Elevated)  E2         --r-lg    shadow 강조
명령 팔레트           C (Glass)     E4         --r-xl    blur 효과
토스트 알림           C (Glass)     E5         --r-xl    blur + float
모달 (확인 다이얼로그) A (Elevated)  E3         --r-xl    center
대시보드 KPI 위젯     D (Soft)      특수       --r-xl    뉴모피즘 쉐도
대시보드 리스트 위젯   A (Elevated)  E1         --r-xl    일반 카드
핀 고정 코멘트        E (Gradient)  E1         --r-lg    보더 강조 (제한)
검색 바               B (Outlined)  E0         --r-full  pill shape
배지/태그             F (Flat)      E0         --r-full  pill shape
아바타                -             E0         --r-full  원형
```

---

## 17. 박스 디자인 선정 매트릭스

### 17.1 최종 추천 구성

```
KanFlow 최종 박스 디자인 추천 구성:

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Primary (80%):   Style A - Elevated                        │
│  ──────────────                                             │
│  → 칸반 카드, 드롭다운, 모달, 대부분의 박스에 적용            │
│  → 가독성 ★★★★★ + 접근성 ★★★★★                             │
│  → Light/Dark 모두 안정적                                    │
│                                                             │
│  Secondary (15%): Style F - Flat Filled                     │
│  ────────────────                                           │
│  → 사이드바 아이템, 코멘트 배경, 활동 로그                    │
│  → 반복되는 리스트에서 가장 가볍고 성능 좋음                   │
│                                                             │
│  Accent (5%):     Style C - Glass + Style E - Gradient      │
│  ──────────────                                             │
│  → Glass: 명령 팔레트, 토스트 (오버레이 전용)                 │
│  → Gradient: 핀 고정, 선택 강조 (화면당 1~2개 제한)           │
│                                                             │
│  Dashboard Only:  Style D - Soft (Neumorphism Lite)         │
│  ────────────────                                           │
│  → 대시보드 KPI 위젯에만 사용 (시각적 차별화)                 │
│  → 칸반 보드에서는 사용 안 함                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 선정 의사결정 흐름

```
새 컴포넌트에 박스 스타일 적용 시 의사결정 흐름:

[새 박스 컴포넌트 필요]
       │
       ▼
  오버레이(팝업) 위에 표시되는가?
  ├── Yes → Style C (Glass) → backdrop-filter: blur
  │
  └── No
       │
       ▼
  시선 집중이 필요한 강조 요소인가?
  ├── Yes → Style E (Gradient Border) → 화면당 1~2개 제한
  │
  └── No
       │
       ▼
  대시보드 KPI/통계 위젯인가?
  ├── Yes → Style D (Soft Neumorphism)
  │
  └── No
       │
       ▼
  리스트에서 반복되는 아이템인가?
  ├── Yes → Style F (Flat Filled) → 배경색 구분
  │
  └── No
       │
       ▼
  기본 → Style A (Elevated) → shadow + radius 8px
```

---

# Part C. 통합

## 18. 기존 FRD 변경 영향 분석

```
v2.0 추가 변경 영향:

1. FRD §4 카드 관리 전체
   → 칸반 카드 5가지 상태별 박스 스타일 토큰 적용
   → 드래그 시 shadow + transform 애니메이션 추가
   → 선택 상태 시 accent-light 배경 + left-border

2. FRD §17 보드 뷰 모드 (대시보드)
   → Bento Grid 레이아웃 적용
   → KPI 위젯: Style D, 리스트 위젯: Style A
   → 반응형: 3col → 2col → 1col (브레이크포인트)

3. FRD §16 알림 시스템
   → 토스트 알림: Style C (Glass) 적용
   → 인앱 알림 아이템: Style F (Flat) 적용

4. FRD §10 검색/필터
   → 명령 팔레트: Style C (Glass) + E3 elevation
   → 검색 바: Style B (Outlined) + pill radius

5. UI/UX 리디자인 문서
   → 호버 액션 바: E2 elevation + radius-lg
   → 코멘트 컴포저: Style B (Outlined)
   → 스레드 뷰: 코멘트 Style F, 답글 영역 Style F

6. Additional Features 문서
   → Rich Editor: Style B (Outlined) 에디터 컨테이너
   → Webhook 관리: Style A (Elevated) 카드
   → Share Link 설정: Style A 모달
```

## 19. 구현 로드맵

```
박스 디자인 시스템 구현 순서:

Phase 1: 토큰 정의 (1일)
─────────────────────────────────────
  • Elevation E0~E5 CSS 변수 정의
  • 6종 박스 스타일 CSS 클래스 작성
  • Light/Dark 양쪽 shadow 값 정의
  • Tailwind 플러그인으로 box-elevated, box-glass 등 유틸리티 생성

Phase 2: 코어 컴포넌트 적용 (2~3일)
─────────────────────────────────────
  • <Card /> 컴포넌트: Style A + 5가지 상태
  • <DropdownMenu />: Style A + E2
  • <Panel />: 디테일 패널 좌측 shadow
  • <Toast />: Style C + 슬라이드 애니메이션
  • <CommandPalette />: Style C + E4

Phase 3: 대시보드 Bento (2일)
─────────────────────────────────────
  • <BentoGrid /> 레이아웃 컴포넌트
  • <KPIWidget />: Style D
  • <ListWidget />: Style A
  • <AlertWidget />: Style E (Gradient)

Phase 4: 전체 QA (1일)
─────────────────────────────────────
  • Light/Dark 전체 컴포넌트 박스 스타일 검수
  • 접근성: WCAG AA 명암비 (Glass 스타일 특별 검증)
  • 성능: backdrop-filter 사용 컴포넌트 GPU 렌더링 확인
  • 브라우저: Chrome/Safari/Firefox/Edge 크로스 브라우저

전제 라이브러리:
  • tailwindcss ^4.x  ✅ (기존 스택)
  • framer-motion ^11.x → 드래그 카드 애니메이션
  • 추가 의존성 없음 (순수 CSS Custom Properties)
```

---

> **문서 끝**  
> 버전: v2.0 | 작성일: 2026-02-25  
> 변경 요약 (v1.0 → v2.0):  
> - **추가**: 박스 디자인 6종 제안 (Elevated, Outlined, Glass, Soft, Gradient, Flat)  
> - **추가**: 칸반 카드 5가지 상태별 박스 스타일 매핑  
> - **추가**: 대시보드 Bento Grid 레이아웃 + 위젯 디자인  
> - **추가**: 패널, 모달, 토스트, 명령팔레트 박스 디자인  
> - **추가**: Elevation E0~E5 깊이 시스템  
> - **추가**: 컴포넌트→박스 스타일 매핑표 (20+개)  
> - **추가**: 박스 스타일 선정 의사결정 플로우차트  
> - **유지**: Part A (테마, 사이징, i18n, 글꼴) → v1.0 참조  
