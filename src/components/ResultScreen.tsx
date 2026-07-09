import React, { useState, useEffect } from "react";
import { Message, GuessResult, Audiobook } from "../types";
import { Check, X, Share2, Trophy, ArrowRight, BookOpen, ExternalLink, Headphones, Sparkles, Copy, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ResultScreenProps {
  name: string;
  guess: GuessResult;
  history: Message[];
  onViewLeaderboard: () => void;
  onRestart: () => void;
}

export default function ResultScreen({ name, guess, history, onViewLeaderboard, onRestart }: ResultScreenProps) {
  const [step, setStep] = useState<"reveal" | "correct" | "incorrect" | "finalized">("reveal");
  const [actualCareerInput, setActualCareerInput] = useState("");
  const [loadingAudiobook, setLoadingAudiobook] = useState(false);
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [shared, setShared] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Reveal effect: Speak the result
  useEffect(() => {
    // Already spoken in InterviewScreen transition
  }, []);

  // Handle Correct Confirmation
  const handleConfirmCorrect = () => {
    setStep("correct");
  };

  // Fetch Audiobook when wrong
  const handleConfirmIncorrect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCareerInput.trim()) return;

    setLoadingAudiobook(true);
    setStep("incorrect");

    try {
      const res = await fetch(`/api/audiobook?career=${encodeURIComponent(actualCareerInput.trim())}`);
      if (!res.ok) throw new Error("Audiobook fetch failed");
      const data = await res.json();
      setAudiobook(data);
    } catch (err) {
      console.error(err);
      // Ultimate hard fallback
      setAudiobook({
        title: "The Adventures of Sherlock Holmes",
        author: "Arthur Conan Doyle",
        link: "https://librivox.org/the-adventures-of-sherlock-holmes-by-sir-arthur-conan-doyle/",
      });
    } finally {
      setLoadingAudiobook(false);
    }
  };

  // Perform Share Action (Web Share API with Clipboard Fallback)
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?ref=${sessionId}`;
    const shareTitle = "CareerCall AI Guessing Game";
    const shareText = `Can AI guess your career? My AI interviewer guessed I was a ${guess.guessed_career}! Try it yourself:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        triggerFinalRecordSave();
      } catch (err) {
        console.log("Web share cancelled or failed, falling back to copy", err);
        fallbackCopyToClipboard(shareUrl);
      }
    } else {
      fallbackCopyToClipboard(shareUrl);
    }
  };

  const fallbackCopyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      triggerFinalRecordSave();
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // Save entry to Leaderboard on successful share action
  const triggerFinalRecordSave = async () => {
    if (savingRecord) return;
    setSavingRecord(true);

    const actual = step === "correct" ? guess.guessed_career : actualCareerInput;
    const isSuccess = step === "correct";

    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          guessedCareer: guess.guessed_career,
          actualCareer: actual,
          result: isSuccess ? "success" : "fail",
          shared: true,
          audiobookAssigned: audiobook?.title || null,
          audiobookAuthor: audiobook?.author || null,
          audiobookLink: audiobook?.link || null,
        }),
      });
      setShared(true);
      setStep("finalized");
    } catch (err) {
      console.error("Error writing to leaderboard", err);
      // Proceed anyways to not block user flow
      setShared(true);
      setStep("finalized");
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-6 py-8 flex flex-col justify-between min-h-[75vh]">
      
      {/* Step Indicator */}
      <div className="text-center">
        <span className="inline-block px-3 py-1 bg-[#D9FF00] text-black text-[10px] font-black uppercase tracking-widest rounded-none mb-4">
          {step === "reveal" && "THE VERDICT"}
          {step === "correct" && "ACCURATE PREDICTION"}
          {step === "incorrect" && "SYSTEM MISSED"}
          {step === "finalized" && "RECORD COMPLETED"}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {step === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 flex-1 flex flex-col justify-center"
          >
            {/* AI Guess display Card */}
            <div className="bg-[#151515] border-2 border-white/10 rounded-none p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-zinc-950 border border-white/10 text-[#D9FF00] rounded-none flex items-center justify-center mx-auto">
                <Sparkles size={28} className="animate-pulse" />
              </div>

              <div>
                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest block mb-1">
                  AI Guessed Your Career
                </span>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                  {guess.guessed_career}
                </h2>
              </div>

              {/* Confidence Indicator */}
              <div className="bg-zinc-950 p-4 border border-white/10 rounded-none max-w-xs mx-auto">
                <div className="flex justify-between items-center text-[10px] text-white/70 uppercase font-black tracking-widest mb-1.5">
                  <span>Confidence Level</span>
                  <span>{Math.round(guess.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-850 h-2 rounded-none overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${guess.confidence * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="bg-[#D9FF00] h-full rounded-none"
                  />
                </div>
              </div>

              {/* Reasoning */}
              <p className="text-white/60 text-sm font-semibold tracking-wide italic px-4 leading-relaxed">
                "{guess.reasoning}"
              </p>
            </div>

            {/* Answer check form */}
            <div className="bg-[#151515] border-2 border-white/10 p-5 rounded-none text-center space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Is the AI Correct?</h3>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmCorrect}
                  className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <Check size={16} />
                  Yes, That's Right!
                </button>
                <button
                  onClick={() => setStep("incorrect")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <X size={16} />
                  Nope, actually a...
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "incorrect" && !audiobook && (
          <motion.div
            key="incorrect"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 flex-1 flex flex-col justify-center"
          >
            <form onSubmit={handleConfirmIncorrect} className="bg-[#151515] border-2 border-white/10 rounded-none p-6 space-y-4">
              <h3 className="font-black text-white text-xl uppercase tracking-tighter">Correct the AI</h3>
              <p className="text-white/60 text-xs uppercase tracking-wider leading-relaxed">
                We'll record the actual career for our catalog and source a custom, professional-grade classic audiobook that perfectly matches your real career path.
              </p>
              <div>
                <label className="block text-[10px] font-black text-[#D9FF00] uppercase tracking-widest mb-1.5">
                  What is your actual career?
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Graphic Designer, Chef, Plumber..."
                  value={actualCareerInput}
                  onChange={(e) => setActualCareerInput(e.target.value)}
                  className="w-full px-4 py-4 bg-zinc-950 border-2 border-white/10 rounded-none text-white font-black uppercase placeholder-white/20 text-sm focus:outline-hidden focus:border-[#D9FF00] tracking-wider transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!actualCareerInput.trim() || loadingAudiobook}
                className="w-full py-4 bg-[#D9FF00] hover:bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none text-xs font-black uppercase tracking-widest cursor-pointer transition-colors"
              >
                {loadingAudiobook ? "Finding Matching Audio..." : "Unlock Matching Audiobook"}
              </button>
            </form>
          </motion.div>
        )}

        {step === "correct" && (
          <motion.div
            key="correct"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 flex-1 flex flex-col justify-center"
          >
            {/* Visual indicator card */}
            <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-none p-8 text-center space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-[#D9FF00] uppercase tracking-widest block">
                  AI Guessed Right!
                </span>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                  {guess.guessed_career}
                </h2>
                <p className="text-xs text-white/50 font-black uppercase tracking-widest">
                  correct — on the record
                </p>
              </div>

              <div className="border-t border-emerald-500/20 pt-4 text-center">
                <p className="text-xs text-white/70 leading-relaxed uppercase tracking-wider max-w-xs mx-auto">
                  Share this app with friends to claim your permanent spot on the public leaderboard.
                </p>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                disabled={savingRecord}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#D9FF00] hover:bg-white text-black font-black uppercase tracking-widest rounded-none transition-all cursor-pointer"
              >
                <Share2 size={16} />
                {copied ? "Link Copied!" : "Share Link to Unlock"}
              </button>
              
              {copied && (
                <span className="text-[10px] text-[#D9FF00] font-black uppercase tracking-widest block animate-fade-in">
                  Copied link to clipboard. Share with friends!
                </span>
              )}
            </div>
          </motion.div>
        )}

        {step === "incorrect" && audiobook && (
          <motion.div
            key="gift-audiobook"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 flex-1 flex flex-col justify-center"
          >
            {/* Visual indicator card */}
            <div className="bg-zinc-900 border-2 border-white/10 rounded-none p-6 text-center space-y-6">
              <div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  AI Guessed Wrong
                </span>
                <h2 className="text-xl font-bold uppercase tracking-tight text-white leading-tight">
                  {guess.guessed_career} <span className="text-white/40 text-sm font-normal">guessed</span>
                </h2>
                <p className="text-lg text-[#D9FF00] font-black uppercase tracking-wider mt-1.5">
                  Actually a <span className="underline decoration-2">{actualCareerInput}</span>
                </p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-2">
                  ai missed — free audiobook unlocked
                </p>
              </div>

              {/* Audiobook Container */}
              <div className="bg-zinc-950 border border-white/10 rounded-none p-4 flex items-center gap-4 text-left">
                <div className="p-3 bg-[#D9FF00] text-black rounded-none shrink-0">
                  <Headphones size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black text-[#D9FF00] uppercase tracking-widest block">
                    LibriVox · Matched to your career
                  </span>
                  <h4 className="font-black text-white text-sm truncate uppercase leading-snug">
                    "{audiobook.title}"
                  </h4>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    by {audiobook.author}
                  </p>
                </div>
              </div>

              {/* Gated Share button */}
              <button
                onClick={handleShare}
                disabled={savingRecord}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#D9FF00] hover:bg-white text-black font-black uppercase tracking-widest rounded-none transition-all cursor-pointer"
              >
                <Share2 size={16} />
                {copied ? "Link Copied!" : "Share to Redeem"}
              </button>

              {copied && (
                <span className="text-[10px] text-[#D9FF00] font-black uppercase tracking-widest block animate-fade-in">
                  Link copied. Share to instantly unlock audiobook details!
                </span>
              )}
            </div>
          </motion.div>
        )}

        {step === "finalized" && (
          <motion.div
            key="finalized"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 flex-1 flex flex-col justify-center text-center"
          >
            <div className="bg-[#151515] border-2 border-white/10 rounded-none p-8 space-y-6">
              <div className="w-16 h-16 bg-zinc-900 border border-white/10 text-[#D9FF00] rounded-none flex items-center justify-center mx-auto">
                <Trophy size={32} />
              </div>

              <div>
                <h3 className="font-black text-white text-2xl uppercase tracking-tighter">You're on the Record!</h3>
                <p className="text-white/60 text-xs uppercase tracking-widest leading-relaxed mt-2">
                  Thanks for playing, {name}! Your career profile and interview results have been added to our public database records.
                </p>
              </div>

              {audiobook && (
                <div className="bg-zinc-950 border border-white/10 p-4 rounded-none text-left">
                  <span className="text-[9px] font-black text-[#D9FF00] uppercase tracking-widest block mb-1">
                    Your Unlocked Audiobook
                  </span>
                  <h4 className="font-black text-white text-sm uppercase">"{audiobook.title}"</h4>
                  <p className="text-xs text-white/60">by {audiobook.author}</p>
                  <a
                    href={audiobook.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-black uppercase text-[#D9FF00] hover:text-white transition-colors"
                  >
                    Listen on LibriVox <ExternalLink size={12} />
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={onViewLeaderboard}
                  className="w-full flex items-center justify-center gap-1.5 py-4 bg-[#D9FF00] hover:bg-white text-black font-black uppercase tracking-widest rounded-none text-xs transition-colors cursor-pointer"
                >
                  <Trophy size={14} /> View Leaderboard
                </button>
                <button
                  onClick={onRestart}
                  className="w-full py-4 border-2 border-white/20 hover:border-[#D9FF00] text-white rounded-none text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Interview Someone Else
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
