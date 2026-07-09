import React, { useState, useEffect } from "react";
import LandingScreen from "./components/LandingScreen";
import InterviewScreen from "./components/InterviewScreen";
import ResultScreen from "./components/ResultScreen";
import Leaderboard from "./components/Leaderboard";
import { Message, GuessResult } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy } from "lucide-react";

export default function App() {
  const [screen, setScreen] = useState<"landing" | "interview" | "result" | "leaderboard">("landing");
  const [name, setName] = useState("");
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<Message[]>([]);

  // Support referral URL parameters (redirecting directly to leaderboard on load if ref exists, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("ref")) {
      setScreen("leaderboard");
    }
  }, []);

  const handleStartInterview = (enteredName: string) => {
    setName(enteredName);
    setScreen("interview");
  };

  const handleInterviewComplete = (history: Message[], result: GuessResult) => {
    setInterviewHistory(history);
    setGuessResult(result);
    setScreen("result");
  };

  const handleCancelInterview = () => {
    setScreen("landing");
    setName("");
  };

  const handleViewLeaderboard = () => {
    setScreen("leaderboard");
  };

  const handleBackToLanding = () => {
    setScreen("landing");
    setName("");
    setGuessResult(null);
    setInterviewHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans flex flex-col justify-between selection:bg-[#D9FF00] selection:text-black">
      
      {/* Top Brand Bar (Modern Bold Typography Theme) */}
      <header className="px-6 py-6 flex justify-between items-center max-w-6xl w-full mx-auto border-b border-white/10">
        <button
          onClick={handleBackToLanding}
          className="flex items-center gap-2.5 font-black text-2xl tracking-tighter uppercase hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-5 h-5 bg-[#D9FF00] rounded-full"></div>
          <span>
            Career<span className="text-[#D9FF00]">Call</span>
          </span>
        </button>
        
        {screen !== "leaderboard" && (
          <button
            onClick={handleViewLeaderboard}
            className="flex items-center gap-1.5 px-4 py-2 border-2 border-white/20 hover:border-[#D9FF00] text-white hover:text-black hover:bg-[#D9FF00] text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Trophy size={13} />
            Leaderboard
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center w-full py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full"
          >
            {screen === "landing" && (
              <LandingScreen
                onStart={handleStartInterview}
                onViewLeaderboard={handleViewLeaderboard}
              />
            )}

            {screen === "interview" && (
              <InterviewScreen
                name={name}
                onInterviewComplete={handleInterviewComplete}
                onCancel={handleCancelInterview}
              />
            )}

            {screen === "result" && guessResult && (
              <ResultScreen
                name={name}
                guess={guessResult}
                history={interviewHistory}
                onViewLeaderboard={handleViewLeaderboard}
                onRestart={handleBackToLanding}
              />
            )}

            {screen === "leaderboard" && (
              <Leaderboard onBackToHome={handleBackToLanding} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Marquee Footer Bar */}
      <div className="h-12 bg-[#D9FF00] flex items-center overflow-hidden shrink-0">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-black font-black text-xs uppercase px-8">Free for Everyone • No Account Needed • Powered by Gemini AI • Rapid-Fire Guessing • Street Interview Style • </span>
          <span className="text-black font-black text-xs uppercase px-8">Free for Everyone • No Account Needed • Powered by Gemini AI • Rapid-Fire Guessing • Street Interview Style • </span>
          <span className="text-black font-black text-xs uppercase px-8">Free for Everyone • No Account Needed • Powered by Gemini AI • Rapid-Fire Guessing • Street Interview Style • </span>
        </div>
      </div>
    </div>
  );
}
