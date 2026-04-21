// src/hooks/useApi.ts
import { useAuth } from '../context/AuthContext';

export const useApi = () => {
    const { token } = useAuth();

    // This uses the Vite environment variable, falling back to /api for production/Docker
    const BASE_URL = '/api';

    const callApi = async (endpoint: string, options: RequestInit = {}) => {
        // 1. Prepare headers
        const headers: Record<string, string> = {
            // Convert any incoming headers into a Record safely
            ...(options.headers as Record<string, string>),
            'Authorization': `Bearer ${token}`,
        };

        // 2. Only add Content-Type if there is a body to describe
        if (options.body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle No Content (204) or Successful Delete responses that might not be JSON
        if (response.status === 204 || response.status === 401) {
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'API Call Failed');
        }

        return response.json();
    };

    return { callApi };
};