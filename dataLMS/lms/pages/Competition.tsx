
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { db, getPath, getRef } from '../services/firebase';
import { addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Match, Question } from '../types';
import { generateRoomCode, generateArenaQuestions, speakWord } from '../utils/helpers';
import { Swords, Volume2, Send } from 'lucide-react';

export const Competition: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { vocabulary } = useData();
  const [match, setMatch] = useState<Match | null>(null);
  const [mode, setMode] = useState<'lobby' | 'join' | 'waiting' | 'playing'>('lobby');
  const [joinCode, setJoinCode] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Ref to track if we need to auto-play audio
  const prevQIndex = useRef(-1);

  // Match Listener
  useEffect(() => {
    let unsub = () => {};
    
    const setupListener = async () => {
       const q1 = query(getRef('matches'), where('player1.uid', '==', user?.uid));
       const q2 = query(getRef('matches'), where('player2.uid', '==', user?.uid));
       
       const snap1 = await getDocs(q1);
       const snap2 = await getDocs(q2);
       
       // Find any match that is NOT finished
       const activeDoc = [...snap1.docs, ...snap2.docs].find(d => d.data().status !== 'finished');
       
       if (activeDoc) {
          unsub = onSnapshot(doc(db, getPath('matches'), activeDoc.id), (docSnap) => {
             if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Match;
                setMatch(data);
                
                if (data.status === 'finished') {
                   // Clean up if needed, show result toast could go here
                   const isP1 = data.player1.uid === user?.uid;
                   const myScore = isP1 ? data.player1.score : (data.player2?.score || 0);
                   const oppScore = isP1 ? (data.player2?.score || 0) : data.player1.score;
                   
                   let msg = '';
                   if (myScore > oppScore) msg = `🏆 CHÚC MỪNG! Bạn thắng ${myScore} - ${oppScore}!`;
                   else if (myScore < oppScore) msg = `😭 Bạn thua ${myScore} - ${oppScore}.`;
                   else msg = `🤝 HÒA! ${myScore} - ${oppScore}.`;
                   
                   alert(msg); // Simple alert for now, toast preferred in real app

                   setMode('lobby');
                   setMatch(null);
                   if (data.finishedBy === user?.uid) {
                     deleteDoc(doc(db, getPath('matches'), data.id));
                   }
                } else {
                   setMode(data.status);
                   // Reset answered state if question changed
                   if (data.qIndex !== prevQIndex.current) {
                        setHasAnswered(false);
                        setInputValue('');
                        const q = data.questions[data.qIndex];
                        const audio = q.audioWord || q.audioSentence;
                        if (audio) {
                            setTimeout(() => speakWord(audio), 500);
                        }
                        prevQIndex.current = data.qIndex;
                   }
                }
             } else {
                setMatch(null);
                setMode('lobby');
             }
          });
       }
    };

    if (user) setupListener();
    return () => unsub();
  }, [user]);

  const handleCreate = async () => {
    if (vocabulary.length < 4) return alert("Cần ít nhất 4 từ vựng để tạo phòng.");
    const questions = generateArenaQuestions(vocabulary);
    const roomCode = generateRoomCode();
    await addDoc(getRef('matches'), {
      roomCode,
      player1: { uid: user?.uid, name: userProfile?.name, score: 0 },
      player2: null,
      status: 'waiting',
      questions,
      qIndex: 0,
      createdAt: serverTimestamp()
    });
  };

  const handleJoin = async () => {
    if (joinCode.length !== 6) return alert("Mã 6 ký tự");
    const snap = await getDocs(query(getRef('matches'), where('roomCode', '==', joinCode.toUpperCase()), where('status', '==', 'waiting')));
    if (snap.empty) return alert("Phòng không tồn tại hoặc đã đầy");
    
    const matchDoc = snap.docs[0];
    if (matchDoc.data().player1.uid === user?.uid) return alert("Bạn đã ở trong phòng này");
    
    await updateDoc(doc(db, getPath('matches'), matchDoc.id), {
      player2: { uid: user?.uid, name: userProfile?.name, score: 0 }
    });
  };

  const handleStart = async () => {
    if (match) await updateDoc(doc(db, getPath('matches'), match.id), { status: 'playing', startTime: serverTimestamp() });
  };

  const handleAnswerAttempt = async (userAnswerVal: any) => {
     if (!match || hasAnswered) return;
     setHasAnswered(true);

     const currentQ = match.questions[match.qIndex];
     
     let isCorrect = false;
     
     if (currentQ.type === 'arena_input') {
         isCorrect = (typeof userAnswerVal === 'string' && typeof currentQ.correct === 'string') 
            && userAnswerVal.trim().toLowerCase() === currentQ.correct.trim().toLowerCase();
     } else {
         isCorrect = userAnswerVal === currentQ.correct;
     }
     
     if (isCorrect) {
        try {
            await runTransaction(db, async (transaction) => {
                const mRef = doc(db, getPath('matches'), match.id);
                const mDoc = await transaction.get(mRef);
                if (!mDoc.exists()) return;
                
                const mData = mDoc.data() as Match;
                if (mData.qIndex !== match.qIndex) return; 

                const isP1 = mData.player1.uid === user?.uid;
                const newScore = (isP1 ? mData.player1.score : (mData.player2?.score || 0)) + 10;
                
                const updates: any = {};
                if (isP1) updates['player1.score'] = newScore;
                else updates['player2.score'] = newScore;
                
                if (mData.qIndex < mData.questions.length - 1) {
                    updates.qIndex = mData.qIndex + 1;
                } else {
                    updates.status = 'finished';
                    updates.finishedBy = user?.uid;
                    updates.winnerScore = newScore;
                }
                transaction.update(mRef, updates);
            });
        } catch(e) {
            console.error(e);
        }
     } else {
         // Wrong answer logic - In original app it just locks out and waits
         // We essentially wait for the other player to answer correctly to advance the qIndex
         // Or if time runs out (not implemented here, but simple lockout works for prototype)
     }
  };

  if (mode === 'lobby') {
    return (
      <div className="text-center py-12 bg-white rounded-3xl shadow-xl max-w-2xl mx-auto fade-in">
         <div className="inline-block p-6 bg-purple-100 rounded-full mb-6">
            <Swords className="w-16 h-16 text-purple-600" />
         </div>
         <h2 className="text-3xl font-bold text-slate-800 mb-6">Đấu trường Từ vựng</h2>
         <p className="text-slate-500 mb-6">Từ vựng hiện có: {vocabulary.length}</p>
         <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
            <button onClick={handleCreate} className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 shadow-lg transform transition hover:-translate-y-1">Tạo Phòng Mới</button>
            <button onClick={() => setMode('join')} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-lg transform transition hover:-translate-y-1">Tham Gia Phòng</button>
         </div>
      </div>
    );
  }

  if (mode === 'join') {
     return (
       <div className="max-w-sm mx-auto bg-white p-8 rounded-2xl shadow-xl text-center fade-in">
          <h3 className="text-2xl font-bold mb-6 text-slate-700">Nhập Mã Phòng</h3>
          <input 
            value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            className="w-full p-4 border-2 rounded-xl text-center text-xl font-bold tracking-widest uppercase mb-4 focus:border-blue-500" 
            placeholder="CODE" maxLength={6}
          />
          <button onClick={handleJoin} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mb-4 hover:bg-blue-700">Tham Gia</button>
          <button onClick={() => setMode('lobby')} className="text-slate-500 hover:text-slate-700">Quay lại</button>
       </div>
     );
  }

  if (mode === 'waiting' && match) {
     const p1Name = match.player1.name;
     const p2Name = match.player2 ? match.player2.name : '...';
     
     return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl text-center fade-in">
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Phòng chờ: <span className="text-purple-600">{match.roomCode}</span></h3>
            <p className="text-slate-500 mb-8">Chia sẻ mã này cho đối thủ</p>
            <div className="flex justify-center gap-8 mb-8 mt-8 items-center">
               <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">{p1Name.charAt(0)}</div>
                  <p className="font-bold text-blue-700 truncate w-24">{p1Name}</p>
               </div>
               <div className="font-bold text-slate-300 text-xl">VS</div>
               <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 ${match.player2 ? 'bg-red-500' : 'bg-slate-200'}`}>
                    {match.player2 ? p2Name.charAt(0) : '?'}
                  </div>
                  <p className={`font-bold truncate w-24 ${match.player2 ? 'text-red-700' : 'text-slate-400'}`}>{match.player2 ? p2Name : 'Đang chờ'}</p>
               </div>
            </div>
            {match.player1.uid === user?.uid && match.player2 && (
               <button onClick={handleStart} className="bg-green-600 text-white py-3 px-8 rounded-xl font-bold text-lg animate-pulse shadow-lg">Bắt đầu ngay</button>
            )}
            {!match.player2 && <p className="text-slate-500">Đang chờ đối thủ...</p>}
            
            {/* Cancel/Leave button logic is simple delete or reset */}
            {!match.player2 && match.player1.uid === user?.uid && (
                <button onClick={() => deleteDoc(doc(db, getPath('matches'), match.id))} className="block mx-auto mt-4 text-red-500 text-sm">Hủy phòng</button>
            )}
        </div>
     );
  }

  if (mode === 'playing' && match) {
     const currentQ = match.questions[match.qIndex];
     const audio = currentQ.audioWord || currentQ.audioSentence;
     
     // Specific Rendering for Arena Quiz
     return (
        <div className="max-w-4xl mx-auto fade-in">
           {/* Header Scores */}
           <div className="flex justify-between items-center mb-8">
               <div className={`bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 md:gap-3 flex-1 mr-2 ${match.player1.score > (match.player2?.score || 0) ? 'scale-105 ring-4 ring-blue-300 z-10' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">{match.player1.name.charAt(0)}</div>
                  <div className="truncate">
                      <p className="text-xs md:text-sm opacity-80 truncate">{match.player1.name}</p>
                      <p className="text-2xl md:text-3xl font-bold">{match.player1.score}</p>
                  </div>
               </div>
               
               <div className="text-xl font-extrabold text-slate-400 mx-2">VS</div>
               
               <div className={`bg-red-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl shadow-lg text-right transition-all duration-300 flex items-center gap-2 md:gap-3 flex-1 ml-2 ${match.player2 && match.player2.score > match.player1.score ? 'scale-105 ring-4 ring-red-300 z-10' : ''}`}>
                  <div className="truncate flex-1">
                      <p className="text-xs md:text-sm opacity-80 truncate">{match.player2?.name}</p>
                      <p className="text-2xl md:text-3xl font-bold">{match.player2?.score}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white text-red-500 flex items-center justify-center font-bold text-sm flex-shrink-0">{match.player2?.name.charAt(0) || '?'}</div>
               </div>
           </div>

           {/* Question Card */}
           <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl text-center border-b-8 border-slate-200">
               <div className="mb-4 md:mb-6">
                   <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold uppercase">Câu hỏi {match.qIndex + 1}/{match.questions.length}</span>
               </div>
               
               {/* Audio Button */}
               {audio && (
                   <button onClick={() => speakWord(audio)} disabled={hasAnswered} className={`mb-4 inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-6 py-3 rounded-full font-bold hover:bg-purple-200 transition text-sm md:text-base ${hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}>
                       <Volume2 size={20} /> Nghe âm thanh
                   </button>
               )}

               <h2 className="text-xl md:text-3xl font-medium text-slate-700 mb-6 md:mb-8 leading-relaxed min-h-[3rem] flex items-center justify-center" dangerouslySetInnerHTML={{__html: currentQ.text}}></h2>

               {currentQ.type === 'arena_input' ? (
                   <div className="text-center mt-4 md:mt-6">
                       <input 
                           type="text" 
                           value={inputValue}
                           onChange={e => setInputValue(e.target.value)}
                           disabled={hasAnswered}
                           className={`w-full max-w-xl p-3 md:p-4 text-lg md:text-xl border-2 rounded-xl outline-none text-center font-bold ${hasAnswered ? (inputValue.trim().toLowerCase() === String(currentQ.correct).trim().toLowerCase() ? 'bg-green-100 border-green-600' : 'bg-red-100 border-red-600') : 'border-slate-300 focus:border-blue-500'}`}
                           placeholder="Nhập câu tiếng Trung..." 
                       />
                       <button 
                           onClick={() => handleAnswerAttempt(inputValue)}
                           disabled={hasAnswered}
                           className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition text-sm md:text-base disabled:opacity-50"
                       >
                           <Send size={20} className="inline-block mr-1" /> Trả lời
                       </button>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                       {currentQ.options?.map((opt, idx) => (
                           <button 
                               key={idx}
                               onClick={() => handleAnswerAttempt(idx)}
                               disabled={hasAnswered}
                               className={`p-4 md:p-6 border-2 rounded-2xl text-base md:text-xl font-bold transition-all transform active:scale-95 ${hasAnswered ? (idx === currentQ.correct ? 'bg-green-500 text-white border-green-600' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-50') : 'bg-slate-50 border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-slate-700'}`}
                           >
                               {opt}
                           </button>
                       ))}
                   </div>
               )}
           </div>
        </div>
     );
  }

  return <div>Loading...</div>;
};
