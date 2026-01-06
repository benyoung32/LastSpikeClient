"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPlayer, createSession, joinSession } from "@/lib/api";
import { useSignalR } from "@/app/context/SignalRContext";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinSessionId = searchParams.get("joinSession");

  const [name, setName] = useState("");
  const [sessionIdToJoin, setSessionIdToJoin] = useState(joinSessionId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connection } = useSignalR();

  // Update session ID if URL param changes
  useEffect(() => {
    if (joinSessionId) {
      setSessionIdToJoin(joinSessionId);
    }
  }, [joinSessionId]);

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

      // Save to both Session (active tab) and Local (persistence)
      // Scoped by Session ID to allow multiple parallel sessions
      const storageKey = `ls_pid_${session.id}`;
      sessionStorage.setItem(storageKey, player.id);
      localStorage.setItem(storageKey, player.id);

      sessionStorage.setItem("playerName", name); // Name can be global or scoped, keeping simple for now

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

      const storageKey = `ls_pid_${sessionIdToJoin}`;
      sessionStorage.setItem(storageKey, player.id);
      localStorage.setItem(storageKey, player.id);

      sessionStorage.setItem("playerName", name);

      router.push(`/session/${sessionIdToJoin}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to join session");
    } finally {
      setIsLoading(false);
    }
  };

  const isJoinFlow = !!joinSessionId;

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
            {!isJoinFlow && (
              <button
                onClick={handleCreateSessionButton}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "Create New Session"}
              </button>
            )}

            {isJoinFlow && (
              <button
                onClick={handleJoinSessionButton}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "Join Session"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
