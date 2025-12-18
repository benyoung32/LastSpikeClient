import { Player, SessionData, GameState, ActionType, Route, CityPair, Trade } from "@/types";
import axios, { AxiosResponse } from "axios";

const getBaseUrl = () => {
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:5098";
    }
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5098";
    return url.startsWith("http") ? url : `https://${url}`;
};

export const API_BASE_URL = getBaseUrl();

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

export async function getGameState(boardId: string): Promise<GameState> {
    return handleResponse<GameState>(
        axios.get(`${API_BASE_URL}/api/GameBoards/${boardId}/gamestate`)
    );
}

export async function selectAction(boardId: string, playerId: string, type: ActionType, target?: CityPair): Promise<void> {
    return handleResponse<void>(
        axios.put(`${API_BASE_URL}/api/GameBoards/${boardId}/action`, {
            type, playerId, target: {
                city1: target?.city1,
                city2: target?.city2
            }
        })
    );
}

export async function offerTrade(boardId: string, trade: Trade): Promise<void> {
    return handleResponse<void>(
        axios.put(`${API_BASE_URL}/api/GameBoards/${boardId}/offer-trade`, trade)
    );
}

export async function respondToTrade(boardId: string, playerId: string, accept: boolean): Promise<void> {
    return handleResponse<void>(
        axios.put(`${API_BASE_URL}/api/GameBoards/${boardId}/trade-action`, {
            playerId,
            accept
        })
    );
}
