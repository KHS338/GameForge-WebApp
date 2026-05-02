export type GameVectorSource = {
  title?: string;
  genre?: string;
  tags?: string[] | string | null;
  description?: string;
};

function normalizeTags(tags: GameVectorSource['tags']): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildGameSearchString(game: GameVectorSource): string {
  const tags = normalizeTags(game.tags);

  return `Game Title: ${game.title?.trim() || 'Unknown'}. Genre: ${game.genre?.trim() || 'Unknown'}. Tags: ${tags.length > 0 ? tags.join(', ') : 'None'}. Overview: ${game.description?.trim() || 'No description provided'}.`;
}

export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimension = vectors[0].length;
  const totals = new Array<number>(dimension).fill(0);

  for (const vector of vectors) {
    for (let index = 0; index < dimension; index += 1) {
      totals[index] += vector[index] ?? 0;
    }
  }

  return totals.map((value) => value / vectors.length);
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}
