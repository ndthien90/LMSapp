
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { db, getPath, getRef } from '../services/firebase';
import { addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { QuestionBank as QBankType, Question } from '../types';
import { QuestionForm } from '../components/QuestionForm';
import { parseFileContent } from '../utils/helpers';
import { PlusCircle, Library, Trash2, Eye, FileText, Upload, Save, X } from 'lucide-react';

export const QuestionBank: React.FC = () => {
  const { questionBanks, vocabulary } = useData();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  
  // Import Modal State
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState('vocab_mcq');

  const myBanks = questionBanks.filter(b => b.createdBy === user?.uid);

  const startCreate = () => {
    setMode('create');
    setEditTitle('');
    setEditQuestions([]);
    setSelectedBankId(null);
  };

  const startEdit = (bank: QBankType) => {
    setMode('edit');
    setSelectedBankId(bank.id);
    setEditTitle(bank.title);
    setEditQuestions([...bank.questions]);
  };

  const handleSave = async () => {
    if (!editTitle || editQuestions.length === 0) return alert("Nhập tiêu đề và ít nhất 1 câu hỏi");
    
    const data = {
      title: editTitle,
      questions: editQuestions,
      updatedAt: serverTimestamp()
    };

    if (mode === 'create') {
      await addDoc(getRef('question_banks'), { ...data, createdBy: user?.uid, createdAt: serverTimestamp() });
    } else if (selectedBankId) {
      await updateDoc(doc(db, getPath('question_banks'), selectedBankId), data);
    }
    setMode('list');
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa ngân hàng đề này?")) await deleteDoc(doc(db, getPath('question_banks'), id));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseFileContent(text, importType, vocabulary);
      if (parsed.length > 0) {
        setEditQuestions([...editQuestions, ...parsed]);
        setIsImporting(false);
      } else {
        alert("Không tìm thấy dữ liệu hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  const ImportModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">Nhập từ File TXT</h3>
        <select value={importType} onChange={e => setImportType(e.target.value)} className="w-full p-2 border rounded mb-4">
          <option value="vocab_mcq">1. Từ vựng (Tạo MCQ)</option>
          <option value="listen_mcq">2. Nghe - Chọn nghĩa</option>
          <option value="fib">3. Điền từ (FIB)</option>
          <option value="jumble">4. Xếp từ (Jumble)</option>
          <option value="translation">5. Dịch câu</option>
        </select>
        <input type="file" accept=".txt" onChange={handleImportFile} className="w-full border rounded p-2 mb-4" />
        <button onClick={() => setIsImporting(false)} className="text-slate-500 w-full">Hủy</button>
      </div>
    </div>
  );

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="fade-in max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        {isImporting && <ImportModal />}
        
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-purple-600">{mode === 'create' ? 'Tạo Ngân hàng đề' : 'Chỉnh sửa'}</h3>
          <button onClick={() => setMode('list')} className="text-slate-400 hover:text-red-500"><X /></button>
        </div>

        <div className="flex gap-4 mb-6">
          <input 
            value={editTitle} 
            onChange={e => setEditTitle(e.target.value)}
            className="flex-1 text-lg font-bold border-b-2 p-2 outline-none focus:border-purple-500" 
            placeholder="Tiêu đề..." 
          />
          <button onClick={() => setIsImporting(true)} className="bg-yellow-600 text-white px-4 rounded-lg flex items-center gap-2 font-bold">
            <Upload size={18} /> Nhập File
          </button>
        </div>

        <div className="mb-6 max-h-96 overflow-y-auto border p-4 rounded-xl bg-slate-50">
           {editQuestions.length === 0 && <p className="text-slate-400 text-center">Chưa có câu hỏi.</p>}
           {editQuestions.map((q, i) => (
             <div key={i} className="bg-white p-3 rounded border mb-2 flex justify-between">
               <div>
                  <span className="text-xs font-bold text-blue-600 uppercase mr-2">{q.type}</span>
                  <span className="text-sm font-medium">{q.text || q.vietnamese}</span>
               </div>
               <button onClick={() => setEditQuestions(editQuestions.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                 <Trash2 size={16} />
               </button>
             </div>
           ))}
        </div>

        <QuestionForm onAdd={q => setEditQuestions([...editQuestions, q])} />

        <button onClick={handleSave} className="w-full mt-6 bg-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
           <Save /> Lưu Ngân hàng đề
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
       <button onClick={startCreate} className="mb-6 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl font-bold shadow-md flex items-center gap-2">
         <PlusCircle size={20} /> Tạo Ngân hàng đề
       </button>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myBanks.map(b => (
            <div key={b.id} className="bg-white p-5 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-600 w-fit mb-3"><Library size={20} /></div>
              <h4 className="font-bold text-lg mb-1">{b.title}</h4>
              <p className="text-slate-500 text-sm mb-4">{b.questions.length} câu hỏi</p>
              <div className="flex gap-2">
                 <button onClick={() => startEdit(b)} className="flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1"><Eye size={16} /> Xem/Sửa</button>
                 <button onClick={() => handleDelete(b.id)} className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
       </div>
    </div>
  );
};
