"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { StoryBeat, StoryPanel, StoryState, StoryResponse } from "@/types/story";
import { saveStoryState, loadStoryState, clearStoryState } from "@/lib/storage";
import { makePollinationsUrl } from "@/lib/pollinations";
import StoryPanelComponent from "@/components/StoryPanel";

const INITIAL_STORY_PANEL: StoryPanel = {
  keyItems: [],
  currentThread: {
    focus: "",
    leads: [],
  },
  people: [],
  abilities: [],
  continuityFlags: [],
};

function StoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dream = searchParams.get("dream");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState<StoryBeat | null>(null);
  const [storyPanel, setStoryPanel] = useState<StoryPanel>(INITIAL_STORY_PANEL);
  const [history, setHistory] = useState<Array<{ beat: StoryBeat; choiceId: "A" | "B" | "C" | null }>>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!dream) {
      router.push("/");
      return;
    }

    // Try to load saved state
    const saved = loadStoryState();
    if (saved && saved.dream === dream) {
      setCurrentBeat(saved.currentBeat);
      setStoryPanel(saved.storyPanel);
      setHistory(saved.history);
      // Restore image if we had a saved prompt
      if (saved.imagePrompt) {
        setImagePrompt(saved.imagePrompt);
      }
    } else {
      // Start new story
      fetchNextBeat(null);
    }
  }, [dream, router]);

  useEffect(() => {
    if (imagePrompt) {
      setImageUrl(makePollinationsUrl(imagePrompt));
    }
  }, [imagePrompt]);

  const fetchNextBeat = async (choiceId: "A" | "B" | "C" | null) => {
    if (!dream) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/story/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dream,
          choiceId,
          history: history.slice(-12), // Last 12 beats
          storyPanel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate story");
      }

      const data: StoryResponse = await response.json();

      // Add current beat to history if it exists
      if (currentBeat) {
        setHistory((prev) => [...prev, { beat: currentBeat, choiceId }]);
      }

      setCurrentBeat(data.beat);
      setStoryPanel(data.storyPanel);
      setImagePrompt(data.imagePrompt);

      // Save state
      const newHistory = currentBeat
        ? [...history, { beat: currentBeat, choiceId }]
        : history;
      saveStoryState({
        dream,
        history: newHistory,
        currentBeat: data.beat,
        storyPanel: data.storyPanel,
        imagePrompt: data.imagePrompt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (choiceId: "A" | "B" | "C") => {
    fetchNextBeat(choiceId);
  };

  const handleBack = () => {
    if (history.length === 0) {
      router.push("/");
      return;
    }

    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentBeat(previous.beat);

    // Restore story panel from history if we had it saved
    // For simplicity, we'll regenerate, but in a full implementation you'd save panel state too
    const newHistory = history.slice(0, -1);
    saveStoryState({
      dream: dream!,
      history: newHistory,
      currentBeat: previous.beat,
      storyPanel, // Keep current panel for now
      imagePrompt, // Keep current image prompt
    });
  };

  const handleRestart = () => {
    clearStoryState();
    setHistory([]);
    setCurrentBeat(null);
    setStoryPanel(INITIAL_STORY_PANEL);
    setImageUrl(null);
    setImagePrompt(null);
    router.push("/");
  };

  if (!dream) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-200">Your Dream</h2>
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              disabled={history.length === 0 && !currentBeat}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Restart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Story Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Story Beat */}
            {loading && (
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-8 text-center">
                <div className="animate-pulse text-purple-300">Generating your story...</div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/50 backdrop-blur-sm rounded-lg p-4 border border-red-500">
                <p className="text-red-200">Error: {error}</p>
                <button
                  onClick={() => fetchNextBeat(null)}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Retry
                </button>
              </div>
            )}

            {currentBeat && !loading && (
              <div className="space-y-6">
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-6 space-y-4">
                  <h1 className="text-3xl font-bold text-purple-200">{currentBeat.title}</h1>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {currentBeat.text.split("*").map((part, idx) => {
                      if (idx % 2 === 1) {
                        return <em key={idx} className="text-purple-200">{part}</em>;
                      }
                      return <span key={idx}>{part}</span>;
                    })}
                  </div>
                  <div className="pt-4 border-t border-slate-700 space-y-2 text-sm text-slate-400">
                    <p><strong className="text-purple-300">Location:</strong> {currentBeat.location}</p>
                    <p><strong className="text-purple-300">Mood:</strong> {currentBeat.mood}</p>
                  </div>
                </div>

                {/* Choices */}
                <div className="space-y-3">
                  {currentBeat.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoice(choice.id)}
                      disabled={loading}
                      className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-left transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{choice.id}</span>
                        <div>
                          <p className="font-semibold">{choice.text}</p>
                          <p className="text-sm text-purple-200 opacity-80">{choice.tone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Area */}
            {imageUrl && (
              <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Story illustration"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Story Panel Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h3 className="text-xl font-bold text-purple-200 mb-4">Story Panel</h3>
              <StoryPanelComponent panel={storyPanel} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-purple-300">Loading...</div>
      </div>
    }>
      <StoryContent />
    </Suspense>
  );
}
