
import React from 'react';
import { Question } from '../types';
import { speakWord } from '../utils/helpers';
import { Volume2, X } from 'lucide-react';

interface QuestionDisplayProps {
  question: Question;
  index: number;
  userAnswer?: any;
  onAnswer?: (val: any) => void;
  readOnly?: boolean;
  showResult?: boolean; // For review mode
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ 
  question, index, userAnswer, onAnswer, readOnly, showResult 
}) => {
  const audioText = question.audioText || question.audioWord || question.audioSentence;
  const isCorrect = showResult && JSON.stringify(userAnswer) === JSON.stringify(question.correct || question.answer);
  
  // Helper for Jumble
  const getJumbleState = () => {
    if (Array.isArray(userAnswer)) return userAnswer;
    return [];
  };

  const renderContent = () => {
    switch (question.type) {
      case 'mcq':
      case 'listen_mcq':
      case 'arena_quiz':
        return (
          <div className="space-y-3">
            {question.options?.map((opt, oIdx) => {
               let btnClass = "w-full text-left p-3 md:p-4 border-2 rounded-xl transition-colors font-medium ";
               if (showResult) {
                 if (oIdx === question.correct) btnClass += "bg-green-100 border-green-500 text-green-700 ";
                 else if (userAnswer === oIdx) btnClass += "bg-red-100 border-red-500 text-red-700 ";
                 else btnClass += "bg-white border-slate-200 opacity-60 ";
               } else {
                 if (userAnswer === oIdx) btnClass += "bg-blue-600 text-white border-blue-600 shadow-md ";
                 else btnClass += "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 ";
               }

               return (
                <button 
                  key={oIdx}
                  disabled={readOnly}
                  onClick={() => onAnswer && onAnswer(oIdx)} 
                  className={btnClass}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                </button>
               );
            })}
          </div>
        );

      case 'fib':
      case 'translation':
      case 'listen_write':
      case 'listen_translate':
      case 'arena_input':
        const placeholder = {
          fib: 'Nhập từ còn thiếu...',
          translation: 'Nhập câu tiếng Trung...',
          listen_write: 'Nhập câu tiếng Trung đã nghe...',
          listen_translate: 'Nhập bản dịch tiếng Việt...',
          arena_input: 'Nhập câu trả lời...'
        }[question.type] || 'Nhập câu trả lời...';
        
        const displayCorrect = showResult && (
             <div className="mt-2 text-green-600 font-bold">
               Đáp án đúng: {question.type === 'translation' ? question.chinese : question.answer}
             </div>
        );

        return (
          <div className="text-center mt-6">
            <input 
              type="text" 
              disabled={readOnly}
              value={userAnswer || ''}
              onChange={e => onAnswer && onAnswer(e.target.value)}
              className={`w-full max-w-lg p-3 md:p-4 text-lg border-2 rounded-xl outline-none text-center font-bold ${showResult ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-slate-300 focus:border-blue-500'}`}
              placeholder={placeholder}
            />
            {displayCorrect}
          </div>
        );

      case 'jumble':
        const availableWords = question.shuffledWords || (Array.isArray(question.answer) ? [...question.answer].sort(() => Math.random() - 0.5) : []);
        const placedWords = getJumbleState();
        
        // Words remaining to be placed
        const remainingWords = availableWords.filter(word => {
            const availableCount = availableWords.filter(w => w === word).length;
            const placedCount = placedWords.filter(w => w === word).length;
            return placedCount < availableCount;
        });

        const jumbleCorrectDisplay = showResult && (
          <div className="mt-2 text-green-600 font-bold">
            Câu đúng: {Array.isArray(question.answer) ? question.answer.join(' ') : question.answer}
          </div>
        );

        return (
          <div>
            <div className={`mb-6 p-3 md:p-4 border-2 border-dashed rounded-xl min-h-[5rem] flex flex-wrap items-center gap-2 ${showResult ? 'border-slate-300' : 'border-blue-300 bg-blue-50'}`}>
                {placedWords.map((word: string, wIdx: number) => (
                    <button 
                        key={wIdx}
                        disabled={readOnly && !showResult} // Allow reviewing but not changing if readonly
                        onClick={() => {
                           if (!readOnly) {
                             const newOrder = [...placedWords];
                             newOrder.splice(wIdx, 1);
                             onAnswer && onAnswer(newOrder);
                           }
                        }}
                        className="jumble-word bg-blue-600 text-white px-3 py-1 rounded-lg shadow-md flex items-center gap-1 !text-white hover:!bg-blue-700 active:scale-95"
                    >
                        {word} {!readOnly && <X size={12} />}
                    </button>
                ))}
                {placedWords.length === 0 && !readOnly && <span className="text-slate-500 italic text-sm">Nhấn vào từ bên dưới để sắp xếp</span>}
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2 justify-center p-4 bg-slate-100 rounded-xl">
                  {remainingWords.map((word, i) => (
                      <button 
                          key={i}
                          onClick={() => onAnswer && onAnswer([...placedWords, word])}
                          className="jumble-word"
                      >
                          {word}
                      </button>
                  ))}
              </div>
            )}
            {jumbleCorrectDisplay}
          </div>
        );
      
      case 'match':
        const colA = question.pairs?.map(p => p.a) || [];
        const colB = question.shuffledColB || question.pairs?.map(p => p.b) || [];
        const currentMatches = userAnswer || {};

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <h4 className="font-bold text-slate-700 mb-2 text-lg">Cột A</h4>
               <div className="space-y-3">
                 {colA.map((textA, idx) => (
                   <div key={idx} className="p-3 bg-blue-100 border border-blue-200 rounded-xl text-blue-800 font-medium text-base">{textA}</div>
                 ))}
               </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-2 text-lg">Cột B (Ghép nối)</h4>
              <div className="space-y-3">
                 {colA.map((_, aIdx) => (
                   <select 
                     key={aIdx}
                     disabled={readOnly}
                     value={currentMatches[aIdx] === undefined ? "" : currentMatches[aIdx]}
                     onChange={(e) => {
                       const val = e.target.value;
                       const newMatches = { ...currentMatches };
                       if (val === "") delete newMatches[aIdx];
                       else {
                         const bIdx = parseInt(val);
                         // Remove previous selection of this bIdx to enforce 1-to-1
                         Object.keys(newMatches).forEach(k => {
                           if (newMatches[parseInt(k)] === bIdx && parseInt(k) !== aIdx) delete newMatches[parseInt(k)];
                         });
                         newMatches[aIdx] = bIdx;
                       }
                       onAnswer && onAnswer(newMatches);
                     }}
                     className="w-full p-3 border-2 rounded-xl bg-white appearance-none focus:border-green-500 transition cursor-pointer text-base font-medium"
                   >
                     <option value="">-- Chọn đáp án --</option>
                     {colB.map((textB, bIdx) => (
                       <option key={bIdx} value={bIdx}>{textB}</option>
                     ))}
                   </select>
                 ))}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  const headerText = question.text 
    ? question.text.replace('[BLANK]', '<span class="text-blue-600 font-bold">______</span>')
    : (question.vietnamese || '');

  return (
    <div className="mb-8 text-center fade-in">
       <div className="text-xl md:text-2xl font-bold text-slate-800 mb-4 leading-relaxed" dangerouslySetInnerHTML={{__html: headerText}}></div>
       {audioText && (
         <button onClick={() => speakWord(audioText)} className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-bold hover:bg-purple-200 transition text-sm mb-4">
           <Volume2 size={18} /> Nghe lại
         </button>
       )}
       <div className="text-left">
         {renderContent()}
       </div>
    </div>
  );
};
