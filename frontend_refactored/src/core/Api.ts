export class Api {
    public static async get(url: string, headers: Record<string, string> = {}): Promise<any> {
        return this.request(url, 'GET', undefined, headers);
    }

    public static async post(url: string, body: any, headers: Record<string, string> = {}): Promise<any> {
        return this.request(url, 'POST', body, headers);
    }

    private static async request(url: string, method: string, body?: any, headers: Record<string, string> = {}): Promise<any> {
        const token = localStorage.getItem('token');
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

        try {
            const response = await fetch(url, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                    ...headers
                } as any,
                body: body ? JSON.stringify(body) : undefined
            });

            // Handle non-2xx responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `Request failed: ${response.status}`);
            }

            return await response.json();
        } catch (err) {
            console.error(`API Request Error (${method} ${url})`, err);
            throw err;
        }
    }
}
