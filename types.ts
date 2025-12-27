
export interface Attachment {
  data: string; // base64
  mimeType: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: Attachment;
  displayName?: string | null;
  photoURL?: string | null;
  timestamp?: number;
}

export interface SpecificationResponse {
  projectName: string;
  functional: string;
  technical: string;
  implementationPlan: string;
  chatResponse: string;
}

// Project Management Types
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type AppMode = 'specs' | 'project';

// Team member stored in Firestore users collection
export interface TeamMember {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastSignIn: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  assigneeNames: string[];
  assigneeAvatars: (string | null)[];
  estimatedHours: number | null;
  loggedHours: number;
  dueDate: number | null;
  startDate: number | null;
  completedAt: number | null;
  dependsOn: string[]; // task IDs that must be done first
  milestoneId: string | null;
  orderIndex: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  targetDate: number | null;
  completedAt: number | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  hours: number;
  description: string;
  loggedAt: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: number;
  updatedAt: number | null;
}

// AI Task Extraction Response
export interface ExtractedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedHours: number | null;
  dependsOn: string[]; // titles of other tasks
  milestoneName: string | null;
  suggestedOrder: number;
}

export interface ExtractedMilestone {
  name: string;
  description: string;
  suggestedOrder: number;
}

export interface TaskExtractionResponse {
  tasks: ExtractedTask[];
  milestones: ExtractedMilestone[];
  chatResponse: string;
}

export interface SavedProject {
  id: string;
  projectName: string;
  functional: string;
  technical: string;
  implementationPlan: string;
  messages: Message[];
  updatedAt: number;
  lastEditedBy?: string;
  lastEditedAvatar?: string | null;
  ownerId?: string;
  ownerName?: string | null;
  ownerAvatar?: string | null;
  lockedBy: string | null;
  lockedByName: string | null;
  lockedByAvatar: string | null;
  lockedAt: number | null;
  lastActivityAt: number | null;
  // Project management data (optional for backwards compatibility)
  tasks?: Task[];
  milestones?: Milestone[];
  timeEntries?: TimeEntry[];
  comments?: TaskComment[];
  lastTaskExtraction?: number | null;
}

export enum TabType {
  FUNCTIONAL = 'FUNCTIONAL',
  TECHNICAL = 'TECHNICAL',
  IMPLEMENTATION_PLAN = 'IMPLEMENTATION_PLAN'
}
