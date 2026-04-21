import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommunityQuestion extends Document {
    authorId: Types.ObjectId;
    title: string;
    description: string;
    images: string[];
    subject?: string;
    boardCode: string;
    standard: number;
    votes: number;
    upvoters: Types.ObjectId[];
    answerCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICommunityAnswer extends Document {
    questionId: Types.ObjectId;
    authorId: Types.ObjectId;
    content: string;
    images: string[];
    votes: number;
    upvoters: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const QuestionSchema = new Schema<ICommunityQuestion>(
    {
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        images: { type: [String], default: [] },
        subject: { type: String },
        boardCode: { type: String },
        standard: { type: Number },
        votes: { type: Number, default: 0 },
        upvoters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        answerCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const AnswerSchema = new Schema<ICommunityAnswer>(
    {
        questionId: { type: Schema.Types.ObjectId, ref: 'CommunityQuestion', required: true },
        authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        images: { type: [String], default: [] },
        votes: { type: Number, default: 0 },
        upvoters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

export const CommunityQuestionModel = mongoose.model<ICommunityQuestion>('CommunityQuestion', QuestionSchema);
export const CommunityAnswerModel = mongoose.model<ICommunityAnswer>('CommunityAnswer', AnswerSchema);
