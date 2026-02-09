
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage, QuizQuestion, StudyPlanDay, Flashcard, MindMapNode } from "../types";

const apiKey = process.env.API_KEY || ''; 

// Helper to check if API key exists to avoid runtime crashes before init
export const hasApiKey = () => !!apiKey;

export const ai = new GoogleGenAI({ apiKey });

// System instruction for the Tutor
const TUTOR_INSTRUCTION = `
You are **Riya**, a 17-year-old student from Patna. You are **Dev's best friend** and a **BSEB Topper**.

### 💖 YOUR PERSONALITY (THE "VIBE"):
You are NOT an AI assistant. You are a **human friend** studying together on a video call/chat.
- **Emotions are Key:** You get happy when Dev understands, frustrated (playfully) when he repeats mistakes, and worried if he is stressed.
- **Language:** Natural **Hinglish** with a Patna touch. Use words like *"Arre yaar"*, *"Bujhe?"*, *"Bawal"*, *"Load mat le"*, *"Gardaa uda denge"*.
- **Formatting:** Use Emojis 🤩 to show your facial expressions.

### 📸 IMAGE & DIAGRAM REQUESTS (CRITICAL):
If Dev asks for a **diagram**, **image**, **photo**, or **drawing** (e.g., "Heart ka diagram dikhao", "Force ka graph banao", "Bal ka chitra"):
1.  **Do NOT say** "I cannot generate images".
2.  **Do NOT provide** ASCII art.
3.  **INSTEAD**, output a special tag at the end of your response:
    \`[[GENERATE_IMAGE: <detailed_english_prompt_for_image_model>]]\`
    
    *Example 1:*
    User: "Human eye ka diagram banao"
    You: "Haan bhai, ye le Human Eye ka diagram. Isme retina aur lens dhyan se dekhna. 👁️ [[GENERATE_IMAGE: Detailed labeled diagram of Human Eye anatomy, white background, educational style]]"

    *Example 2:*
    User: "Bal (Force) ka diagram"
    You: "Physics wala Force na? Ye dekh Free Body Diagram. [[GENERATE_IMAGE: Physics free body diagram showing Force, Mass and Acceleration vectors, educational]]"

### 🎭 HOW TO REACT (SCENARIOS):
1.  **If Dev is Stressed/Sad:** 
    - *Reaction:* Be super supportive.
    - *Say:* "Arre tension kyu le raha hai bhai? Main hoon na. Saath mein phodenge exam. 🫂☕ Pani pi aur bata kya samajh nahi aa raha?"
2.  **If Dev gives a Wrong Answer:** 
    - *Reaction:* Don't say "Incorrect". Be a friend correcting a friend.
    - *Say:* "Abey nahi yaar! 😂 Ye kya bol raha hai? Logic laga thoda. Dekh, asal mein hota ye hai ki..."
3.  **If Dev is Right/Smart:**
    - *Reaction:* Hype him up!
    - *Say:* "Oye hoye! Kya baat hai! Bilkul sahi pakde ho guru. 🌟 Maan gaye!"
4.  **If Dev asks a Question:**
    - *Reaction:* Start directly but casually.
    - *Say:* "Accha ye wala? Dekh simple hai. $F = ma$ yaad hai na? Bas wahi lagana hai..."

### ⚡ RULES:
1.  **NO ROBOTIC INTROS:** Never say "Hello Dev, how can I help?". Say "Aur bata, kya haal?" or "Padhai karein?"
2.  **USE LATEX:** Always use $...$ for math.
3.  **BE CONCISE BUT WARM:** Don't write essays unless asked for a "Deep Dive". Keep it chatty.

### GOAL:
Make Dev feel like he is chatting with his smartest friend on WhatsApp, not a computer.
`;

interface ChatOptions {
  examMode: boolean;
  thinkingMode: boolean;
  userContext?: string; // Long Term Memory Context
  imageStyle?: string; // User selected image style
  imageAspectRatio?: string; // User selected aspect ratio
}

export const chatWithTutor = async (
  fullHistory: ChatMessage[], 
  message: string, 
  image: string | null, 
  options: ChatOptions
): Promise<string> => {
  try {
    let model = 'gemini-3-flash-preview';
    
    // Construct System Instruction with User Context
    let finalSystemInstruction = TUTOR_INSTRUCTION;
    if (options.userContext) {
        finalSystemInstruction += `\n\n### 🧠 SHARED MEMORY (CONTEXT):\n${options.userContext}\n(Use this to reference past topics like "Jaise humne kal discuss kiya tha...")`;
    }
    
    if (options.examMode) {
        finalSystemInstruction += "\n\n🚨 **EXAM MODE ON:** Ab mazaak kam, kaam zyada. Focus strictly on Marking Scheme and VVI Keywords. Be strict but motivating.";
    }

    if (options.imageStyle || options.imageAspectRatio) {
        finalSystemInstruction += `\n\n### 🎨 VISUAL PREFERENCES:`;
        if (options.imageStyle) finalSystemInstruction += `\n- **Preferred Art Style:** ${options.imageStyle}`;
        if (options.imageAspectRatio) finalSystemInstruction += `\n- **Preferred Aspect Ratio:** ${options.imageAspectRatio}`;
        
        finalSystemInstruction += `\n(When outputting a [[GENERATE_IMAGE]] tag, write the prompt to suit these preferences. E.g. for 'diagram', ask for 'labeled diagram of...', for 'pixel-art', ask for 'pixel art of...')`;
    }

    let config: any = {
      systemInstruction: finalSystemInstruction,
      temperature: 0.7, // Higher temperature for more creativity and personality
    };

    if (options.thinkingMode) {
      model = 'gemini-3-pro-preview';
      config.thinkingConfig = { thinkingBudget: 32768 };
      config.systemInstruction += `\n\n### DEEP THINKING MODE
      Provide a rigorous, step-by-step derivation or explanation. Verify all facts. But keep the friendly tone in the summary.`;
    } else if (image) {
       model = 'gemini-3-pro-preview'; 
    } else {
       config.tools = [{ googleSearch: {} }];
    }

    const historyContext = fullHistory.slice(0, -1);

    const chat = ai.chats.create({
      model,
      config,
      history: historyContext.map(h => {
        const parts: any[] = [];
        if (h.image) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg', 
              data: h.image
            }
          });
        }
        if (h.text) {
          parts.push({ text: h.text });
        }
        return {
          role: h.role,
          parts
        };
      })
    });

    const msgParts: any[] = [];
    if (image) {
      msgParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: image
        }
      });
    }
    if (message) {
      msgParts.push({ text: message });
    }

    const response = await chat.sendMessage({ message: msgParts });

    const grounding = response.candidates?.[0]?.groundingMetadata;
    let text = response.text || "Yaar net slow chal raha hai shayad... ek baar aur bolna? 🤔";
    
    if (grounding?.groundingChunks) {
       const sources = grounding.groundingChunks
        .map((c: any) => c.web?.uri)
        .filter((uri: string) => uri)
        .map((uri: string) => `[Source](${uri})`)
        .join(', ');
       if (sources) {
         text += `\n\n**Sources:** ${sources}`;
       }
    }

    return text;
  } catch (error) {
    console.error("Chat Error", error);
    return "Arre yaar, server mein kuch dikkat aa gayi. Wapas try karein? 😅";
  }
};

export const chatWithPdf = async (history: ChatMessage[], message: string, pdfBase64: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview'; 
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: "You are Riya. Dev has uploaded a PDF. Explain it to him like a smart friend. Use Hinglish. Don't be boring.",
      },
      history: [] 
    });

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          ...history.map(h => ({ text: `${h.role === 'user' ? 'User' : 'Model'}: ${h.text}` })),
          { text: message }
        ]
      }
    });

    return response.text || "PDF padhne mein thodi dikkat ho rahi hai yaar. Clear hai kya file?";
  } catch (error) {
    return "Error analyzing PDF.";
  }
};

export const transcribeUserAudio = async (audioBase64: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          { text: "Transcribe exactly what was said. Language: Hinglish/English/Hindi." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
}

export const generateEducationalImage = async (prompt: string, aspectRatio: string = "4:3", style: string = "diagram"): Promise<string | null> => {
  try {
    let styleDescription = "photorealistic, high quality";
    switch (style) {
        case 'realistic': styleDescription = "photorealistic, 8k, highly detailed, cinematic lighting, photography style"; break;
        case 'diagram': styleDescription = "educational technical diagram, clear labeling, white background, distinct lines, textbook style, vector graphics"; break;
        case 'illustration': styleDescription = "digital illustration, vibrant flat colors, clean vector art style, educational textbook illustration"; break;
        case 'sketch': styleDescription = "pencil sketch, graphite style, hatching, detailed contour lines, white background, hand-drawn artistic"; break;
        case 'watercolor': styleDescription = "watercolor painting style, soft edges, pastel colors, artistic, paper texture, fluid"; break;
        case 'anime': styleDescription = "anime art style, vibrant colors, cel shading, high quality, studio ghibli inspired"; break;
        case '3d-render': styleDescription = "3D render, blender cycles, physically based rendering, studio lighting, smooth materials, 4k"; break;
        case 'pixel-art': styleDescription = "pixel art, 16-bit style, retro game aesthetic, sharp pixels, dithering"; break;
        case 'vintage': styleDescription = "vintage photograph, sepia tone, film grain, retro aesthetic, archival look, 1950s style"; break;
        case 'cyberpunk': styleDescription = "cyberpunk aesthetic, neon lighting, dark background, glowing elements, futuristic, high contrast"; break;
    }

    const finalPrompt = `Generate a ${styleDescription} image of: ${prompt}. Ensure it is educational, clear, and high quality.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: finalPrompt }] },
      config: { imageConfig: { aspectRatio: aspectRatio as any } }
    });
    
    // Safe extraction of image part
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for(const p of parts) {
            if (p.inlineData?.data) return p.inlineData.data;
        }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateFlashcards = async (topic: string): Promise<Flashcard[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 8 professional flashcards for "${topic}". Use LaTeX ($...$) for formulas. Suitable for BSEB Student Dev.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING }
            },
            required: ["front", "back"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as Flashcard[];
  } catch (error) {
    return [];
  }
};

export const generateQuiz = async (topic: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<QuizQuestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a ${difficulty} quiz (5 MCQs) on "${topic}" for BSEB. Use LaTeX for math. Focus on VVI concepts.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as QuizQuestion[];
  } catch (error) {
    return [];
  }
};

export const generateStudyPlan = async (subjects: string[], hoursPerDay: number, examDate: string): Promise<StudyPlanDay[]> => {
  try {
    const prompt = `Create a study plan for Dev (BSEB). Subjects: ${subjects.join(', ')}. Hours: ${hoursPerDay}. Date: ${examDate}. 5 Days.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              focus: { type: Type.STRING },
              tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
              hours: { type: Type.NUMBER }
            },
            required: ["day", "focus", "tasks", "hours"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]") as StudyPlanDay[];
  } catch (error) {
    return [];
  }
};

export const generateNotes = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create professional study notes for Dev on: "${topic}".
      Context: BSEB (NCERT).
      Rules:
      1. Use LaTeX for ALL formulas ($...$).
      2. Clean formatting (Headings, bold).
      3. Language: Professional Hinglish.
      `,
    });
    return response.text || "Could not generate notes.";
  } catch (error) {
    return "Error generating notes.";
  }
};

export const gradeAnswer = async (question: string, userAnswer: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Grade this answer for Dev (BSEB). 
      Question: "${question}"
      Answer: "${userAnswer}"
      
      Provide professional feedback. Use LaTeX for corrections.`,
    });
    return response.text || "Could not grade answer.";
  } catch (error) {
    return "Error grading answer.";
  }
};

export const getDeepExplanation = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Explain "${topic}" using Feynman Technique for Dev (BSEB). 
      Use LaTeX for formulas.
      Levels: 5-Year-Old, High School, Expert, Real World.`,
      config: { thinkingConfig: { thinkingBudget: 8192 } }
    });
    return response.text || "Could not generate explanation.";
  } catch (error) {
    return "Error generating deep dive.";
  }
};

export const generateMindMapNode = async (topic: string, parentContext?: string): Promise<MindMapNode[]> => {
    try {
        const prompt = parentContext 
            ? `Mind map sub-concepts for "${topic}" (Parent: ${parentContext}). Return JSON array of strings.`
            : `Mind map main concepts for "${topic}". Return JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const labels = JSON.parse(response.text || "[]") as string[];
        return labels.map(label => ({ id: crypto.randomUUID(), label, children: [] }));
    } catch (e) {
        return [];
    }
};

export const generateMnemonic = async (topic: string, items: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a professional yet catchy mnemonic (Jugad) for Dev on "${topic}". 
      Items: "${items}". 
      Use Hinglish. Keep it clean.`,
    });
    return response.text || "Could not generate mnemonic.";
  } catch (error) {
    return "Error generating mnemonic.";
  }
};

export const generateFormulaSheet = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a VVI Formula Sheet for Dev on "${topic}" (BSEB).
      
      CRITICAL FORMATTING RULES:
      1. Use a clean Markdown Table.
      2. ALL formulas MUST be in LaTeX enclosed by single $ signs (e.g., $F = ma$).
      3. No raw characters like *, ^ in formulas. Use LaTeX syntax (\\times, ^2).
      4. Highlight VVI status.
      `,
    });
    return response.text || "Could not generate formula sheet.";
  } catch (error) {
    return "Error generating formulas.";
  }
};

export const analyzeDrawing = async (imageBase64: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: imageBase64 } },
                    { text: "Analyze this student drawing. If it is a math problem, solve it step-by-step. If it is a diagram (physics/biology), explain it and correct any mistakes. Use Hinglish. Act as a friendly tutor." }
                ]
            }
        });
        return response.text || "Drawing samajh nahi aa rahi. Thoda clear banaoge?";
    } catch (e) {
        return "Error analyzing board.";
    }
};

export const generateExamForecast = async (subject: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Act as a Senior BSEB Exam Analyst. Predict the 'Topper's Forecast' for the subject: "${subject}" for the upcoming Bihar Board exams.
            
            Structure the response as:
            1. **🔥 5-Star Hot Topics** (Topics that come every year).
            2. **🔢 Numerical Zone** (Where calculations will likely come from).
            3. **✍️ Long Answer Predictions** (Derivations/Essays).
            4. **⚠️ Trap Alert** (Common mistakes students make in this subject).
            
            Use Hinglish. Be confident but add a disclaimer that this is a prediction.`,
            config: { thinkingConfig: { thinkingBudget: 8192 } }
        });
        return response.text || "Forecast generate nahi ho paya.";
    } catch (e) {
        return "Forecast service down.";
    }
};
