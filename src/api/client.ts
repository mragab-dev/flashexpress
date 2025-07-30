// The base URL for the API.
// For production builds (like an APK), it reads from the .env.production file.
// For local development (`npm run dev`), it's an empty string, so requests are relative
// and handled by Vite's proxy.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * A centralized fetch wrapper for all API calls.
 * It automatically prepends the correct base URL and handles JSON parsing and errors.
 * @param endpoint The API endpoint to call (e.g., '/api/login').
 * @param options Standard RequestInit options.
 * @returns The JSON response from the server.
 */
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            // Try to parse error response as JSON, but handle cases where it's not.
            try {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.statusText}`);
            } catch (jsonError) {
                // If the error response isn't JSON, throw a generic error with the status text.
                // This prevents the "JSON.parse: unexpected character" error on the client.
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        }
        
        // Return a success object for non-JSON responses (e.g., DELETE with 200 OK)
        return { success: true };
    } catch (error) {
        // Re-throw the error to be caught by the calling function
        throw error;
    }
};