
export type Role = 'student' | 'teacher';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  points: number;
  classIds?: string[];
  avatarUrl?: string | null;
  avatarType?: 'url' | 'emoji' | 'text' | null;
  createdAt?: any;
}

export type QuestionType = 
  | 'mcq' | 'fib' | 'jumble' | 'match' | 'translation' 
  | 'listen_mcq' | 'listen_write' | 'listen_translate' | 'arena_quiz' | 'arena_input';

export interface Question {
  type: QuestionType;
  text: string;
  options?: string[]; // For MCQ
  correct?: number | string; // Index for MCQ, string for text inputs
  answer?: string | string[]; // For FIB, Jumble, Translation
  pairs?: { a: string; b: string }[]; // For Match
  vietnamese?: string;
  chinese?: string;
  audioText?: string;
  audioWord?: string;
  audioSentence?: string;
  shuffledWords?: string[]; // Runtime state for Jumble
  shuffledColB?: string[]; // Runtime state for Match
  qTypeId?: number; // For Arena specific logic
}

export interface Assignment {
  id: string;
  title: string;
  questions: Question[];
  classIds: string[];
  createdBy: string;
  createdAt?: any;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  score: number;
  answers: Record<number, any>;
  questionData?: Record<number, any>; // Store randomized states to review correctly
  createdAt?: any;
}

export interface ClassGroup {
  id: string;
  title: string;
  classCode: string;
  teacherId: string;
  studentIds: string[];
  createdAt?: any;
}

export interface QuestionBank {
  id: string;
  title: string;
  questions: Question[];
  createdBy: string;
  createdAt?: any;
}

export interface Match {
  id: string;
  roomCode: string;
  player1: { uid: string; name: string; score: number };
  player2?: { uid: string; name: string; score: number } | null;
  status: 'waiting' | 'playing' | 'finished';
  questions: Question[];
  qIndex: number;
  winnerScore?: number;
  finishedBy?: string;
  createdAt?: any;
  startTime?: any;
}

export interface VocabularyItem {
  word: string;
  pinyin: string;
  meaning: string;
}