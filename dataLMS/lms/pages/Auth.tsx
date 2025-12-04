
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { setDoc, doc, getDocs, query, where, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { auth, db, getPath, getRef, firebaseConfig } from '../services/firebase';
import { TEACHER_CODE } from '../utils/helpers';
import { BookOpen, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'bulk'>('login');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState(''); // Class code or Teacher code
  
  // Bulk States
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkProgress, setBulkProgress] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        if (role === 'teacher' && code !== TEACHER_CODE) {
          throw new Error("Mã giáo viên không đúng.");
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        let classIdToJoin = null;

        if (role === 'student' && code) {
          const classSnap = await getDocs(query(getRef('classes'), where('classCode', '==', code.trim().toUpperCase())));
          if (!classSnap.empty) {
            classIdToJoin = classSnap.docs[0].id;
          } else {
            console.warn("Class code not found");
          }
        }

        await setDoc(doc(db, getPath('users'), uid), {
          uid,
          name,
          role,
          points: 0,
          email,
          createdAt: serverTimestamp()
        });

        if (classIdToJoin) {
          await updateDoc(doc(db, getPath('classes'), classIdToJoin), {
            studentIds: arrayUnion(uid)
          });
        }
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'bulk') {
        await handleBulkImport();
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (code !== TEACHER_CODE) throw new Error("Mã giáo viên không đúng. Chỉ giáo viên mới được tạo hàng loạt.");
    if (!bulkFile) throw new Error("Vui lòng chọn file Excel.");

    const data = await bulkFile.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    // Initialize a secondary app to create users without logging out the current session
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    let createdCount = 0;
    let errorCount = 0;

    setBulkProgress('Đang xử lý dữ liệu...');

    for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row.length < 3) continue; // Skip empty/invalid rows

        // Excel Columns: 1: Name, 2: Email, 3: Password, 4: Class Code
        const sName = String(row[0] || '').trim();
        const sEmail = String(row[1] || '').trim();
        const sPass = String(row[2] || '').trim();
        const sClassCode = String(row[3] || '').trim();
        
        // Skip header row if detected
        if (!sEmail || !sEmail.includes('@') || sEmail.toLowerCase() === 'email') continue;

        try {
            setBulkProgress(`Đang tạo: ${sName} (${i + 1}/${jsonData.length})...`);
            
            // 1. Create User in Auth
            const cred = await createUserWithEmailAndPassword(secondaryAuth, sEmail, sPass);
            const uid = cred.user.uid;

            // 2. Create User in Firestore
            await setDoc(doc(db, getPath('users'), uid), {
                uid,
                name: sName,
                role: 'student',
                points: 0,
                email: sEmail,
                createdAt: serverTimestamp()
            });

            // 3. Add to Class if code provided
            if (sClassCode) {
                const classSnap = await getDocs(query(getRef('classes'), where('classCode', '==', sClassCode.toUpperCase())));
                if (!classSnap.empty) {
                    const classId = classSnap.docs[0].id;
                    await updateDoc(doc(db, getPath('classes'), classId), {
                        studentIds: arrayUnion(uid)
                    });
                }
            }
            createdCount++;
        } catch (e) {
            console.error(`Error creating ${sEmail}:`, e);
            errorCount++;
        }
    }

    // Cleanup
    await deleteApp(secondaryApp);
    
    setBulkProgress('');
    alert(`Hoàn tất!\n- Thành công: ${createdCount}\n- Lỗi: ${errorCount}`);
    setMode('login'); // Return to login
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">EduBattle</h1>
          <p className="text-slate-500">Nền tảng học tập & thi đấu</p>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          {mode === 'register' ? 'Đăng ký tài khoản' : mode === 'bulk' ? 'Tạo học sinh hàng loạt' : 'Đăng nhập'}
        </h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {bulkProgress && <div className="bg-blue-100 text-blue-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>{bulkProgress}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* LOGIN & REGISTER FIELDS */}
          {mode !== 'bulk' && (
            <>
                {mode === 'register' && (
                    <div>
                    <input 
                        type="text" 
                        required 
                        className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="Họ và tên"
                        value={name} onChange={e => setName(e.target.value)}
                    />
                    </div>
                )}
                
                <div>
                    <input 
                    type="email" 
                    required 
                    className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    />
                </div>
                
                <div>
                    <input 
                    type="password" 
                    required 
                    className="w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Mật khẩu"
                    value={password} onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {mode === 'register' && (
                    <>
                    <div className="grid grid-cols-2 gap-4">
                        <label className={`cursor-pointer border p-2 rounded-lg text-center transition ${role === 'student' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                        <input type="radio" name="role" checked={role === 'student'} onChange={() => setRole('student')} className="hidden" /> 
                        Học sinh
                        </label>
                        <label className={`cursor-pointer border p-2 rounded-lg text-center transition ${role === 'teacher' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}>
                        <input type="radio" name="role" checked={role === 'teacher'} onChange={() => setRole('teacher')} className="hidden" /> 
                        Giáo viên
                        </label>
                    </div>
                    
                    <input 
                        type="text" 
                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:outline-none ${role === 'teacher' ? 'border-purple-300 focus:ring-purple-500' : 'border-green-300 focus:ring-green-500'}`} 
                        placeholder={role === 'teacher' ? "Mã giáo viên (ruands10)" : "Mã lớp học (Tùy chọn)"}
                        value={code} onChange={e => setCode(e.target.value)}
                    />
                    </>
                )}
            </>
          )}

          {/* BULK CREATE FIELDS */}
          {mode === 'bulk' && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 mb-2">
                    <p className="font-bold mb-1">Cấu trúc File Excel (Không tiêu đề):</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Cột 1: Tên học sinh</li>
                        <li>Cột 2: Email</li>
                        <li>Cột 3: Mật khẩu</li>
                        <li>Cột 4: Mã lớp (Tùy chọn)</li>
                    </ul>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã xác nhận Giáo viên</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full p-3 border border-purple-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" 
                        placeholder="Nhập mã (ruands10)"
                        value={code} onChange={e => setCode(e.target.value)}
                    />
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                    <input type="file" accept=".xlsx, .xls" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {bulkFile ? (
                        <div className="text-green-600 font-bold flex flex-col items-center">
                            <FileSpreadsheet size={32} className="mb-2"/>
                            {bulkFile.name}
                        </div>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <Upload size={32} className="mb-2"/>
                            <span className="text-sm">Nhấn để chọn file Excel</span>
                        </div>
                    )}
                </div>
              </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white py-3 rounded-lg font-bold shadow-lg transition transform hover:-translate-y-0.5 ${mode === 'register' ? 'bg-blue-600 hover:bg-blue-700' : mode === 'bulk' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
          >
            {loading ? 'Đang xử lý...' : (mode === 'register' ? 'Đăng ký' : mode === 'bulk' ? 'Tiến hành tạo' : 'Đăng nhập')}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-sm space-y-2">
          {mode === 'login' && (
              <>
                <button onClick={() => setMode('register')} className="block w-full font-bold text-blue-600 hover:text-blue-700 transition">
                    Chưa có tài khoản? Đăng ký ngay
                </button>
                <button onClick={() => setMode('bulk')} className="block w-full font-medium text-purple-600 hover:text-purple-700 transition">
                    Tạo tài khoản hàng loạt (Giáo viên)
                </button>
              </>
          )}
          {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="font-bold text-slate-500 hover:text-slate-700 transition">
                Quay lại Đăng nhập
              </button>
          )}
        </div>
      </div>
    </div>
  );
};
