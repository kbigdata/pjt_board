---
name: react-component
description: >
  React 컴포넌트를 생성할 때 사용.
  KanFlow 프로젝트의 패턴(Tailwind, TanStack Query, Zustand)에 맞게
  컴포넌트와 관련 hooks를 생성한다.
---

# React 컴포넌트 생성 패턴

## 파일 구조
```
apps/frontend/src/
├── components/<ComponentName>.tsx
├── hooks/use<Feature>.ts
├── stores/<feature>Store.ts
├── api/<feature>.ts
└── types/<feature>.ts
```

## 컴포넌트 패턴
- 함수형 컴포넌트 + hooks만 사용
- inline `style={}` 금지 — Tailwind 유틸리티 클래스 사용
- Props 인터페이스는 컴포넌트 파일 상단에 정의

## API Hook 패턴 (TanStack Query)
```typescript
// hooks/use<Feature>.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function use<Feature>() {
  return useQuery({
    queryKey: ['<feature>'],
    queryFn: () => api.get<Feature[]>(),
  });
}

export function useCreate<Feature>() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDto) => api.post<Feature>(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['<feature>'] }),
  });
}
```

## 상태 관리 패턴 (Zustand)
- 서버 상태: TanStack Query (캐시, 동기화)
- 클라이언트 전용 상태: Zustand (UI 상태, 필터, 모달)

## DnD 연동
- @hello-pangea/dnd 사용
- Optimistic UI → API call → 실패 시 rollback
