
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { VideoIdea, Scene, ScriptResponse, ScriptSection, ScriptType } from "../types";

const TEXT_MODEL = "gemini-3-flash-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const SPEECH_MODEL = "gemini-2.5-flash-preview-tts";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || JSON.stringify(error);
      
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        if (errorMsg.includes("limit: 0") || errorMsg.includes("per_day") || errorMsg.includes("Quota exceeded")) {
          const customError = new Error("API 할당량을 모두 소진했습니다. 자신의 API 키를 사용하거나 잠시 후 다시 시도해주세요.");
          (customError as any).isQuotaError = true;
          throw customError;
        }
        await sleep(Math.pow(2, i) * 1000 + Math.random() * 500);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const pcmToWav = (base64Pcm: string, sampleRate: number = 24000): string => {
  if (!base64Pcm) return "";
  try {
    const cleanBase64 = base64Pcm.replace(/\s/g, '');
    const binaryString = atob(cleanBase64);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) pcmData[i] = binaryString.charCodeAt(i);

    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);

    new Uint8Array(buffer, 44).set(pcmData);
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  } catch (e) {
    console.error("WAV conversion error:", e);
    return "";
  }
};

export const generateVideoIdeas = async (keyword?: string): Promise<VideoIdea[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `당신은 한국 YouTube 금융/재테크 채널의 바이럴 제목 전문가입니다.
아래 규칙을 따라 "${keyword || '금융 교육, 재테크'}" 주제로 클릭을 유도하는 한국어 제목 아이디어 5개를 만드세요.

【핵심 공식】: [충격 요소] + [구체적 숫자] + [타겟층] + [긴급성/비밀성]
【한국어 특화 규칙】: 
- 존댓말 사용, 숫자는 '만원/억' 단위로(예: 847만원), 25자 내외 간결함 유지.
- 10가지 패턴(금액 행동 결과, 상황은 왜 충격적 사실일까, 나이/상황 해결책, 숫자가지 주제 비밀, 주제의 진실, 내가 금액 모은 방법 등) 적극 활용.
- 감정 키워드(함정, 손해, 비밀, 즉시, 실제) 포함.

【결과물 요구사항】:
각 아이디어의 'premise' 필드에는 해당 제목에 사용된 [패턴 번호]와 [추천 이유]를 간략히 포함할 것.
마지막 아이디어는 반드시 가장 추천하는 '베스트 아이디어'로 선정하여 이유를 상세히 적을 것.

출력 형식: 반드시 JSON 배열 [{title, premise}]만 출력.`;

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              premise: { type: Type.STRING }
            },
            required: ["title", "premise"]
          }
        }
      }
    }));
    
    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) 
      ? parsed.map((item: any, i: number) => ({ id: `idea-${i}-${Date.now()}`, ...item })) 
      : [];
  } catch (e) {
    console.error("Video Ideas Error:", e);
    throw e;
  }
};

export const generateScript = async (title: string, protagonistName: string, type: ScriptType): Promise<ScriptResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isShorts = type === 'shorts';
  
  const prompt = `
    [영상 주제]: ‘${title}’
    [주인공 이름]: ${protagonistName}
    [영상 유형]: ${isShorts ? '숏폼 (1000자~1200자 엄수)' : '롱폼 (5000자 내외의 상세한 대본)'}
    
    [필수 구조 (닉의 검증된 대본 구조)]:
    1. 오프닝 훅: 시청자가 ‘이거 내 얘긴데?’라고 공감할 만한 구체적인 상황으로 시작.
    2. 도입부 필구 문구: “내 이름은 ${protagonistName}이야. 난 [관련 금융 주제]에 대해서 진짜 미친 듯이 고민하거든. 만약 네가 [시청자의 고민 묘사] 때문에 힘들다면, 구독 버튼 누르고 이 영상이 도움 되면 좋아요도 꼭 눌러줘.” (이 문구는 반드시 포함)
    3. 기존 상식 파괴: 사람들이 흔히 믿는 잘못된 금융 상식을 날카로운 독설로 반박.
    4. 통계 및 수치: 신뢰할 수 있는 출처의 놀라운 통계와 실제 금액 계산 예시 포함.
    5. 심리 분석: 왜 사람들이 그런 경제적 결정을 내리는지 심리학적으로 설명.
    6. 예상 반박 대응: "지금 이런 생각 들지?"라며 시청자의 의구심에 미리 답변.
    7. 비유를 통한 핵심 설명: 어려운 개념을 일상적인 사물에 빗대어 설명.
    8. 통찰력 강화: 후반부로 갈수록 "사람들이 진짜 모르는 게 뭐냐면..." 같은 표현을 사용해 놀라운 인사이트 제공.
    9. 스토리텔링: 핵심 포인트를 이야기 형식으로 풀기.
    10. 결론 및 행동 촉구: 강력한 동기부여와 함께 구독/좋아요 유도.

    [스타일 가이드]:
    - 말투: 권위 있지만 친근하게(친구랑 말하듯이). '사실 말이야...', '자 봐봐', '음...' 같은 추임새 활용.
    - 태도: 사람들의 실수에 답답해하면서도 진심으로 걱정해주는 독설가 치비 캐릭터.
    - ${isShorts ? '[제한]: 공백 포함 1000자~1200자 사이를 절대 유지할 것 (1200자 초과 금지).' : '[강조]: 5000자 정도의 풍성한 분량을 위해 아주 구체적인 사례와 수학적 계산 과정을 모두 서술할 것.'}
    - 마크다운 기호 사용 금지. 대화체 위주.

    JSON 구조: {title, sections: [{id, title, content}]}
  `;

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["id", "title", "content"]
              }
            }
          },
          required: ["title", "sections"]
        }
      }
    }));
    
    const text = response.text;
    if (!text) throw new Error("API 응답이 비어있습니다.");
    
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e) {
    console.error("Generate Script Error:", e);
    throw e;
  }
};

export const extractScenesFromScript = async (script: string, protagonistDesc: string, isShorts: boolean): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `아래 대본을 ${isShorts ? '10~12개' : '35~50개'} 장면으로 나누어 비주얼 스토리보드를 구성하라.
    
    [CRITICAL: 대본 보존 규칙]
    - 제공된 대본의 모든 문장을 순서대로 각 장면의 'description' 필드에 완벽하게 분배하라.
    - TTS 변환을 위해 원본 대본과 100% 일치해야 한다.

    [이미지 생성 지침]
    - 스타일: High-quality Chibi character design, cute vector art, big expressive eyes, thick black outlines, bold colors.
    - 캐릭터: ${protagonistDesc}. 항상 머리부터 발끝까지 보이는 '전신 샷(Full Body)'으로 구성.
    - 표정: 상황에 맞춰 코믹하게 과장.
    
    JSON 형식: [{id, description, imagePrompt, videoPrompt}]
    대본 내용: ${script}`;

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              description: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              videoPrompt: { type: Type.STRING }
            },
            required: ["id", "description", "imagePrompt", "videoPrompt"]
          }
        }
      }
    }));
    
    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Extract Scenes Error:", e);
    throw e;
  }
};

export const generateImage = async (prompt: string, aspectRatio: string = "16:9", protagonistDesc: string = "", referenceImageBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const primaryStyle = "High-quality Chibi character design, cute vector art, 2.5 heads tall ratio, big expressive eyes, thick black outlines, flat cartoon colors";
  const fallbackStyle = "Simplified 2D cartoon illustration, clean lines, basic shapes, bright colors, minimalist character art";

  const buildPrompt = (style: string, p: string, desc: string) => `
    [STYLE: ${style}]
    [FRAME: FULL BODY SHOT, head to toe visible, no cropping, centered composition]
    [CHARACTER: ${desc}]
    [SCENE: ${p}]
    [BACKGROUND: Simple minimal light solid color background]
    [TECHNICAL: High resolution, sharp lines, no text, no captions]
  `;

  const attemptGeneration = async (currentStyle: string, isFallback = false) => {
    const styledPrompt = buildPrompt(currentStyle, prompt, protagonistDesc);
    const parts: any[] = [];
    if (referenceImageBase64) {
      try {
        const data = referenceImageBase64.includes('base64,') ? referenceImageBase64.split(',')[1] : referenceImageBase64;
        parts.push({ inlineData: { mimeType: 'image/png', data } });
      } catch (e) { console.warn("Reference image processing failed."); }
    }
    parts.push({ text: styledPrompt });

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({ 
      model: IMAGE_MODEL, 
      contents: { parts }, 
      config: { imageConfig: { aspectRatio: aspectRatio as any } } 
    }));
    
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const respParts = candidates[0].content?.parts || [];
      const imagePart = respParts.find(p => p.inlineData);
      if (imagePart?.inlineData?.data) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }
    }
    return null;
  };

  try {
    let result = await attemptGeneration(primaryStyle);
    if (!result) result = await attemptGeneration(fallbackStyle, true);
    if (!result) throw new Error("이미지 생성 결과가 없습니다.");
    return result;
  } catch (e: any) {
    console.error("Generate Image Exception:", e);
    throw e;
  }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  if (!text || !text.trim()) return "";
  
  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: SPEECH_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    }));

    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      const audioPart = parts.find(p => p.inlineData);
      if (audioPart?.inlineData?.data) {
        return pcmToWav(audioPart.inlineData.data);
      }
    }
    throw new Error("오디오 생성 결과가 없습니다.");
  } catch (e: any) {
    console.error("Generate Speech Error:", e);
    throw e;
  }
};
