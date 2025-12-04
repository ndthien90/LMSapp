
import { Question, VocabularyItem } from "../types";

export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const speakWord = (text: string, lang = 'zh-CN') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Browser does not support text-to-speech");
  }
};

export const TEACHER_CODE = "ruands10";

export const EMOJI_AVATARS = ['🐼','🙎‍♂️','🌋','💂','🙍','🦸','🐯','🐘','🐢','🐝', '🎅', '🧙', '🐶', '🐮', '🐰', 
  '🐋', '🐵', '☃️', '🦋', '🤹‍♂️', '🐓', '🐬', '🐷', '🌎', '🎯','🎓', '😺', '🚀', '💡',
  '🕵️', '🧠', '🦉', '🦊', '🐻', '🐼', '💻', '🧑‍🎓', '👨‍🏫', '🏆', '🥇', '🥈', '🥉',
  '🐲', '🦄', '🤖'];

export const generateArenaQuestions = (vocabList: VocabularyItem[]): Question[] => {
    const questions: Question[] = [];
    if (vocabList.length < 4) return [];

    const NUM_QUESTION_TYPES = 7; 

    for(let i = 0; i < 10; i++) {
        const correctItem = vocabList[Math.floor(Math.random() * vocabList.length)];
        const type = Math.floor(Math.random() * NUM_QUESTION_TYPES) + 1; 
        let qText = "", qOptions: string[] = [], correctAnswerVal = "", audioWord = undefined, audioSentence = undefined;
        let qTypeId = type; 

        const distractors: VocabularyItem[] = [];
        while(distractors.length < 3) {
            const item = vocabList[Math.floor(Math.random() * vocabList.length)];
            if (item.word !== correctItem.word && !distractors.includes(item)) distractors.push(item);
        }
        
        const sentence = `我喜欢${correctItem.word}。`;
        
        switch(type) {
            case 1: 
                qText = `Nghĩa của từ <span class="text-blue-600 font-bold text-2xl mx-2">${correctItem.word}</span> là gì?`;
                correctAnswerVal = correctItem.meaning;
                qOptions = [correctItem.meaning, ...distractors.map(d => d.meaning)];
                break;
            case 2: 
                qText = `Pinyin của từ <span class="text-blue-600 font-bold text-2xl mx-2">${correctItem.word}</span> là gì?`;
                correctAnswerVal = correctItem.pinyin;
                qOptions = [correctItem.pinyin, ...distractors.map(d => d.pinyin)];
                break;
            case 3: 
                qText = `Từ nào có nghĩa là <span class="text-green-600 font-bold text-xl mx-2">"${correctItem.meaning}"</span>?`;
                correctAnswerVal = correctItem.word;
                qOptions = [correctItem.word, ...distractors.map(d => d.word)];
                break;
            case 4: 
                qText = `Nghe và chọn từ vựng đúng:`;
                audioWord = correctItem.word;
                correctAnswerVal = correctItem.word;
                qOptions = [correctItem.word, ...distractors.map(d => d.word)];
                break;
            case 5: 
                qText = `Nghe và chọn nghĩa đúng:`;
                audioWord = correctItem.word;
                correctAnswerVal = correctItem.meaning;
                qOptions = [correctItem.meaning, ...distractors.map(d => d.meaning)];
                break;
            case 6: 
                qTypeId = 6;
                qText = `Nghe câu và chọn nghĩa đúng:`;
                audioSentence = sentence;
                correctAnswerVal = `Tôi thích ${correctItem.meaning}.`; 
                const sentenceMeanings = [`Tôi thích ${correctItem.meaning}.`];
                while(sentenceMeanings.length < 4) {
                     const distractorItem = vocabList[Math.floor(Math.random() * vocabList.length)];
                     const distractorMeaning = `Tôi thích ${distractorItem.meaning}.`;
                     if (!sentenceMeanings.includes(distractorMeaning)) {
                         sentenceMeanings.push(distractorMeaning);
                     }
                }
                qOptions = sentenceMeanings;
                break;
            case 7: 
                qTypeId = 7;
                qText = `Nghe và viết lại câu tiếng Trung:`;
                audioSentence = sentence;
                correctAnswerVal = sentence;
                qOptions = []; 
                break;
        }
        
        const shuffledOptions = shuffleArray(qOptions);
        
        if (qTypeId === 7) {
            questions.push({
                type: 'arena_input', 
                qTypeId: type,
                text: qText,
                audioSentence: audioSentence,
                correct: correctAnswerVal 
            });
        } else {
            questions.push({
                type: 'arena_quiz',
                qTypeId: type,
                text: qText,
                options: shuffledOptions,
                correct: shuffledOptions.indexOf(correctAnswerVal),
                audioWord: audioWord,
                audioSentence: audioSentence 
            });
        }
    }
    return questions;
};

export const parseFileContent = (text: string, qType: string, vocabList: VocabularyItem[]): Question[] => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const newQuestions: Question[] = [];

  lines.forEach(line => {
      try {
          switch (qType) {
              case 'vocab_mcq':
              case 'listen_mcq':
                  const parts_v = line.split('|');
                  if (parts_v.length < 3) return;
                  const [word, pinyin, meaning] = parts_v.map(p => p.trim());
                  
                  // Helper to get distractors
                  const getDistractors = (correctValue: string, field: keyof VocabularyItem) => {
                      const distractors: string[] = [];
                      const candidates = shuffleArray([...vocabList]);
                      for (const item of candidates) {
                          const value = item[field];
                          if (value !== correctValue && distractors.length < 3 && !distractors.includes(value)) {
                              distractors.push(value);
                          }
                          if (distractors.length === 3) break;
                      }
                      while (distractors.length < 3) distractors.push(`[Distractor ${distractors.length + 1}]`);
                      return distractors;
                  };

                  if (qType === 'vocab_mcq') {
                      const meaningDistractors = getDistractors(meaning, 'meaning');
                      const optionsM = shuffleArray([meaning, ...meaningDistractors]);
                      newQuestions.push({
                          type: 'mcq',
                          text: `Nghĩa của từ **${word}** là gì?`,
                          options: optionsM,
                          correct: optionsM.indexOf(meaning)
                      });

                      const pinyinDistractors = getDistractors(pinyin, 'pinyin');
                      const optionsP = shuffleArray([pinyin, ...pinyinDistractors]);
                      newQuestions.push({
                          type: 'mcq',
                          text: `Pinyin của từ **${word}** là gì?`,
                          options: optionsP,
                          correct: optionsP.indexOf(pinyin)
                      });
                  }

                  if (qType === 'listen_mcq') {
                      const meaningDistractors_L = getDistractors(meaning, 'meaning');
                      const optionsLM = shuffleArray([meaning, ...meaningDistractors_L]);
                      newQuestions.push({
                          type: 'listen_mcq',
                          audioText: word,
                          text: `Nghe từ "**${word}**" và chọn nghĩa đúng:`,
                          options: optionsLM,
                          correct: optionsLM.indexOf(meaning)
                      });
                  }
                  break;

              case 'fib':
                  const match_fib = line.match(/\|([^|]+)\|/);
                  if (!match_fib) return;
                  const answerFib = match_fib[1].trim();
                  const textFib = line.replace(/\|[^|]+\|/, '[BLANK]').trim();
                  newQuestions.push({
                      type: 'fib',
                      text: textFib,
                      answer: answerFib
                  });
                  break;

              case 'jumble':
                  const words = line.split(/\s+/).filter(w => w.length > 0);
                  if (words.length < 2) return;
                  newQuestions.push({
                      type: 'jumble',
                      text: "Sắp xếp các từ thành câu đúng:",
                      answer: words
                  });
                  break;

              case 'translation':
                  const parts_t = line.split('|');
                  if (parts_t.length < 2) return;
                  const [chinese_t, vietnamese_t] = parts_t.map(p => p.trim());
                  newQuestions.push({
                      type: 'translation',
                      vietnamese: vietnamese_t,
                      chinese: chinese_t,
                      text: vietnamese_t
                  });
                  break;

              case 'listen_translate':
                  const parts_lt = line.split('|');
                  if (parts_lt.length < 2) return;
                  const [chinese_lt, vietnamese_lt] = parts_lt.map(p => p.trim());
                  newQuestions.push({
                      type: 'listen_translate',
                      audioText: chinese_lt,
                      answer: vietnamese_lt,
                      text: "Nghe câu tiếng Trung và dịch sang tiếng Việt." 
                  });
                  break;

              case 'listen_write':
                  const parts_lw = line.split('|');
                  if (parts_lw.length < 2) return;
                  const [chinese_lw, vietnamese_lw] = parts_lw.map(p => p.trim());
                  newQuestions.push({
                      type: 'listen_write',
                      audioText: chinese_lw,
                      answer: chinese_lw,
                      text: "Nghe câu tiếng Trung và viết lại." 
                  });
                  break;
          }
      } catch (e) {
          console.warn('Parse error', e);
      }
  });
  return newQuestions;
};
