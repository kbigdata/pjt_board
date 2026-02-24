---
name: dnd-feature
description: >
  드래그 앤 드롭 기능을 구현할 때 사용.
  @hello-pangea/dnd 라이브러리와 fractional indexing을 사용한
  KanFlow의 DnD 패턴에 맞게 구현한다.
---

# 드래그 앤 드롭 구현 패턴

## 라이브러리
- `@hello-pangea/dnd` (react-beautiful-dnd 포크)

## 구조
```tsx
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="board" direction="horizontal" type="COLUMN">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {columns.map((col, index) => (
          <Draggable key={col.id} draggableId={col.id} index={index}>
            <Column>
              <Droppable droppableId={col.id} type="CARD">
                {/* 카드 목록 */}
              </Droppable>
            </Column>
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

## Fractional Indexing
```typescript
function calculatePosition(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000;
  if (before === null) return after! / 2;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}
```

## Optimistic Update 패턴
1. 클라이언트에서 즉시 UI 업데이트 (낙관적)
2. API 호출 (백그라운드)
3. 성공: 서버 응답으로 캐시 갱신
4. 실패: UI 롤백 + 에러 토스트

## Position Rebalancing
- 정밀도가 0.001 미만으로 떨어지면 전체 리밸런싱
- 서버에서 일괄 업데이트: `UPDATE cards SET position = row_number() * 1000`

## WebSocket 동기화
- 드래그 완료 시 Socket.io로 다른 클라이언트에 브로드캐스트
- 이벤트: `card:moved`, `column:moved`, `swimlane:moved`
