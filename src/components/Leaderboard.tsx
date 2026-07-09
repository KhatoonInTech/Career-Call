import React, { useEffect, useState } from "react";
import { LeaderboardEntry } from "../types";
import { Search, Trophy, CheckCircle, XCircle, Share2, ArrowLeft, RefreshCw, BarChart2 } from "lucide-react";
import { motion } from "motion/react";

interface LeaderboardProps {
  onBackToHome: () => void;
}

export default function Leaderboard({ onBackToHome }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Could not retrieve records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const term = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(term) ||
      entry.guessedCareer.toLowerCase().includes(term) ||
      entry.actualCareer.toLowerCase().includes(term)
    );
  });

  // Calculate statistics
  const totalAttempts = entries.length;
  const successfulGuesses = entries.filter((e) => e.result === "success").length;
  const accuracyRate = totalAttempts > 0 ? Math.round((successfulGuesses / totalAttempts) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <button
            onClick={onBackToHome}
            className="group flex items-center gap-2 text-white/50 hover:text-[#D9FF00] text-xs font-black uppercase tracking-widest mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Interview
          </button>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Public Catalog & Leaderboard</h1>
          <p className="text-sm text-white/60 mt-1 uppercase tracking-wide">Real-time records of AI's street-format career guesses</p>
        </div>
        <button
          onClick={fetchEntries}
          className="flex items-center gap-2 px-4 py-2 border-2 border-white/20 hover:border-[#D9FF00] hover:text-black hover:bg-[#D9FF00] text-white text-xs font-black uppercase tracking-widest bg-transparent cursor-pointer transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Records
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151515] border-2 border-white/10 p-5 rounded-none flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-950 border border-white/15 text-[#D9FF00]">
            <Trophy size={24} />
          </div>
          <div>
            <span className="text-[10px] text-white/40 block font-black uppercase tracking-widest">AI Guess Accuracy</span>
            <span className="text-3xl font-black text-white uppercase tracking-tight">{accuracyRate}%</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#151515] border-2 border-white/10 p-5 rounded-none flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-950 border border-white/15 text-[#D9FF00]">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="text-[10px] text-white/40 block font-black uppercase tracking-widest">Successful Guesses</span>
            <span className="text-3xl font-black text-white uppercase tracking-tight">
              {successfulGuesses} <span className="text-xs text-white/40 font-black tracking-wider">LIVES</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#151515] border-2 border-white/10 p-5 rounded-none flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-950 border border-white/15 text-[#D9FF00]">
            <BarChart2 size={24} />
          </div>
          <div>
            <span className="text-[10px] text-white/40 block font-black uppercase tracking-widest">Total Attempts Logged</span>
            <span className="text-3xl font-black text-white uppercase tracking-tight">
              {totalAttempts} <span className="text-xs text-white/40 font-black tracking-wider">CASES</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-4 text-white/40" size={18} />
        <input
          type="text"
          placeholder="SEARCH BY CANDIDATE NAME, GUESS, OR ACTUAL CAREER..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-zinc-950 border-2 border-white/10 rounded-none text-white font-black uppercase placeholder-white/20 focus:outline-hidden focus:border-[#D9FF00] text-sm tracking-wider transition-colors"
        />
      </div>

      {/* Leaderboard Entries List */}
      {error && (
        <div className="bg-red-950/40 border border-red-500 text-red-400 p-4 rounded-none text-center text-xs font-black uppercase tracking-widest my-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#151515] border-2 border-white/10 rounded-none">
          <RefreshCw className="animate-spin text-[#D9FF00] mb-3" size={28} />
          <p className="text-xs text-[#D9FF00] font-black uppercase tracking-widest">Scanning the public catalogs...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-[#151515] border-2 border-white/10 rounded-none">
          <p className="text-[#D9FF00] font-black uppercase tracking-widest text-sm">No profiles found matching search query</p>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Try another keyword or run a new live interview!</p>
        </div>
      ) : (
        <div className="bg-[#151515] border-2 border-white/10 rounded-none overflow-hidden shadow-2xl">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b-2 border-white/10">
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest">Candidate Name</th>
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest">AI Guess</th>
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest">Actual Career</th>
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest text-center">Result</th>
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest text-center">Shared</th>
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-black text-white text-sm uppercase tracking-wider">{entry.name}</td>
                    <td className="px-6 py-4 text-[#D9FF00] text-sm font-black uppercase tracking-wider">{entry.guessedCareer}</td>
                    <td className="px-6 py-4 text-white/70 text-sm font-semibold tracking-wide">
                      {entry.result === "success" ? (
                        <span className="text-emerald-400/80 font-black uppercase text-xs tracking-wider">Matched Perfectly</span>
                      ) : (
                        <span className="text-white/80 font-black uppercase text-xs tracking-wider">{entry.actualCareer}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-widest border rounded-none ${
                          entry.result === "success"
                            ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                            : "bg-amber-950/40 border-amber-500/50 text-amber-400"
                        }`}
                      >
                        {entry.result === "success" ? "Success" : "Miss"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest rounded-none ${
                          entry.shared
                            ? "text-[#D9FF00] bg-zinc-950 border-[#D9FF00]/30"
                            : "text-white/30 border-white/5"
                        }`}
                      >
                        <Share2 size={10} />
                        {entry.shared ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-white/40 font-mono text-[11px]">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-white/5">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-white text-base uppercase tracking-wider">{entry.name}</h3>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border rounded-none ${
                      entry.result === "success" ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400" : "bg-amber-950/40 border-amber-500/50 text-amber-400"
                    }`}
                  >
                    {entry.result === "success" ? "Success" : "Miss"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-3 rounded-none border border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-white/40 block font-black uppercase tracking-widest text-[9px] mb-1">AI Guess</span>
                    <span className="text-[#D9FF00] font-black uppercase">{entry.guessedCareer}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block font-black uppercase tracking-widest text-[9px] mb-1">Actual Career</span>
                    <span className="text-white font-black uppercase">
                      {entry.result === "success" ? "MATCHED" : entry.actualCareer}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                  <span className="text-white/40 flex items-center gap-1.5">
                    <Share2 size={12} className={entry.shared ? "text-[#D9FF00]" : ""} />
                    {entry.shared ? "SHARED WITH FRIENDS" : "NOT SHARED"}
                  </span>
                  {entry.audiobookAssigned && (
                    <span className="text-[#D9FF00] italic font-semibold">
                      GIFT: {entry.audiobookAssigned}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
