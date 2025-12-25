
import { GoogleGenAI, Type } from "@google/genai";
import { SpecificationResponse, Message, Attachment } from "../types";
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
}
