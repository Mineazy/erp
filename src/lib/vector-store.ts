import fs from 'fs/promises';
import path from 'path';
import { embed } from 'ai';
import { google } from '@ai-sdk/google';

const VECTOR_STORE_PATH = path.join(process.cwd(), 'data', 'vector-store.json');

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  metadata?: any;
}

// Simple cosine similarity
function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class LocalVectorStore {
  private chunks: DocumentChunk[] = [];
  private initialized = false;

  private async init() {
    if (this.initialized) return;
    try {
      await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
      const data = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
      this.chunks = JSON.parse(data);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error('Failed to load vector store:', e);
      }
      this.chunks = [];
    }
    this.initialized = true;
  }

  private async save() {
    await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
    await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(this.chunks));
  }

  async addDocuments(documentId: string, texts: string[], metadata?: any) {
    await this.init();
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      // Generate embedding using Gemini
      const { embedding } = await embed({
        model: google.textEmbeddingModel('text-embedding-004'),
        value: text,
      });

      this.chunks.push({
        id: `${documentId}-chunk-${i}`,
        documentId,
        text,
        embedding,
        metadata
      });
    }

    await this.save();
  }

  async removeDocument(documentId: string) {
    await this.init();
    this.chunks = this.chunks.filter(c => c.documentId !== documentId);
    await this.save();
  }

  async search(query: string, topK: number = 3) {
    await this.init();
    if (this.chunks.length === 0) return [];

    const { embedding: queryEmbedding } = await embed({
      model: google.textEmbeddingModel('text-embedding-004'),
      value: query,
    });

    const scoredChunks = this.chunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    return scoredChunks.slice(0, topK).map(c => ({
      documentId: c.documentId,
      text: c.text,
      score: c.score,
      metadata: c.metadata
    }));
  }
}

export const vectorStore = new LocalVectorStore();
