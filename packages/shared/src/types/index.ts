// ============================================================
// KanFlow Shared Types
// ============================================================

// --- Enums ---

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ColumnType {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CUSTOM = 'CUSTOM',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum LinkType {
  BLOCKS = 'BLOCKS',
  BLOCKED_BY = 'BLOCKED_BY',
  RELATES_TO = 'RELATES_TO',
  DUPLICATES = 'DUPLICATES',
}

export enum ActivityAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  MOVED = 'MOVED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  COMMENTED = 'COMMENTED',
  ASSIGNED = 'ASSIGNED',
  LABEL_ADDED = 'LABEL_ADDED',
  LABEL_REMOVED = 'LABEL_REMOVED',
}

export enum NotificationType {
  CARD_ASSIGNED = 'CARD_ASSIGNED',
  CARD_COMMENTED = 'CARD_COMMENTED',
  CARD_DUE_SOON = 'CARD_DUE_SOON',
  CARD_MOVED = 'CARD_MOVED',
  MEMBER_ADDED = 'MEMBER_ADDED',
}

// --- Auth Interfaces ---

export interface JwtPayload {
  sub: string;
  email: string;
  isAdmin?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

// --- Entity Interfaces ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
}

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  position: number;
  createdById: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: Role;
  joinedAt: Date;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  columnType: ColumnType;
  position: number;
  wipLimit: number | null;
  color: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Swimlane {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string | null;
  isDefault: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  swimlaneId: string | null;
  cardNumber: number;
  title: string;
  description: string | null;
  priority: Priority;
  position: number;
  coverColor: string | null;
  coverImageUrl: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdById: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardAssignee {
  id: string;
  cardId: string;
  userId: string;
  assignedAt: Date;
}

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CardLabel {
  id: string;
  cardId: string;
  labelId: string;
  assignedAt: Date;
}

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  cardId: string;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface Checklist {
  id: string;
  cardId: string;
  title: string;
  position: number;
  createdAt: Date;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  isChecked: boolean;
  position: number;
  createdAt: Date;
}

export interface CardTag {
  id: string;
  cardId: string;
  tag: string;
}

export interface CardLink {
  id: string;
  sourceCardId: string;
  targetCardId: string;
  linkType: LinkType;
  createdAt: Date;
}

export interface Activity {
  id: string;
  boardId: string;
  cardId: string | null;
  userId: string;
  action: ActivityAction;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  trigger: Record<string, unknown>;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  isEnabled: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}
