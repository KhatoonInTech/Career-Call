import React, { useEffect, useState, useRef } from "react";
import { Message, GuessResult } from "../types";
import { Mic, MicOff, Send, Volume2, Timer, RefreshCw, ChevronRight, Keyboard, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InterviewScreenProps {
  name: string;
  onInterviewComplete: (history: Message[], result: GuessResult) => void;
  onCancel: () => void;
}

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function InterviewScreen({ name, onInterviewComplete, onCancel }: InterviewScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [timer, setTimer] = useState(120); // 120 seconds
  const [status, setStatus] = useState<"initializing" | "speaking" | "listening" | "submitting" | "guessing">("initializing");
  
  // Answers
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      recognitionRef.current = rec;
    } else {
      setIsSpeechSupported(false);
      setShowManualInput(true); // Default to keyboard if speech recognition not supported
    }

    // Start interview by fetching the first question
    fetchNextQuestion([], false);

    // Start 120s timer
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          triggerFinalGuess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentQuestion]);

  // Read out the question using Text-To-Speech
  const speakQuestion = (text: string) => {
    setStatus("speaking");
    if (!window.speechSynthesis) {
      // Fallback if speechSynthesis is not available
      setTimeout(() => startListening(), 1000);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a nice English voice
    const voices = window.speechSynthesis.getVoices();
    const engVoice =
      voices.find((v) => v.lang.startsWith("en-") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Female") || v.name.includes("Samantha"))) ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      voices[0];

    if (engVoice) {
      utterance.voice = engVoice;
    }
    utterance.rate = 1.05; // Slightly rapid-fire
    utterance.pitch = 1.0;

    utterance.onend = () => {
      startListening();
    };

    utterance.onerror = () => {
      startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start Speech Recognition
  const startListening = () => {
    if (!recognitionRef.current || showManualInput) {
      setStatus("listening");
      return;
    }

    setStatus("listening");
    setSpokenTranscript("");

    try {
      const rec = recognitionRef.current;
      rec.abort(); // clear any previous session

      rec.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        setSpokenTranscript(text);
      };

      rec.onerror = (event: any) => {
        console.warn("Speech error:", event.error);
        if (event.error === "not-allowed") {
          setIsSpeechSupported(false);
          setShowManualInput(true);
        }
      };

      rec.onend = () => {
        // We stay in listening state. The user can review and click Send.
      };

      rec.start();
    } catch (err) {
      console.error("Speech Recognition starting error:", err);
    }
  };

  // Stop Speech Recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Submit the answer (either spoken or typed)
  const handleAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    stopListening();

    const answer = showManualInput ? manualText.trim() : spokenTranscript.trim();
    if (!answer) return;

    // Save answer to local history
    const updatedHistory: Message[] = [
      ...messages,
      { role: "model", content: currentQuestion },
      { role: "user", content: answer },
    ];

    setMessages(updatedHistory);
    setSpokenTranscript("");
    setManualText("");

    // Ask for the next question
    fetchNextQuestion(updatedHistory, false);
  };

  // Trigger early final guess
  const triggerFinalGuess = () => {
    stopListening();
    setStatus("guessing");
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Package current history, force a guess
    const finalHistory = [...messages];
    if (currentQuestion && messages.length === 0 || (messages.length > 0 && messages[messages.length - 1].content !== currentQuestion)) {
      // If we had an active question but no answer yet, append it
      finalHistory.push({ role: "model", content: currentQuestion });
    }
    
    fetchNextQuestion(finalHistory, true);
  };

  // Call server next-question API
  const fetchNextQuestion = async (historyToSend: Message[], force: boolean) => {
    setStatus(force ? "guessing" : "submitting");
    
    try {
      const res = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          history: historyToSend,
          forceGuess: force,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with AI");
      }

      const data = await res.json();

      if (data.isGuess) {
        // AI has formulated the final guess!
        setStatus("guessing");
        if (timerRef.current) clearInterval(timerRef.current);

        // Speak the final guess
        const guessSpeech = `I've got it. Based on our quick chat, I am guessing you are a ${data.guess.guessed_career}!`;
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(guessSpeech);
          utt.onend = () => {
            onInterviewComplete(historyToSend, data.guess);
          };
          window.speechSynthesis.speak(utt);
        } else {
          onInterviewComplete(historyToSend, data.guess);
        }
      } else {
        // AI returned another question
        setCurrentQuestion(data.question);
        setQuestionCount((prev) => prev + 1);
        speakQuestion(data.question);
      }
    } catch (err) {
      console.error(err);
      // Fail-safe guess if AI errors out, to preserve the game flow
      if (force || questionCount >= 5) {
        const fallbackGuess: GuessResult = {
          guessed_career: "Creative Explorer",
          confidence: 0.5,
          reasoning: "The connection dropped, but you have the spirit of an adaptable creative explorer!",
        };
        onInterviewComplete(historyToSend, fallbackGuess);
      } else {
        // Retry or ask same question manually
        setCurrentQuestion("Let's try that again. How do you usually spend your mornings?");
        speakQuestion("Let's try that again. How do you usually spend your mornings?");
      }
    }
  };

  // Timer Formatter
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-6 py-6 flex flex-col justify-between min-h-[80vh]">
      {/* Session Header */}
      <div className="flex justify-between items-center bg-[#151515] border-2 border-white/10 px-5 py-4 rounded-none">
        <div className="flex flex-col space-y-0.5">
          <span className="text-[10px] text-[#D9FF00] font-black uppercase tracking-widest">LIVE SESSION</span>
          <span className="text-xs text-white uppercase font-black tracking-wider">
            QUESTION {questionCount} / ~7
          </span>
        </div>

        {/* Countdown Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 border-2 ${timer <= 20 ? "border-red-500 bg-red-950/40 text-red-400 animate-pulse" : "border-white/10 bg-[#202020] text-[#D9FF00]"} text-xs font-black uppercase tracking-wider rounded-none`}>
          <Timer size={14} />
          <span>{formatTime(timer)}</span>
        </div>
      </div>

      {/* Main Conversation Feed Area */}
      <div className="flex-1 my-6 overflow-y-auto space-y-4 max-h-[42vh] pr-1 scrollbar-thin">
        {/* Render Conversation History */}
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "model" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-none text-sm border ${
                msg.role === "model"
                  ? "bg-zinc-950 border-white/10 text-white"
                  : "bg-[#D9FF00] text-black border-[#D9FF00] font-black uppercase tracking-wide"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Current Active AI Question */}
        {currentQuestion && (status === "speaking" || status === "listening" || status === "submitting") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[#151515] border-2 border-[#D9FF00]/40 text-white max-w-[90%] px-5 py-5 rounded-none shadow-xl relative">
              <span className="text-[10px] font-black text-[#D9FF00] uppercase tracking-widest block mb-1">
                AI INTERVIEWER
              </span>
              <p className="text-base font-bold leading-relaxed">"{currentQuestion}"</p>
              
              {status === "speaking" && (
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[#D9FF00] uppercase tracking-widest font-black">
                  <Volume2 size={12} className="animate-bounce" />
                  <span>Speaking out loud...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Thinking indicator */}
        {status === "submitting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-zinc-950 border border-white/10 text-[#D9FF00] text-xs font-black uppercase tracking-widest px-4 py-3 rounded-none flex items-center gap-2">
              <RefreshCw className="animate-spin" size={12} />
              <span>Analyzing answer...</span>
            </div>
          </motion.div>
        )}

        {status === "guessing" && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <RefreshCw className="animate-spin text-[#D9FF00]" size={32} />
            <div>
              <h3 className="font-black text-white text-xl uppercase tracking-tighter">AI IS NARROWING DOWN!</h3>
              <p className="text-white/60 text-xs uppercase tracking-wider mt-1 max-w-xs">Analyzing indirect clues, daily habits, and environmental signals...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Voice Recording Panel */}
      <div className="space-y-4">
        {status === "listening" && !status.includes("submitting") && !status.includes("guessing") && (
          <div className="bg-[#151515] border-2 border-white/10 p-5 rounded-none space-y-4">
            
            {/* Audio Wave Visualizer */}
            {!showManualInput && (
              <div className="flex flex-col items-center justify-center py-3">
                <div className="flex items-center gap-1.5 h-8 mb-3">
                  <motion.div animate={{ height: [12, 28, 12] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="w-1 bg-[#D9FF00] rounded-full" />
                  <motion.div animate={{ height: [8, 36, 8] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-1 bg-[#D9FF00] rounded-full" />
                  <motion.div animate={{ height: [16, 24, 16] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-1 bg-[#D9FF00] rounded-full" />
                  <motion.div animate={{ height: [6, 32, 6] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} className="w-1 bg-[#D9FF00] rounded-full" />
                  <motion.div animate={{ height: [12, 20, 12] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} className="w-1 bg-[#D9FF00] rounded-full" />
                </div>
                <span className="text-[10px] text-[#D9FF00] font-black uppercase tracking-widest animate-pulse">
                  LISTENING TO SENSOR SIGNALS...
                </span>
              </div>
            )}

            {/* Display parsed spoken text in real-time */}
            {!showManualInput && (
              <div className="min-h-12 bg-zinc-950 p-4 rounded-none border border-white/5 text-center text-sm text-white/90 italic font-mono tracking-tight leading-relaxed">
                {spokenTranscript || "Go ahead, speak your answer out loud..."}
              </div>
            )}

            {/* Manual input form */}
            {showManualInput && (
              <form onSubmit={handleAnswerSubmit} className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full pl-4 pr-14 py-3.5 bg-zinc-950 border-2 border-white/10 rounded-none text-white placeholder-white/20 text-sm font-black uppercase tracking-wider focus:outline-hidden focus:border-[#D9FF00] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!manualText.trim()}
                  className="absolute right-2 p-2 bg-[#D9FF00] hover:bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none transition-colors cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            )}

            {/* Buttons Panel */}
            <div className="flex gap-2">
              {!showManualInput ? (
                <>
                  <button
                    type="button"
                    onClick={handleAnswerSubmit}
                    disabled={!spokenTranscript.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-[#D9FF00] hover:bg-white text-black disabled:bg-zinc-800 disabled:text-zinc-600 rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Send Answer <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={startListening}
                    className="px-4 py-3.5 border-2 border-white/20 text-white hover:text-[#D9FF00] hover:border-[#D9FF00] rounded-none text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Retry
                  </button>
                </>
              ) : null}
            </div>

            {/* Toggle STT / Keyboard */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={() => {
                  setShowManualInput(!showManualInput);
                  setSpokenTranscript("");
                  setManualText("");
                  stopListening();
                }}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] text-white/50 hover:text-[#D9FF00] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {showManualInput ? (
                  <>
                    <Mic size={11} /> Use Voice Instead
                  </>
                ) : (
                  <>
                    <Keyboard size={11} /> Use Keyboard Instead
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Action Panel during Initializing / Speaking */}
        {(status === "initializing" || status === "speaking" || status === "submitting" || status === "guessing") && (
          <div className="bg-[#151515] border border-white/10 p-4 rounded-none text-center font-black uppercase tracking-widest text-[11px] text-[#D9FF00]">
            <p className="font-semibold">
              {status === "initializing" && "Initializing rapid street interview..."}
              {status === "speaking" && "AI is speaking the question out loud..."}
              {status === "submitting" && "AI is reviewing your signals..."}
              {status === "guessing" && "Consulting the career algorithm..."}
            </p>
          </div>
        )}

        {/* Early Guess Option */}
        {questionCount >= 3 && status !== "guessing" && (
          <button
            type="button"
            onClick={triggerFinalGuess}
            className="w-full py-3 bg-[#D9FF00]/10 hover:bg-[#D9FF00]/20 border-2 border-dashed border-[#D9FF00]/30 text-[#D9FF00] rounded-none text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Finish & Force Guess Now</span>
            <ArrowRight size={14} />
          </button>
        )}

        {/* Cancel/Reset interview */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs text-white/40 hover:text-red-500 font-black uppercase tracking-widest cursor-pointer transition-colors mt-2"
        >
          Abort Interview
        </button>
      </div>
    </div>
  );
}
