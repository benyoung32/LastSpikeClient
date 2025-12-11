import { Player, SessionData } from "@/types";
import axios, { AxiosResponse } from "axios";

export const API_BASE_URL = "http://localhost:5098";

async function handleResponse<T>(request: Promise<AxiosResponse<T>>): Promise<T> {
    try {
        const response = await request;
        // If data is empty string (no content), return empty object as T to match previous behavior
        return response.data === "" ? ({} as T) : response.data;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            const statusText = error.response.statusText;
            const errorData = error.response.data;
            const errorText = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

            throw new Error(`API Error: ${status} ${statusText} - ${errorText}`);
        }
        throw error;
    }
}

export async function getSessionPlayers(sessionId: string): Promise<Player[]> {
    return handleResponse<Player[]>(
        axios.get(`${API_BASE_URL}/api/Sessions/${sessionId}/players`)
    );
}

export async function createPlayer(name: string): Promise<Player> {
    return handleResponse<Player>(
        axios.post(`${API_BASE_URL}/api/Players`, { name })
    );
}

export async function getPlayer(playerId: string): Promise<Player> {
    return handleResponse<Player>(
        axios.get(`${API_BASE_URL}/api/Players/${playerId}`)
    );
}

export async function createSession(hostPlayerId: string): Promise<SessionData> {
    // Create session
    return handleResponse<SessionData>(
        axios.post(`${API_BASE_URL}/api/Sessions`, { playerIds: [hostPlayerId] })
    );
}

export async function joinSession(sessionId: string, playerId: string): Promise<void> {
    return handleResponse<void>(
        axios.post(`${API_BASE_URL}/api/Sessions/${sessionId}/players/${playerId}`)
    );
}

export async function getSession(sessionId: string): Promise<SessionData> {
    return handleResponse<SessionData>(
        axios.get(`${API_BASE_URL}/api/Sessions/${sessionId}`)
    );
}

export async function startGame(sessionId: string, playerId: string): Promise<void> {
    return handleResponse<void>(
        axios.put(`${API_BASE_URL}/api/Sessions/${sessionId}/start_game`, null, {
            params: { playerId }
        })
    );
}

export async function getGameState(boardId: string): Promise<any> {
    // Return generalized any for now until GameState type matches server fully or we update types/index.ts
    // The user previously mentioned the route is /api/{id}/gamestate, mapped to Sessions controller usually
    return handleResponse<any>(
        axios.get(`${API_BASE_URL}/api/GameBoards/${boardId}/gamestate`)
    );
}
