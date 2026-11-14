// backend/src/models/ai-conversation.model.ts
// MongoDB Mongoose Models for AI Conversations & Citations

import mongoose, { Document as MongooseDoc, Schema, Model, Types } from 'mongoose';

export interface IAICitation {
  documentId: Types.ObjectId;
  documentName: string;
  pageNumber?: number;
  quoteExcerpt: string;
  confidence?: number;
}

export interface IAIMessage extends MongooseDoc {
  conversationId: string;
  userId: Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: IAICitation[];
  tokenCount?: number;
  createdAt: Date;
}

export interface IAIConversation extends MongooseDoc {
  conversationId: string;
  userId: Types.ObjectId;
  applicationId?: Types.ObjectId;
  title: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const citationSchema = new Schema<IAICitation>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecord',
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
    },
    quoteExcerpt: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      default: 0.9,
    },
  },
  { _id: false }
);

const aiMessageSchema = new Schema<IAIMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: [citationSchema],
    tokenCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

aiMessageSchema.index({ conversationId: 1, createdAt: 1 });

const aiConversationSchema = new Schema<IAIConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: 'New Legal Inquiry',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

aiConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export const AIConversation: Model<IAIConversation> =
  mongoose.models.AIConversation ||
  mongoose.model<IAIConversation>('AIConversation', aiConversationSchema);

export const AIMessage: Model<IAIMessage> =
  mongoose.models.AIMessage ||
  mongoose.model<IAIMessage>('AIMessage', aiMessageSchema);

