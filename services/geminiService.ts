
import { GoogleGenAI, Type } from "@google/genai";
import { SpecificationResponse, Message, Attachment, TaskExtractionResponse, Task, Milestone } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Correctly initialize GoogleGenAI using the named parameter 'apiKey' and the 'process.env.API_KEY' string directly.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateSpec(
    userInput: string,
    history: Message[],
    currentFunctional: string,
    currentTechnical: string,
    currentImplementationPlan: string,
    attachment?: Attachment
  ): Promise<SpecificationResponse> {
    const model = 'gemini-3-pro-preview';

    const prompt = `
      User Input: "${userInput}"

      --- CURRENT PROJECT STATE ---
      Functional Spec Content:
      ${currentFunctional || "[Empty - New Project]"}

      Technical Spec Content:
      ${currentTechnical || "[Empty - New Project]"}

      Implementation Plan Content:
      ${currentImplementationPlan || "[Empty - New Project]"}

      --- YOUR TASK ---
      1. Analyze the user input (and any attached files/images).
      2. If an attachment is provided, analyze it thoroughly (it might be a UI mockup, a legacy document, or a schema diagram).
      3. If the request is a new project or a major feature, act as a consultant and ask clarifying questions.
      4. Update the 'functional', 'technical', and 'implementationPlan' specifications ONLY with information that is confirmed or highly logical based on the provided data.
      5. The Implementation Plan should outline concrete steps, tasks, dependencies, and milestones for executing the project.
      6. Maintain the professional tone of a Senior Architect.
    `;

    try {
      // Prepare parts for the current message
      const currentParts: any[] = [{ text: prompt }];
      if (attachment) {
        currentParts.push({
          inlineData: {
            data: attachment.data,
            mimeType: attachment.mimeType
          }
        });
      }

      // Inject current date/time into system instruction
      const currentDate = new Date();
      const dateContext = `
CURRENT DATE/TIME CONTEXT:
- Today's Date: ${currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Current Year: ${currentDate.getFullYear()}
- Current Quarter: Q${Math.ceil((currentDate.getMonth() + 1) / 3)}
- When creating Gantt charts or timelines, use dates starting from ${currentDate.toISOString().split('T')[0]} or later.
- All project planning should assume work begins from the current date.
`;
      const systemInstructionWithDate = SYSTEM_INSTRUCTION + dateContext;

      const response = await this.ai.models.generateContent({
        model,
        contents: [
          ...history.map(h => ({
            role: h.role === 'user' ? ('user' as const) : ('model' as const),
            parts: h.attachment
              ? [{ text: h.content }, { inlineData: { data: h.attachment.data, mimeType: h.attachment.mimeType } }]
              : [{ text: h.content }]
          })),
          { role: 'user', parts: currentParts }
        ],
        config: {
          systemInstruction: systemInstructionWithDate,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projectName: { type: Type.STRING, description: 'The name of the project' },
              functional: { type: Type.STRING, description: 'Current state of the Functional Specification' },
              technical: { type: Type.STRING, description: 'Current state of the Technical Specification' },
              implementationPlan: { type: Type.STRING, description: 'Current state of the Implementation Plan with steps, tasks, and milestones' },
              chatResponse: { type: Type.STRING, description: 'Your conversational response, including any clarifying questions' }
            },
            required: ["projectName", "functional", "technical", "implementationPlan", "chatResponse"]
          }
        }
      });

      // Extract text output directly from the .text property of GenerateContentResponse.
      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate response.");
    }
  }

  async extractTasks(
    implementationPlan: string,
    projectName: string,
    existingTasks: Task[],
    existingMilestones: Milestone[]
  ): Promise<TaskExtractionResponse> {
    const model = 'gemini-3-pro-preview';

    const currentDate = new Date();
    const todayISO = currentDate.toISOString().split('T')[0];

    const prompt = `
You are an expert project manager. Analyze the following Implementation Plan and extract structured, actionable tasks.

--- PROJECT NAME ---
${projectName}

--- IMPLEMENTATION PLAN ---
${implementationPlan}

--- EXISTING TASKS (avoid duplicates) ---
${existingTasks.length > 0 ? existingTasks.map(t => `- [${t.status}] ${t.title}`).join('\n') : 'None - this is a fresh extraction'}

--- EXISTING MILESTONES ---
${existingMilestones.length > 0 ? existingMilestones.map(m => `- ${m.name}`).join('\n') : 'None'}

--- CURRENT DATE ---
${todayISO}

--- YOUR TASK ---
1. Parse the implementation plan and identify discrete, actionable tasks
2. Group tasks under logical milestones (phases, sprints, or modules mentioned in the plan)
3. Identify dependencies between tasks (which must be done before which) - use task titles for reference
4. Estimate hours based on typical software development effort (be realistic, add 20% buffer)
5. Assign priority based on criticality and whether it's on the critical path:
   - "high": Critical path items, blockers, core functionality
   - "medium": Important features, secondary functionality
   - "low": Nice-to-haves, polish, documentation
6. Avoid creating tasks that duplicate existing ones
7. Keep task titles concise but descriptive (max 80 chars, start with action verb)
8. Descriptions should include:
   - What needs to be done
   - Acceptance criteria where applicable
   - Technical considerations if relevant

GUIDELINES:
- Break down large tasks into smaller ones (ideally 2-8 hours each)
- Tasks should be assignable to a single person
- If the plan mentions phases or sprints, create corresponding milestones
- Order tasks logically within each milestone
- Provide a helpful summary in chatResponse explaining what was extracted
`;

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'You are a project management assistant that converts implementation plans into structured, actionable tasks. Always return valid JSON matching the schema.',
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                description: 'List of extracted tasks',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Concise action-oriented title (e.g., "Implement user authentication")' },
                    description: { type: Type.STRING, description: 'Detailed description with acceptance criteria' },
                    priority: { type: Type.STRING, description: 'Priority level: high, medium, or low' },
                    estimatedHours: { type: Type.NUMBER, description: 'Estimated hours to complete (null if unknown)', nullable: true },
                    dependsOn: {
                      type: Type.ARRAY,
                      description: 'Titles of tasks that must be completed first',
                      items: { type: Type.STRING }
                    },
                    milestoneName: { type: Type.STRING, description: 'Name of the milestone this task belongs to (null if none)', nullable: true },
                    suggestedOrder: { type: Type.NUMBER, description: 'Suggested order within the milestone (1, 2, 3...)' }
                  },
                  required: ["title", "description", "priority", "suggestedOrder", "dependsOn"]
                }
              },
              milestones: {
                type: Type.ARRAY,
                description: 'List of milestones/phases extracted from the plan',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Milestone name (e.g., "Phase 1: Foundation")' },
                    description: { type: Type.STRING, description: 'Brief description of the milestone goals' },
                    suggestedOrder: { type: Type.NUMBER, description: 'Order of the milestone (1, 2, 3...)' }
                  },
                  required: ["name", "description", "suggestedOrder"]
                }
              },
              chatResponse: {
                type: Type.STRING,
                description: 'Summary of what was extracted, including task count, milestone count, and any observations'
              }
            },
            required: ["tasks", "milestones", "chatResponse"]
          }
        }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      // Ensure arrays exist even if empty
      return {
        tasks: parsed.tasks || [],
        milestones: parsed.milestones || [],
        chatResponse: parsed.chatResponse || 'Tasks extracted successfully.'
      };
    } catch (error) {
      console.error("Gemini Task Extraction Error:", error);
      throw new Error("Failed to extract tasks from implementation plan.");
    }
  }
}
