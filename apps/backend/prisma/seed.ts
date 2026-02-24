import { PrismaClient, Role, Priority, ColumnType, Visibility } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users ---
  const password = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kanflow.dev' },
    update: {},
    create: {
      email: 'admin@kanflow.dev',
      name: 'Admin User',
      password,
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: 'alice@kanflow.dev' },
    update: {},
    create: {
      email: 'alice@kanflow.dev',
      name: 'Alice Kim',
      password,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@kanflow.dev' },
    update: {},
    create: {
      email: 'bob@kanflow.dev',
      name: 'Bob Park',
      password,
    },
  });

  console.log('Users created:', admin.email, alice.email, bob.email);

  // --- Workspace ---
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'kanflow-team' },
    update: {},
    create: {
      name: 'KanFlow Team',
      slug: 'kanflow-team',
      description: 'KanFlow 프로젝트 워크스페이스',
      ownerId: admin.id,
    },
  });

  // Workspace members
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: admin.id, role: Role.OWNER },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: alice.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: alice.id, role: Role.ADMIN },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: bob.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: bob.id, role: Role.MEMBER },
  });

  console.log('Workspace created:', workspace.name);

  // --- Board ---
  let board = await prisma.board.findFirst({ where: { workspaceId: workspace.id, title: 'Sprint 1' } });
  if (!board) {
    board = await prisma.board.create({
      data: {
        workspaceId: workspace.id,
        title: 'Sprint 1',
        description: '2026년 2월 스프린트',
        visibility: Visibility.PRIVATE,
        position: 1024,
        createdById: admin.id,
      },
    });
  }

  // Board members
  for (const user of [admin, alice, bob]) {
    const role = user.id === admin.id ? Role.OWNER : user.id === alice.id ? Role.ADMIN : Role.MEMBER;
    await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: board.id, userId: user.id } },
      update: {},
      create: { boardId: board.id, userId: user.id, role },
    });
  }

  console.log('Board created:', board.title);

  // --- Columns ---
  const columnDefs = [
    { title: 'Backlog', type: ColumnType.TODO, position: 1024, color: '#94A3B8' },
    { title: 'In Progress', type: ColumnType.IN_PROGRESS, position: 2048, color: '#3B82F6', wipLimit: 3 },
    { title: 'Review', type: ColumnType.CUSTOM, position: 3072, color: '#F59E0B', wipLimit: 2 },
    { title: 'Done', type: ColumnType.DONE, position: 4096, color: '#10B981' },
  ];

  const columns: Record<string, string> = {};
  for (const def of columnDefs) {
    let col = await prisma.column.findFirst({
      where: { boardId: board.id, title: def.title },
    });
    if (!col) {
      col = await prisma.column.create({
        data: {
          boardId: board.id,
          title: def.title,
          columnType: def.type,
          position: def.position,
          color: def.color,
          wipLimit: def.wipLimit ?? null,
        },
      });
    }
    columns[def.title] = col.id;
  }

  console.log('Columns created:', Object.keys(columns).join(', '));

  // --- Labels ---
  const labelDefs = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Enhancement', color: '#8B5CF6' },
    { name: 'Documentation', color: '#6B7280' },
    { name: 'Urgent', color: '#F97316' },
  ];

  const labels: Record<string, string> = {};
  for (const def of labelDefs) {
    let label = await prisma.label.findFirst({
      where: { boardId: board.id, name: def.name },
    });
    if (!label) {
      label = await prisma.label.create({
        data: { boardId: board.id, name: def.name, color: def.color },
      });
    }
    labels[def.name] = label.id;
  }

  console.log('Labels created:', Object.keys(labels).join(', '));

  // --- Cards ---
  const existingCards = await prisma.card.count({ where: { boardId: board.id } });
  if (existingCards === 0) {
    const cardDefs = [
      { title: 'JWT 인증 구현', columnTitle: 'Done', priority: Priority.HIGH, assignee: admin.id, labels: ['Feature'], number: 1 },
      { title: '워크스페이스 CRUD API', columnTitle: 'Done', priority: Priority.HIGH, assignee: admin.id, labels: ['Feature'], number: 2 },
      { title: '보드 권한 설정', columnTitle: 'Review', priority: Priority.MEDIUM, assignee: alice.id, labels: ['Feature'], number: 3 },
      { title: '카드 드래그 앤 드롭', columnTitle: 'In Progress', priority: Priority.HIGH, assignee: bob.id, labels: ['Feature'], number: 4 },
      { title: '로그인 페이지 UI', columnTitle: 'In Progress', priority: Priority.MEDIUM, assignee: alice.id, labels: ['Feature'], number: 5 },
      { title: 'WebSocket 실시간 동기화', columnTitle: 'Backlog', priority: Priority.MEDIUM, assignee: null, labels: ['Feature', 'Enhancement'], number: 6 },
      { title: 'Swagger API 문서 누락 필드', columnTitle: 'Backlog', priority: Priority.LOW, assignee: null, labels: ['Bug'], number: 7 },
      { title: '대시보드 통계 위젯', columnTitle: 'Backlog', priority: Priority.LOW, assignee: null, labels: ['Enhancement'], number: 8 },
      { title: '비밀번호 변경 시 에러 처리 누락', columnTitle: 'In Progress', priority: Priority.CRITICAL, assignee: admin.id, labels: ['Bug', 'Urgent'], number: 9 },
      { title: 'API README 작성', columnTitle: 'Review', priority: Priority.LOW, assignee: bob.id, labels: ['Documentation'], number: 10 },
    ];

    for (const def of cardDefs) {
      const card = await prisma.card.create({
        data: {
          boardId: board.id,
          columnId: columns[def.columnTitle],
          cardNumber: def.number,
          title: def.title,
          priority: def.priority,
          position: def.number * 1024,
          createdById: admin.id,
        },
      });

      if (def.assignee) {
        await prisma.cardAssignee.create({
          data: { cardId: card.id, userId: def.assignee },
        });
      }

      for (const labelName of def.labels) {
        await prisma.cardLabel.create({
          data: { cardId: card.id, labelId: labels[labelName] },
        });
      }
    }

    // Add a checklist to card 3
    const card3 = await prisma.card.findFirst({ where: { boardId: board.id, cardNumber: 3 } });
    if (card3) {
      const checklist = await prisma.checklist.create({
        data: { cardId: card3.id, title: 'Review Checklist', position: 1024 },
      });
      await prisma.checklistItem.createMany({
        data: [
          { checklistId: checklist.id, title: 'Code review 완료', isChecked: true, position: 1024 },
          { checklistId: checklist.id, title: 'Unit test 통과 확인', isChecked: true, position: 2048 },
          { checklistId: checklist.id, title: 'QA 테스트', isChecked: false, position: 3072 },
        ],
      });

      // Add a comment
      await prisma.comment.create({
        data: { cardId: card3.id, authorId: alice.id, content: 'RBAC 구현 확인 필요합니다.' },
      });
    }

    console.log('Cards created:', cardDefs.length);
  } else {
    console.log('Cards already exist, skipping...');
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
