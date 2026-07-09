import React, { useState } from "react";
import { Mic, ArrowRight, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface LandingScreenProps {
  onStart: (name: string) => void;
  onViewLeaderboard: () => void;
}

export default function LandingScreen({ onStart, onViewLeaderboard }: LandingScreenProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStart(name.trim());
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-6 py-12 flex flex-col items-center justify-between min-h-[75vh]">
      {/* Branding Header */}
      <div className="text-center mt-2 space-y-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-block px-3 py-1 bg-[#D9FF00] text-black text-[10px] font-black uppercase tracking-widest"
        >
          AI STREET INTERVIEW MODE
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] text-white">
          CAN AI <span className="text-[#D9FF00]">GUESS</span> YOUR JOB?
        </h1>
        <p className="text-white/60 text-sm max-w-sm mx-auto font-medium leading-relaxed">
          2 minutes. Rapid-fire questions. Zero career talk allowed. Our AI agent listens to your lifestyle signals to predict your profession.
        </p>
      </div>

      {/* Main Interactive Mic Section */}
      <div className="my-10 relative flex flex-col items-center justify-center">
        {/* Decorative Wave Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.15, 0.05, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-40 h-40 border-2 border-[#D9FF00] rounded-none"
          />
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.1, 0.02, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="w-44 h-44 border-2 border-white/10 rounded-none"
          />
        </div>

        {/* Pulsing Central Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative w-28 h-28 bg-[#151515] border-2 border-white/10 rounded-none flex items-center justify-center shadow-2xl z-10"
        >
          <div className="absolute inset-2 bg-[#202020] border border-[#D9FF00]/40 rounded-none flex items-center justify-center">
            <Mic size={38} className="text-[#D9FF00] animate-pulse" />
          </div>
        </motion.div>

        <h2 className="text-lg font-black uppercase tracking-wider text-white mt-8">GUESS MY CAREER</h2>
        <p className="text-[11px] text-white/40 uppercase tracking-widest text-center mt-2 leading-relaxed">
          Rapid-fire questions only.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-xs font-black text-white/50 uppercase tracking-widest text-center">
            Introduce yourself
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="ENTER YOUR NAME..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-center px-4 py-4 bg-transparent border-2 border-white/20 rounded-none text-white font-black uppercase tracking-wider placeholder:text-white/20 focus:outline-hidden focus:border-[#D9FF00] text-lg transition-colors"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={!name.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#D9FF00] hover:bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-500 font-black uppercase tracking-tighter text-xl rounded-none cursor-pointer transition-colors"
        >
          Start Voice Interview
          <ArrowRight size={20} strokeWidth={3} />
        </motion.button>

        <button
          type="button"
          onClick={onViewLeaderboard}
          className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-[#D9FF00] text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          <Trophy size={14} />
          View Public Leaderboard
        </button>
      </form>
    </div>
  );
}

