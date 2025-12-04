import React, { useState } from 'react';
import { Question, QuestionType } from '../types';
import { Volume2 } from 'lucide-react';
import { speakWord } from '../utils/helpers';

interface QuestionFormProps {
  onAdd: (q: Question) => void;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({ onAdd }) => {
  const [type, setType] = useState<QuestionType>('mcq');
  
  // Form States
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState('');
  const [pairs, setPairs] = useState([{a: '', b: ''}, {a: '', b: ''}, {a: '', b: ''}]);
  const [vietnamese, setVietnamese] = useState('');
  const [chinese, setChinese] = useState('');
  const [audioText, setAudioText] = useState('');

  const handleAdd = () => {
    let newQ: Question = { type, text: '' };
    try {
      switch (type) {
        case 'mcq':
        case 'listen_mcq':
          if (!text && type === 'mcq') throw new Error("Nhập nội dung câu hỏi");
          if (!audioText && type === 'listen_mcq') throw new Error("Nhập từ vựng âm thanh");
          if (options.some(o => !o)) throw new Error("Nhập đủ 4 đáp án");
          
          newQ = { 
            type, 
            text: type === 'mcq' ? text : `Nghe từ và chọn nghĩa đúng:`,
            options, 
            correct,
            audioText: type === 'listen_mcq' ? audioText : undefined 
          };
          break;
        case 'fib':
          if (!text.includes('[BLANK]')) throw new Error("Câu hỏi phải chứa [BLANK]");
          if (!answer) throw new Error("Nhập đáp án");
          newQ = { type, text, answer };
          break;
        case 'jumble':
          if (!answer) throw new Error("Nhập câu đúng");
          const words = answer.trim().split(/\s+/);
          if (words.length < 2) throw new Error("Câu phải có ít nhất 2 từ");
          newQ = { type, text: "Sắp xếp từ thành câu:", answer: words };
          break;
        case 'match':
          if (pairs.some(p => !p.a || !p.b)) throw new Error("Nhập đủ các cặp");
          newQ = { type, text: "Ghép đôi các mục sau:", pairs };
          break;
        case 'translation':
          if (!vietnamese || !chinese) throw new Error("Nhập đủ câu TV và TC");
          newQ = { type, text: vietnamese, vietnamese, chinese };
          break;
        case 'listen_write':
        case 'listen_translate':
          if (!audioText || !answer) throw new Error("Nhập đủ thông tin");
          newQ = { 
            type, 
            text: type === 'listen_write' ? "Nghe và viết lại" : "Nghe và dịch",
            audioText, 
            answer 
          };
          break;
        default:
          return;
      }
      onAdd(newQ);
      // Reset generic fields
      setText(''); setAnswer(''); setVietnamese(''); setChinese(''); setAudioText('');
      setOptions(['', '', '', '']); setPairs([{a:'',b:''},{a:'',b:''},{a:'',b:''}]);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
      <h4 className="font-bold text-blue-800 mb-3">Thêm câu hỏi mới</h4>
      
      <select 
        value={type} 
        onChange={e => setType(e.target.value as QuestionType)}
        className="w-full p-2 border border-blue-300 rounded-lg mb-4"
      >
        <option value="mcq">1. Trắc nghiệm</option>
        <option value="fib">2. Điền từ (FIB)</option>
        <option value="jumble">3. Xếp từ</option>
        <option value="match">4. Ghép đôi</option>
        <option value="translation">5. Dịch câu (Việt - Trung)</option>
        <option value="listen_mcq">6. Nghe - Chọn nghĩa</option>
        <option value="listen_write">7. Nghe - Viết lại</option>
        <option value="listen_translate">8. Nghe - Dịch nghĩa</option>
      </select>

      <div className="space-y-3 mb-4">
        {type === 'mcq' && (
          <input value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded" placeholder="Nội dung câu hỏi" />
        )}

        {(type === 'listen_mcq' || type.startsWith('listen_')) && (
          <div className="flex gap-2">
            <input value={audioText} onChange={e => setAudioText(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Văn bản tiếng Trung để phát âm" />
            <button onClick={() => speakWord(audioText)} className="p-2 bg-purple-100 text-purple-600 rounded"><Volume2 size={20}/></button>
          </div>
        )}

        {(type === 'mcq' || type === 'listen_mcq') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt, i) => (
                <input key={i} value={opt} onChange={e => {
                  const newO = [...options]; newO[i] = e.target.value; setOptions(newO);
                }} className="p-2 border rounded" placeholder={`Đáp án ${i+1}`} />
              ))}
            </div>
            <select value={correct} onChange={e => setCorrect(Number(e.target.value))} className="w-full p-2 border rounded">
              {options.map((_, i) => <option key={i} value={i}>Đáp án {i+1} đúng</option>)}
            </select>
          </>
        )}

        {type === 'fib' && (
          <>
            <p className="text-xs text-slate-500">Dùng [BLANK] cho vị trí điền từ</p>
            <input value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded" placeholder="VD: Hôm nay tôi đi [BLANK]..." />
            <input value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-2 border rounded" placeholder="Từ cần điền (VD: học)" />
          </>
        )}

        {type === 'jumble' && (
          <>
             <input value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-2 border rounded" placeholder="Nhập câu đúng hoàn chỉnh" />
          </>
        )}

        {type === 'match' && (
          <div className="grid grid-cols-2 gap-2">
             {pairs.map((p, i) => (
               <React.Fragment key={i}>
                 <input value={p.a} onChange={e => { const n = [...pairs]; n[i].a = e.target.value; setPairs(n); }} className="p-2 border rounded" placeholder={`Câu hỏi ${i+1}`} />
                 <input value={p.b} onChange={e => { const n = [...pairs]; n[i].b = e.target.value; setPairs(n); }} className="p-2 border rounded" placeholder={`Đáp án ${i+1}`} />
               </React.Fragment>
             ))}
          </div>
        )}

        {type === 'translation' && (
          <>
             <input value={vietnamese} onChange={e => setVietnamese(e.target.value)} className="w-full p-2 border rounded" placeholder="Câu Tiếng Việt" />
             <input value={chinese} onChange={e => setChinese(e.target.value)} className="w-full p-2 border rounded" placeholder="Đáp án Tiếng Trung" />
          </>
        )}

        {(type === 'listen_write' || type === 'listen_translate') && (
             <input value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-2 border rounded" placeholder="Đáp án đúng" />
        )}
      </div>

      <button onClick={handleAdd} className="text-blue-600 font-bold text-sm">+ Thêm vào danh sách</button>
    </div>
  );
};
