import { pipeline } from '@xenova/transformers';
import { buildGameSearchString, type GameVectorSource } from '../utils/gameVector.js';

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline>>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  return extractorPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data, (value) => Number(value));
}

export async function generateGameEmbedding(game: GameVectorSource): Promise<number[]> {
  return generateEmbedding(buildGameSearchString(game));
}
