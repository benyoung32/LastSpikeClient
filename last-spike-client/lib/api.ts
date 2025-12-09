import { Player, SessionData } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5098";

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    // Check if response has content before parsing JSON
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
}

export async function createPlayer(name: string): Promise<Player> {
    console.log("Creating player:", name);
    console.log("API Base URL:", API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/api/Players`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
    });
    return handleResponse<Player>(response);
}

export async function getPlayer(playerId: string): Promise<Player> {
    const response = await fetch(`${API_BASE_URL}/api/Players/${playerId}`);
    return handleResponse<Player>(response);
}

export async function createSession(hostPlayerId: string): Promise<SessionData> {
    // Create session
    const response = await fetch(`${API_BASE_URL}/api/Sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerIds: [hostPlayerId] }), // Initialize with host? Or empty and join?
        // Based on api.json, SessionData requires playerIds. 
        // Usually creating a session might just be a POST to /api/Sessions with some initial data.
        // Let's try sending just the required fields if any. 
        // The schema says playerIds is required.
    });

    // If the API requires us to join separately, we might need to adjust.
    // But for now, let's assume we pass the host in the creation or join immediately after.
    // The prompt says: "The create session button should call the session create endpoint, using the above player id as the first player, then join the session"
    // This implies the create endpoint might NOT automatically join the creator, or we need to pass it.
    // Let's assume we pass it in playerIds if the API allows, otherwise we join after.

    return handleResponse<SessionData>(response);
}

export async function joinSession(sessionId: string, playerId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/Sessions/${sessionId}/players/${playerId}`, {
        method: "POST",
    });
    return handleResponse<void>(response);
}

export async function getSession(sessionId: string): Promise<SessionData> {
    const response = await fetch(`${API_BASE_URL}/api/Sessions/${sessionId}`);
    return handleResponse<SessionData>(response);
}

export async function startGame(sessionId: string, playerId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/Sessions/${sessionId}/start_game?playerId=${playerId}`, {
        method: "PUT",
    });
    return handleResponse<void>(response);
}
