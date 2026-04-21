import axios from 'axios';

const API_URL = 'http://localhost:4000/api/doubt-sessions';

const getAuthHeader = () => {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export interface DoubtMessage {
    role: 'student' | 'ai';
    content: string;
    images?: string[];
    createdAt: string;
}

export interface DoubtSession {
    _id: string;
    title: string;
    subject?: string;
    boardCode?: string;
    standard?: number;
    messages: DoubtMessage[];
    messageCount?: number;
    createdAt: string;
    updatedAt: string;
}

export const doubtSessionService = {
    // Create a new session
    createSession: async (data: {
        title: string;
        subject?: string;
        boardCode?: string;
        standard?: number;
    }): Promise<DoubtSession> => {
        const res = await axios.post(API_URL, data, {
            headers: getAuthHeader(),
        });
        return res.data;
    },

    // List all sessions for the student
    getSessions: async (): Promise<DoubtSession[]> => {
        const res = await axios.get(API_URL, {
            headers: getAuthHeader(),
        });
        return res.data;
    },

    // Get a single session with full messages
    getSession: async (id: string): Promise<DoubtSession> => {
        const res = await axios.get(`${API_URL}/${id}`, {
            headers: getAuthHeader(),
        });
        return res.data;
    },

    // Ask a question and get AI answer (both stored in DB).
    // Pass optional images[] to attach screenshots/photos.
    askQuestion: async (
        sessionId: string,
        question: string,
        images?: File[]
    ): Promise<{
        studentMessage: DoubtMessage;
        aiMessage: DoubtMessage;
        totalMessages: number;
    }> => {
        const formData = new FormData();
        formData.append('question', question);
        if (images?.length) {
            images.forEach(img => formData.append('images', img));
        }
        const res = await axios.post(
            `${API_URL}/${sessionId}/ask`,
            formData,
            { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } }
        );
        return res.data;
    },

    // Delete a session
    deleteSession: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/${id}`, {
            headers: getAuthHeader(),
        });
    },
};
