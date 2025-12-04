
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { BookOpen, CheckCircle, PlusCircle, Trash2, Eye, ArrowRight, ArrowLeft, Send, Shuffle, PlusSquare, X, AlertTriangle } from 'lucide-react';
import { deleteDoc, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, getPath, getRef } from '../services/firebase';
import { Assignment, Question, Submission } from '../types';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { QuestionForm } from '../components/QuestionForm';
import { shuffleArray } from '../utils/helpers';

export const Assignments: React.FC = () => {
  const { assignments, submissions, classes, questionBanks } = useData();
  const { userProfile, user } = useAuth();
  const location = useLocation();
  
  // UI States
  const [view, setView] = useState<'list' | 'create' | 'take' | 'review'>('list');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  
  // Create/Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  // Bank Import State
  const [isSelectingBank, setIsSelectingBank] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [randomCount, setRandomCount] = useState(10);

  // Take State
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Computed
  const isTeacher = userProfile?.role === 'teacher';
  const activeAssignment = assignments.find(a => a.id === activeAssignmentId);
  const mySubmission = activeAssignment ? submissions.find(s => s.assignmentId === activeAssignment.id && s.studentId === user?.uid) : null;

  // Handlers - Defined BEFORE usage in useEffect
  const startEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setNewTitle(assignment.title);
    // Deep copy questions to avoid mutating state directly
    setNewQuestions(JSON.parse(JSON.stringify(assignment.questions)));
    setSelectedClasses(assignment.classIds || []);
    setView('create');
  };

  // Handle Navigation State from other pages (e.g., Classes)
  useEffect(() => {
      if (location.state) {
          const { createForClass, classTitle, editAssignment } = location.state as any;
          if (createForClass) {
              setNewTitle(`Bài tập cho lớp ${classTitle}`);
              setSelectedClasses([createForClass]);
              setView('create');
          } else if (editAssignment) {
              startEdit(editAssignment);
          }
          // Clear state to prevent re-triggering
          window.history.replaceState({}, document.title);
      }
  }, [location.state]);

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, getPath('assignments'), deleteId));
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewQuestions([]);
    setSelectedClasses([]);
    setEditingId(null);
    setView('list');
  };

  const startCreate = () => {
    setNewTitle('');
    setNewQuestions([]);
    setSelectedClasses([]);
    setEditingId(null);
    setView('create');
  };

  const handlePublish = async () => {
    if (!newTitle || newQuestions.length === 0 || selectedClasses.length === 0) return alert('Thiếu thông tin');
    
    const assignmentData = {
      title: newTitle,
      questions: newQuestions,
      classIds: selectedClasses,
      updatedAt: serverTimestamp()
    };

    if (editingId) {
        await updateDoc(doc(db, getPath('assignments'), editingId), assignmentData);
    } else {
        await addDoc(getRef('assignments'), {
            ...assignmentData,
            createdBy: user?.uid,
            createdAt: serverTimestamp()
        });
    }
    
    resetForm();
  };

  const handleBankImport = () => {
      const bank = questionBanks.find(b => b.id === selectedBankId);
      if (!bank) return;
      
      // Filter out existing
      const candidates = bank.questions.filter(q => 
          !newQuestions.some(nq => JSON.stringify(nq) === JSON.stringify(q))
      );
      
      const toAdd = shuffleArray(candidates).slice(0, randomCount);
      setNewQuestions([...newQuestions, ...toAdd]);
      setIsSelectingBank(false); setSelectedBankId(null);
  }

  const handleSubmit = async () => {
    if (!activeAssignment) return;
    let score = 0;
    const scorePerQ = 100 / activeAssignment.questions.length;
    
    // Store extra data for randomization reproduction
    const questionData: Record<number, any> = {};

    activeAssignment.questions.forEach((q, i) => {
       const ans = answers[i];
       let isCorrect = false;

       if (q.type === 'mcq' || q.type === 'listen_mcq') {
          isCorrect = ans === q.correct;
       } else if (q.type === 'jumble') {
           if (Array.isArray(ans) && Array.isArray(q.answer) && ans.join(' ') === q.answer.join(' ')) isCorrect = true;
           questionData[i] = { shuffledWords: q.shuffledWords }; // Store state
       } else if (q.type === 'match') {
           // Simplified strict match check
           const colB = q.shuffledColB || [];
           const pairs = q.pairs || [];
           let correctPairs = 0;
           pairs.forEach((p, aIdx) => {
               const bIdx = ans?.[aIdx];
               if (bIdx !== undefined && colB[bIdx] === p.b) correctPairs++;
           });
           if (correctPairs === pairs.length) isCorrect = true;
           questionData[i] = { shuffledColB: q.shuffledColB };
       } else {
           if (typeof ans === 'string' && typeof q.answer === 'string' && ans.trim().toLowerCase() === q.answer.trim().toLowerCase()) isCorrect = true;
           if (q.type === 'translation' && typeof ans === 'string' && typeof q.chinese === 'string' && ans.trim() === q.chinese.trim()) isCorrect = true;
       }
       
       if (isCorrect) score += scorePerQ;
    });

    const finalScore = Math.round(score);
    await addDoc(getRef('submissions'), {
       assignmentId: activeAssignment.id,
       studentId: user?.uid,
       score: finalScore,
       answers,
       questionData,
       createdAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, getPath('users'), user!.uid), {
        points: (userProfile?.points || 0) + finalScore
    });

    setView('list');
  };

  // Pre-process questions for taking (shuffling)
  const startTakeAssignment = (assignId: string) => {
      const assign = assignments.find(a => a.id === assignId);
      if (assign) {
          // Shuffle Jumble and Match once at start
          assign.questions.forEach(q => {
              if (q.type === 'jumble' && !q.shuffledWords && Array.isArray(q.answer)) {
                  q.shuffledWords = shuffleArray([...q.answer]);
              }
              if (q.type === 'match' && !q.shuffledColB && q.pairs) {
                  q.shuffledColB = shuffleArray(q.pairs.map(p => p.b));
              }
          });
          setActiveAssignmentId(assignId);
          setAnswers({});
          setCurrentQIndex(0);
          setView('take');
      }
  }

  // Delete Modal Component
  const DeleteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center fade-in">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
            </div>
            <p className="font-bold text-lg mb-2 text-slate-800">Xác nhận xóa bài tập</p>
            <p className="text-slate-600 mb-6 text-sm">Hành động này không thể hoàn tác. Bạn có chắc chắn không?</p>
            <div className="flex gap-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition">Hủy</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">Xóa</button>
            </div>
        </div>
    </div>
  );

  // Render Views
  if (view === 'create') {
    if (isSelectingBank) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-lg fade-in max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h3 className="text-xl font-bold text-yellow-600">Chọn Ngân hàng đề</h3>
                    <button onClick={() => setIsSelectingBank(false)} className="text-slate-500 hover:text-red-500"><X /></button>
                </div>
                {!selectedBankId ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {questionBanks.filter(b => b.createdBy === user?.uid).map(bank => (
                            <button key={bank.id} onClick={() => setSelectedBankId(bank.id)} className="p-4 rounded-xl shadow-md border border-slate-200 hover:bg-yellow-50 text-left transition">
                                <p className="font-bold text-slate-800">{bank.title}</p>
                                <p className="text-sm text-slate-500">{bank.questions.length} câu hỏi</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl flex items-center justify-between">
                            <div>
                                <label className="font-bold text-blue-700 block mb-2">Lấy ngẫu nhiên:</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" value={randomCount} onChange={e => setRandomCount(Number(e.target.value))} className="w-20 p-2 border rounded-lg text-center" />
                                    <span className="text-slate-600 text-sm">câu hỏi</span>
                                </div>
                            </div>
                            <button onClick={handleBankImport} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                <Shuffle size={18} /> Thêm ngẫu nhiên
                            </button>
                        </div>
                        <button onClick={() => setSelectedBankId(null)} className="text-sm text-slate-500 underline">Chọn ngân hàng khác</button>
                    </div>
                )}
            </div>
        )
    }

    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg fade-in max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h3 className="text-xl font-bold">{editingId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}</h3>
            <button onClick={resetForm} className="text-slate-500 hover:text-red-500"><X /></button>
        </div>
        
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full text-lg font-bold border-b-2 border-slate-200 p-2 mb-6 outline-none focus:border-blue-500" placeholder="Tiêu đề bài tập..." />
        
        <div className="mb-6 p-4 border border-green-300 rounded-xl bg-green-50">
          <h4 className="font-bold text-green-800 mb-3">Chọn Lớp học để giao bài (Bắt buộc)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {classes.filter(c => c.teacherId === user?.uid).map(c => (
              <label key={c.id} className={`flex items-center p-2 border rounded-lg cursor-pointer transition ${selectedClasses.includes(c.id) ? 'bg-green-600 text-white border-green-700' : 'bg-white hover:bg-green-100'}`}>
                <input type="checkbox" className="hidden" checked={selectedClasses.includes(c.id)} onChange={e => {
                  if (e.target.checked) setSelectedClasses([...selectedClasses, c.id]);
                  else setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                }} />
                <span>{c.title} <span className={`text-xs font-bold ${selectedClasses.includes(c.id) ? 'text-green-200' : 'text-slate-500'}`}>({c.classCode})</span></span>
              </label>
            ))}
          </div>
        </div>

        <h4 className="text-lg font-bold text-slate-800 mb-3">Danh sách câu hỏi ({newQuestions.length})</h4>
        <div className="space-y-2 mb-6 max-h-96 overflow-y-auto border p-4 rounded-xl bg-slate-50 custom-scrollbar">
          {newQuestions.map((q, i) => (
             <div key={i} className="bg-white p-3 border rounded-xl flex justify-between items-center shadow-sm">
                <div>
                    <span className="text-xs font-bold text-blue-600 uppercase mr-2">{q.type}</span>
                    <span className="text-sm font-medium">{q.text || q.vietnamese}</span>
                </div>
                <button onClick={() => setNewQuestions(newQuestions.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition"><Trash2 size={18}/></button>
             </div>
          ))}
          {newQuestions.length === 0 && <p className="text-slate-400 text-center py-4">Chưa có câu hỏi nào.</p>}
        </div>

        <div className="mb-6">
            <button onClick={() => setIsSelectingBank(true)} className="w-full bg-yellow-100 text-yellow-700 py-3 rounded-xl font-bold border border-yellow-300 hover:bg-yellow-200 transition flex items-center justify-center gap-2">
                <PlusSquare size={18} /> Lấy câu hỏi từ Ngân hàng đề
            </button>
        </div>

        <QuestionForm onAdd={q => setNewQuestions([...newQuestions, q])} />

        <button onClick={handlePublish} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">
            {editingId ? 'Lưu thay đổi' : 'Xuất bản bài tập'}
        </button>
      </div>
    );
  }

  if (view === 'take' && activeAssignment) {
    const currentQ = activeAssignment.questions[currentQIndex];
    const isFirst = currentQIndex === 0;
    const isLast = currentQIndex === activeAssignment.questions.length - 1;

    return (
      <div className="max-w-3xl mx-auto bg-white p-4 md:p-8 rounded-2xl shadow-lg fade-in">
         <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <h3 className="text-xl md:text-2xl font-bold truncate">{activeAssignment.title}</h3>
            <button onClick={() => setView('list')} className="text-slate-400 hover:text-red-500"><X /></button>
         </div>
         
         <div className="text-center mb-6">
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold text-sm">Câu hỏi {currentQIndex + 1} / {activeAssignment.questions.length}</span>
         </div>
         
         <QuestionDisplay 
            key={currentQIndex}
            question={currentQ} 
            index={currentQIndex}
            userAnswer={answers[currentQIndex]}
            onAnswer={(val) => setAnswers({ ...answers, [currentQIndex]: val })}
         />

         <div className="flex justify-between mt-8 pt-6 border-t">
            <button 
              disabled={isFirst} 
              onClick={() => setCurrentQIndex(currentQIndex - 1)}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft size={20} /> Lùi
            </button>
            
            {isLast ? (
              <button onClick={handleSubmit} className="flex-1 ml-4 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg transition flex items-center justify-center gap-2">
                 <Send size={20} /> Nộp bài
              </button>
            ) : (
              <button onClick={() => setCurrentQIndex(currentQIndex + 1)} className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition">
                 Tiến <ArrowRight size={20} />
              </button>
            )}
         </div>
      </div>
    );
  }

  if (view === 'review' && activeAssignment && mySubmission) {
     return (
       <div className="max-w-3xl mx-auto bg-white p-4 md:p-8 rounded-2xl shadow-lg fade-in">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
             <h3 className="text-xl md:text-2xl font-bold truncate">Kết quả: {activeAssignment.title}</h3>
             <button onClick={() => setView('list')} className="text-slate-500 hover:text-red-500"><X size={20}/></button> 
          </div>
          <div className={`text-center p-6 rounded-xl mb-8 ${mySubmission.score >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
             <p className="text-sm font-bold uppercase mb-2">Điểm số của bạn:</p>
             <p className="text-6xl font-black">{mySubmission.score}<span className="text-3xl">/100</span></p>
             <p className="text-lg font-bold mt-2">{mySubmission.score >= 50 ? '🎉 Chúc mừng, bạn đã hoàn thành tốt!' : '😢 Cần cố gắng hơn.'}</p>
          </div>
          <h4 className="text-xl font-bold text-slate-700 mb-4">Chi tiết từng câu hỏi</h4>
          <div className="space-y-4">
             {activeAssignment.questions.map((q, i) => {
                // Merge randomization data back for correct review
                const reviewQ = { ...q };
                if (mySubmission.questionData?.[i]?.shuffledWords) reviewQ.shuffledWords = mySubmission.questionData[i].shuffledWords;
                if (mySubmission.questionData?.[i]?.shuffledColB) reviewQ.shuffledColB = mySubmission.questionData[i].shuffledColB;

                return (
                    <div key={i} className={`p-4 rounded-xl border mb-4 bg-slate-50`}>
                        <div className="font-bold text-slate-800 text-sm md:text-base mb-2">Câu {i+1}: {q.text || q.vietnamese}</div>
                        <QuestionDisplay 
                            question={reviewQ} 
                            index={i} 
                            userAnswer={mySubmission.answers[i]}
                            readOnly={true}
                            showResult={true}
                        />
                    </div>
                );
             })}
          </div>
       </div>
     );
  }

  // List View
  return (
    <div className="fade-in">
      {deleteId && <DeleteModal />}
      
      {isTeacher && (
        <button onClick={startCreate} className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-md flex items-center gap-2 text-sm md:text-base">
          <PlusCircle size={20} /> Tạo bài tập
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {assignments.map(a => {
           const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === user?.uid);
           
           // Get assigned classes titles
           const assignedClassTitles = a.classIds.map(classId => {
               const foundClass = classes.find(c => c.id === classId);
               return foundClass ? foundClass.title : 'Lớp đã xóa';
           }).join(', ');

           return (
            <div key={a.id} className="bg-white p-5 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><BookOpen size={20} /></div>
                {sub && <CheckCircle className="text-green-500 w-5 h-5" />}
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 truncate">{a.title}</h4>
              {/* Removed: <p className="text-slate-500 text-sm mb-4">{a.questions.length} câu hỏi</p> */}
              {isTeacher && (
                <p className="text-blue-500 text-xs mb-4 italic truncate">Giao cho: {assignedClassTitles || 'Chưa giao lớp nào'}</p>
              )}
              
              {!isTeacher ? (
                 sub ? (
                  <button onClick={() => { setActiveAssignmentId(a.id); setView('review'); }} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm">Xem kết quả ({sub.score}đ)</button>
                 ) : (
                  <button onClick={() => startTakeAssignment(a.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm">Làm bài</button>
                 )
              ) : (
                <div className="flex gap-2 text-sm font-medium">
                  <button onClick={() => startEdit(a)} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg flex items-center justify-center gap-1 transition"><Eye size={16} /> Xem/Sửa</button>
                  <button onClick={() => setDeleteId(a.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-1 transition"><Trash2 size={16} /> Xóa</button>
                </div>
              )}
            </div>
           );
        })}
        {assignments.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">Chưa có bài tập nào.</p>}
      </div>
    </div>
  );
};
