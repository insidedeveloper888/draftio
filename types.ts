
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
}

export interface SpecificationResponse {
  projectName: string;
  functional: string;
  technical: string;
  implementationPlan: string;
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
  lockedBy: string | null;
  lockedByName: string | null;
  lockedByAvatar: string | null;
  lockedAt: number | null;
  lastActivityAt: number | null;
}

export enum TabType {
  FUNCTIONAL = 'FUNCTIONAL',
  TECHNICAL = 'TECHNICAL',
  IMPLEMENTATION_PLAN = 'IMPLEMENTATION_PLAN'
}
