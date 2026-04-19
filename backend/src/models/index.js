import mongoose from 'mongoose';

//  User Model
const userSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Guest' },
  medicalContext: {
    disease: String,
    location: String,
    additionalInfo: String,
  },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);

// Message Schema (embedded)
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  sources: [
    {
      type: {
        type: String,
        enum: ['publication', 'trial'],
      },
      title: String,
      authors: [String],
      year: String,
      source: String,
      url: String,
      snippet: String,
      relevanceScore: Number,
    },
  ],

  queryExpanded: String,

  retrievalStats: {
    pubmedCount: Number,
    openAlexCount: Number,
    trialsCount: Number,
    rankedCount: Number,
  },
});

// Chat Model
const chatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },

  title: {
    type: String,
    default: 'New Research Session',
  },

  messages: [messageSchema],

  medicalContext: {
    disease: String,
    location: String,
    patientName: String,
    additionalQuery: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export const Chat = mongoose.model('Chat', chatSchema);

// Cached Research Model
const cachedResearchSchema = new mongoose.Schema({
  queryHash: {
    type: String,
    required: true,
    unique: true,
  },

  query: String,
  publications: Array,
  trials: Array,

  fetchedAt: {
    type: Date,
    default: Date.now,
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hrs
  },
});

cachedResearchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CachedResearch = mongoose.model(
  'CachedResearch',
  cachedResearchSchema,
);

// Search Log Model
const searchSchema = new mongoose.Schema({
  sessionId: String,
  originalQuery: String,
  expandedQuery: String,
  disease: String,
  location: String,
  resultsCount: Number,

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Search = mongoose.model('Search', searchSchema);
