import { z } from 'zod';

// ============================================================
// KanFlow Shared Validation Schemas (Zod)
// ============================================================

// --- Auth ---

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// --- Workspace ---

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

// --- Board ---

export const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
});

export const updateBoardSchema = createBoardSchema.partial();

// --- Column ---

export const createColumnSchema = z.object({
  title: z.string().min(1).max(100),
  columnType: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CUSTOM']).default('CUSTOM'),
  wipLimit: z.number().int().positive().optional(),
  color: z.string().max(7).optional(),
});

export const updateColumnSchema = createColumnSchema.partial();

// --- Card ---

export const createCardSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  columnId: z.string().uuid(),
  swimlaneId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive().optional(),
});

export const updateCardSchema = createCardSchema.partial();

// --- Swimlane ---

export const createSwimlaneSchema = z.object({
  title: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});

export const updateSwimlaneSchema = createSwimlaneSchema.partial();

// --- Comment ---

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const updateCommentSchema = createCommentSchema;

// --- Label ---

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(7),
});

export const updateLabelSchema = createLabelSchema.partial();

// --- Checklist ---

export const createChecklistSchema = z.object({
  title: z.string().min(1).max(200),
});

export const createChecklistItemSchema = z.object({
  title: z.string().min(1).max(500),
});

// --- Position Update (Drag & Drop) ---

export const updatePositionSchema = z.object({
  position: z.number().positive(),
});
