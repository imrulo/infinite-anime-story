"use client";

import { useRouter } from "next/navigation";
import { clearStoryState } from "@/lib/storage";

const DREAMS = [
  "I want to become strong enough to protect the people I love.",
  "I want to uncover the truth behind my missing past.",
  "I want to master the power inside me without losing myself.",
  "I want to defeat my rival and prove what I'm worth.",
  "I want to break the curse tied to my name.",
  "I want to reach a forbidden place no one returns from.",
];

export default function Home() {
  const router = useRouter();

  const handleDreamSelect = (dream: string) => {
    clearStoryState();
    router.push(`/story?dream=${encodeURIComponent(dream)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
            Infinite Interactive Anime Story
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Choose your dream and embark on an epic journey. Your choices shape the story in this original shōnen adventure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          {DREAMS.map((dream, index) => (
            <button
              key={index}
              onClick={() => handleDreamSelect(dream)}
              className="group relative p-6 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-left"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl font-bold text-purple-300 group-hover:text-purple-200 transition-colors">
                  {String.fromCharCode(65 + index)}
                </span>
                <p className="text-white text-lg font-medium leading-relaxed flex-1">
                  {dream}
                </p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/10 group-hover:to-blue-500/10 transition-all duration-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
