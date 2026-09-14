-- RAG: course content chunks with embeddings stored as JSONB arrays.
-- pgvector is not available in the current Postgres image; cosine similarity
-- is computed in Node (fine for per-course chunk counts in the hundreds).
CREATE TABLE "rag_chunks" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "chunkIdx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "textAr" TEXT,
    "embedding" JSONB,
    "embeddingModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rag_chunks_courseId_idx" ON "rag_chunks"("courseId");
CREATE INDEX "rag_chunks_lessonId_idx" ON "rag_chunks"("lessonId");

ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
