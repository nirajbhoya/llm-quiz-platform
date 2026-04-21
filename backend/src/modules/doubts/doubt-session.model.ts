import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessage {
    role: 'student' | 'ai';
    content: string;
    images?: string[];
    createdAt: Date;
}

export interface IDoubtSession extends Document {
    studentId: Types.ObjectId;
    title: string;
    subject?: string;
    boardCode?: string;
    standard?: number;
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        role: { type: String, enum: ['student', 'ai'], required: true },
        content: { type: String, required: true },
        images: { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const DoubtSessionSchema = new Schema<IDoubtSession>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        subject: { type: String },
        boardCode: { type: String },
        standard: { type: Number },
        messages: { type: [MessageSchema], default: [] },
    },
    { timestamps: true }
);

export const DoubtSessionModel = mongoose.model<IDoubtSession>('DoubtSession', DoubtSessionSchema);
