"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayer, createSession, joinSession } from "@/lib/api";
import { useSignalR } from "@/app/context/SignalRContext";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sessionIdToJoin, setSessionIdToJoin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useSignalR();

  const handleCreateSessionButton = async () => {
    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const player = await createPlayer(name);
      const session = await createSession(player.id);

      localStorage.setItem("playerId", player.id);
      localStorage.setItem("playerName", name);

      router.push(`/session/${session.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSessionButton = async () => {
    if (!name.trim()) {
      setError("Please enter a name");
      return;
    }
    if (!sessionIdToJoin.trim()) {
      setError("Please enter a Session ID");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const player = await createPlayer(name);
      await joinSession(sessionIdToJoin, player.id);

      localStorage.setItem("playerId", player.id);
      localStorage.setItem("playerName", name);

      router.push(`/session/${sessionIdToJoin}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to join session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black text-white p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
            The Last Spike
          </h1>
          <p className="mt-2 text-zinc-400">Build a railway across Canada!</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-4 pt-2">
            <button
              onClick={handleCreateSessionButton}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Create New Session"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-zinc-500">Or join existing session</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={sessionIdToJoin}
                onChange={(e) => setSessionIdToJoin(e.target.value)}
                placeholder="Session ID"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-zinc-600"
              />
              <button
                onClick={handleJoinSessionButton}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg border border-zinc-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
