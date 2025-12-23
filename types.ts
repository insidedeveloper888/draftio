
export interface Attachment {
  data: string; // base64
  mimeType: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: Attachment;
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
}

export enum TabType {
  FUNCTIONAL = 'FUNCTIONAL',
  TECHNICAL = 'TECHNICAL',
  IMPLEMENTATION_PLAN = 'IMPLEMENTATION_PLAN'
}
