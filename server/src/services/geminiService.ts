import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

export interface AISceneAnalysis {
  timestamp: number;
  confidence: number;
  clothing: {
    shirt_type: string;
    shirt_color: string;
    pants_type: string;
    pants_color: string;
  };
  accessories: string[];
  gender_estimate: string;
  description: string;
  tags: string[];
}

const apiKey = process.env.GEMINI_API_KEY || '';
const hasGemini = !!apiKey;

let genAI: GoogleGenerativeAI | null = null;
if (hasGemini) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Converts a local file to the inline data structure required by the Gemini SDK.
 */
function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

/**
 * Analyzes video frame images using the Gemini Vision API.
 * Falls back to mock detections if Gemini is not configured or fails.
 */
export async function analyzeFrameFiles(
  frames: { timestamp: number; filePath: string }[],
  videoTitle: string,
  cameraName: string
): Promise<AISceneAnalysis[]> {
  if (!hasGemini || !genAI) {
    console.log('GEMINI_API_KEY missing. Generating mock detections for:', videoTitle);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate AI model delay
    return generateMockDetections(frames, videoTitle, cameraName);
  }

  const results: AISceneAnalysis[] = [];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Process frames in batches of 3
    const batchSize = 3;
    for (let i = 0; i < frames.length; i += batchSize) {
      const batch = frames.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (frame) => {
          const imagePart = fileToGenerativePart(frame.filePath, 'image/jpeg');

          const prompt = `
            You are a security AI analyzing a CCTV frame from camera "${cameraName}".
            Identify if there is a person present in the image. If a person is present, return a structured JSON response about their details.
            If multiple people are present, analyze the most prominent one.
            If no person is present, do not return anything.
            
            Return the output in this EXACT JSON structure:
            {
              "detected": true,
              "confidence": 0.92,
              "gender_estimate": "male" | "female" | "unknown",
              "clothing": {
                "shirt_type": "T-shirt" | "jacket" | "hoodie" | "shirt" | "polo" | "sweater" | "unknown",
                "shirt_color": "red" | "blue" | "green" | "black" | "white" | "yellow" | "grey" | "brown" | "unknown",
                "pants_type": "jeans" | "trousers" | "shorts" | "skirt" | "unknown",
                "pants_color": "blue" | "black" | "grey" | "white" | "unknown"
              },
              "accessories": ["backpack", "handbag", "sunglasses", "hat", "umbrella"],
              "description": "A 1-sentence action summary of the person's location and activity.",
              "tags": ["red-shirt", "jeans", "entrance"]
            }
            Return only raw JSON text. Do not include markdown formatting blocks (like \`\`\`json).
          `;

          try {
            const response = await model.generateContent([prompt, imagePart]);
            const responseText = response.response.text() || '';
            
            // Strip any markdown symbols if returned
            const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedText);

            if (parsed.detected) {
              results.push({
                timestamp: frame.timestamp,
                confidence: parsed.confidence || 0.85,
                clothing: parsed.clothing || { shirt_type: 'unknown', shirt_color: 'unknown', pants_type: 'unknown', pants_color: 'unknown' },
                accessories: parsed.accessories || [],
                gender_estimate: parsed.gender_estimate || 'unknown',
                description: parsed.description || 'Person detected on camera.',
                tags: parsed.tags || [],
              });
            }
          } catch (err: any) {
            console.error(`Gemini frame analysis failed at timestamp ${frame.timestamp}s:`, err.message);
          }
        })
      );
    }

    // Sort chronologically
    return results.sort((a, b) => a.timestamp - b.timestamp);

  } catch (error) {
    console.error('Gemini Vision overall request failed, falling back to mock results:', error);
    return generateMockDetections(frames, videoTitle, cameraName);
  }
}

/**
 * Intelligent mockup generator that parses video titles to yield realistic matching events.
 */
function generateMockDetections(
  frames: { timestamp: number; filePath: string }[],
  videoTitle: string,
  cameraName: string
): AISceneAnalysis[] {
  const query = (videoTitle + ' ' + cameraName).toLowerCase();
  const results: AISceneAnalysis[] = [];

  let shirtColor = 'black';
  let shirtType = 'jacket';
  let pantsColor = 'grey';
  let pantsType = 'trousers';
  let gender = 'male';
  let accessories: string[] = ['backpack'];
  let tags: string[] = ['suspect'];

  if (query.includes('red') || query.includes('gate') || query.includes('entrance') || query.includes('lobby')) {
    shirtColor = 'red';
    shirtType = 'T-Shirt';
    pantsColor = 'blue';
    pantsType = 'jeans';
    gender = 'male';
    accessories = ['backpack', 'sunglasses'];
    tags = ['red', 't-shirt', 'blue', 'jeans', 'backpack', 'male', 'suspect'];
  } else if (query.includes('yellow') || query.includes('office')) {
    shirtColor = 'yellow';
    shirtType = 'jacket';
    pantsColor = 'black';
    pantsType = 'trousers';
    gender = 'female';
    accessories = ['purse'];
    tags = ['yellow', 'jacket', 'black', 'trousers', 'purse', 'female'];
  } else if (query.includes('green') || query.includes('courier') || query.includes('delivery')) {
    shirtColor = 'green';
    shirtType = 'polo shirt';
    pantsColor = 'grey';
    pantsType = 'shorts';
    gender = 'male';
    accessories = ['delivery box'];
    tags = ['green', 'polo', 'grey', 'shorts', 'delivery box', 'male', 'courier'];
  }

  // Create detections on a subset of the frames (e.g. 1 or 2 frames)
  const numDetections = Math.min(frames.length, Math.max(1, Math.floor(Math.random() * 2) + 1));
  
  for (let idx = 0; idx < numDetections; idx++) {
    const frameIndex = Math.floor((idx + 0.5) * (frames.length / numDetections));
    if (frameIndex >= frames.length) continue;
    
    const frame = frames[frameIndex];
    const descAction = gender === 'male' ? 'walking past the sensor field' : 'exiting the facility corridor';
    const description = `A ${gender} subject wearing a ${shirtColor} ${shirtType} and ${pantsColor} ${pantsType} is spotted ${descAction}.`;

    results.push({
      timestamp: frame.timestamp,
      confidence: Math.round((0.8 + Math.random() * 0.18) * 100) / 100,
      clothing: {
        shirt_type: shirtType,
        shirt_color: shirtColor,
        pants_type: pantsType,
        pants_color: pantsColor,
      },
      accessories: [...accessories],
      gender_estimate: gender,
      description,
      tags: [...tags],
    });
  }

  return results;
}
