CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar TEXT,
    passwordHash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    tier TEXT NOT NULL DEFAULT 'free',
    isActive BOOLEAN NOT NULL DEFAULT true,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    videoId TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    uploader TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    thumbnail TEXT,
    url TEXT,
    detectedLang TEXT NOT NULL DEFAULT 'en',
    segmentsCount INTEGER NOT NULL DEFAULT 0,
    segments JSONB NOT NULL,
    userId TEXT REFERENCES users(id) ON DELETE SET NULL,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_userId ON videos(userId);

CREATE TABLE IF NOT EXISTS vocabulary_words (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    phonetic TEXT,
    contextSentence TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vocab_user_word ON vocabulary_words(userId, word);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'stripe',
    gatewayCustomerId TEXT,
    gatewaySubscriptionId TEXT,
    planTier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    expiresAt TIMESTAMP(3),
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_userId ON subscriptions(userId);

CREATE TABLE IF NOT EXISTS usage_metrics (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monthYear TEXT NOT NULL,
    videosProcessedIds JSONB NOT NULL,
    minutesProcessed INTEGER NOT NULL DEFAULT 0,
    lastProcessedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_month UNIQUE (userId, monthYear)
);
