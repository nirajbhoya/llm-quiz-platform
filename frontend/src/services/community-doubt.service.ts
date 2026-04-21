import axios from 'axios';

const API_URL = 'http://localhost:4000/api/community-doubts';

export interface CommunityQuestion {
    _id: string;
    authorId: {
        _id: string;
        name: string;
        email: string;
    };
    title: string;
    description: string;
    images: string[];
    subject?: string;
    votes: number;
    upvoters: string[];
    boardCode: string;
    standard: number;
    answerCount: number;
    createdAt: string;
    updatedAt: string;
    answers?: CommunityAnswer[];
}

export interface CommunityAnswer {
    _id: string;
    questionId: string;
    authorId: {
        _id: string;
        name: string;
        email: string;
    };
    content: string;
    images: string[];
    votes: number;
    upvoters: string[];
    createdAt: string;
    updatedAt: string;
}

const getAuthHeader = () => {
    const token = sessionStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const communityDoubtService = {
    getQuestions: async () => {
        const response = await axios.get<CommunityQuestion[]>(API_URL, getAuthHeader());
        return response.data;
    },

    getQuestion: async (id: string) => {
        const response = await axios.get<CommunityQuestion>(`${API_URL}/${id}`, getAuthHeader());
        return response.data;
    },

    createQuestion: async (formData: FormData) => {
        const response = await axios.post<CommunityQuestion>(API_URL, formData, {
            headers: {
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    postAnswer: async (questionId: string, formData: FormData) => {
        const response = await axios.post<CommunityAnswer>(`${API_URL}/${questionId}/answers`, formData, {
            headers: {
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    voteQuestion: async (id: string) => {
        const response = await axios.post<{ votes: number; isUpvoted: boolean }>(`${API_URL}/${id}/vote`, {}, getAuthHeader());
        return response.data;
    },

    voteAnswer: async (answerId: string) => {
        const response = await axios.post<{ votes: number; isUpvoted: boolean; transferredFrom?: string }>(`${API_URL}/answers/${answerId}/vote`, {}, getAuthHeader());
        return response.data;
    },

    deleteQuestion: async (id: string) => {
        const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
        return response.data;
    },

    deleteAnswer: async (answerId: string) => {
        const response = await axios.delete(`${API_URL}/answers/${answerId}`, getAuthHeader());
        return response.data;
    },

    blockStudent: async (studentId: string, isBlocked: boolean) => {
        const response = await axios.post(`${API_URL}/admin/block-student/${studentId}`, { isBlocked }, getAuthHeader());
        return response.data;
    },
};
