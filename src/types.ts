export interface Audiobook {
  title: string;
  author: string;
  link: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  guessedCareer: string;
  actualCareer: string;
  result: "success" | "fail";
  shared: boolean;
  audiobookAssigned?: string | null;
  audiobookLink?: string | null;
  audiobookAuthor?: string | null;
  timestamp: number;
}

export interface Message {
  role: "user" | "model";
  content: string;
}

export interface GuessResult {
  guessed_career: string;
  confidence: number;
  reasoning: string;
}
