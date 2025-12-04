
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { db, getPath, getRef } from '../services/firebase';
import { addDoc, deleteDoc, doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { generateRoomCode } from '../utils/helpers';
import { PlusCircle, GraduationCap, Eye, Trash2, UserMinus, BarChart3, Users, X, Save, AlertTriangle, ClipboardList, Copy, Check, LogIn } from 'lucide-react';
import { ClassGroup, UserProfile } from '../types';

export const Classes: React.FC = () => {
  const { classes, allUsers, assignments, submissions } = useData();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // Student Join State
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // View states
  const [viewClassId, setViewClassId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'assignments' | 'stats'>('students');
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);
  
  // Delete Modal States
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<{id: string, title: string} | null>(null);

  // Copy Code State
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedClass = classes.find(c => c.id === viewClassId);
  const isTeacher = userProfile?.role === 'teacher';

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const code = generateRoomCode();
    await addDoc(getRef('classes'), {
      title: newTitle,
      teacherId: user?.uid,
      studentIds: [],
      classCode: code,
      createdAt: serverTimestamp()
    });
    setNewTitle('');
    setIsCreating(false);
  };

  const handleJoinClass = async () => {
      if (!joinCode.trim()) return alert("Vui lòng nhập mã lớp");
      setIsJoining(true);
      try {
          const q = query(getRef('classes'), where('classCode', '==', joinCode.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (snap.empty) {
              alert("Không tìm thấy lớp học với mã này.");
          } else {
              const classDoc = snap.docs[0];
              const classData = classDoc.data();
              if (classData.studentIds?.includes(user?.uid)) {
                  alert("Bạn đã ở trong lớp học này rồi.");
              } else {
                  await updateDoc(doc(db, getPath('classes'), classDoc.id), {
                      studentIds: arrayUnion(user?.uid)
                  });
                  alert(`Đã tham gia lớp "${classData.title}" thành công!`);
                  setJoinCode('');
              }
          }
      } catch (e) {
          console.error(e);
          alert("Lỗi khi tham gia lớp.");
      } finally {
          setIsJoining(false);
      }
  };

  const confirmDeleteClass = async () => {
    if (classToDelete) {
      console.log("Attempting to delete class:", classToDelete);
      try {
        await deleteDoc(doc(db, getPath('classes'), classToDelete));
        if (viewClassId === classToDelete) setViewClassId(null);
        setClassToDelete(null);
        console.log("Class deletion completed for:", classToDelete);
      } catch (error) {
        console.error("Error deleting class:", error);
      }
    }
  };

  const confirmDeleteAssignment = async () => {
    if (assignmentToDelete) {
      console.log("Attempting to delete assignment:", assignmentToDelete.id);
      try {
        await deleteDoc(doc(db, getPath('assignments'), assignmentToDelete.id));
        setAssignmentToDelete(null);
        console.log("Assignment deletion completed for:", assignmentToDelete.id);
      } catch (error) {
        console.error("Error deleting assignment:", error);
      }
    }
  };

  const handleRemoveStudent = async (classId: string, studentId: string) => {
    if (confirm("Gỡ học sinh này khỏi lớp?")) {
       await updateDoc(doc(db, getPath('classes'), classId), {
         studentIds: arrayRemove(studentId)
       });
    }
  };

  const handleUpdateTitle = async (classId: string, newTitle: string) => {
      await updateDoc(doc(db, getPath('classes'), classId), { title: newTitle });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // --- Helper Components ---

  const Avatar = ({ profile, size = "w-8 h-8", textSize = "text-xs" }: { profile?: UserProfile, size?: string, textSize?: string }) => {
      if (profile?.avatarUrl && profile.avatarType === 'url') {
          return <img src={profile.avatarUrl} alt={profile.name} className={`${size} rounded-full object-cover border border-slate-200`} />;
      }
      if (profile?.avatarUrl && profile.avatarType === 'emoji') {
          return <div className={`${size} rounded-full bg-white border border-slate-200 flex items-center justify-center ${textSize}`}>{profile.avatarUrl}</div>;
      }
      return (
          <div className={`${size} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ${textSize}`}>
              {profile?.name?.charAt(0) || '?'}
          </div>
      );
  }

  const DeleteClassModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center fade-in">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
            </div>
            <p className="font-bold text-lg mb-2 text-slate-800">Xác nhận xóa Lớp học</p>
            <p className="text-slate-600 mb-6 text-sm">Bạn có chắc muốn xóa lớp này? Thao tác này sẽ xóa lớp nhưng không xóa tài khoản học sinh.</p>
            <div className="flex gap-4">
                <button onClick={() => setClassToDelete(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition">Hủy</button>
                <button onClick={confirmDeleteClass} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">Xóa</button>
            </div>
        </div>
    </div>
  );

  const DeleteAssignmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center fade-in">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
            </div>
            <p className="font-bold text-lg mb-2 text-slate-800">Xác nhận xóa Bài tập</p>
            {assignmentToDelete && (
              <p className="text-slate-600 mb-6 text-sm">Bạn có chắc muốn xóa bài tập <span className="font-bold">"{assignmentToDelete.title}"</span>? Hành động này không thể hoàn tác.</p>
            )}
            <div className="flex gap-4">
                <button onClick={() => setAssignmentToDelete(null)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-300 transition">Hủy</button>
                <button onClick={confirmDeleteAssignment} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition">Xóa</button>
            </div>
        </div>
    </div>
  );

  // --- Tab Views ---

  const StudentList = ({ cls }: { cls: ClassGroup }) => {
     const students = allUsers.filter(u => cls.studentIds.includes(u.uid));
     // Sort students by points
     const sortedStudents = [...students].sort((a,b) => (b.points || 0) - (a.points || 0));

     return (
       <div className="bg-slate-50 rounded-xl overflow-hidden shadow-inner border">
          <table className="w-full min-w-[500px]">
            <thead className="bg-slate-100 text-slate-500 text-sm">
               <tr>
                 <th className="p-3 text-left pl-4">Hạng</th>
                 <th className="p-3 text-left">Học sinh</th>
                 <th className="p-3 text-right">Điểm tích lũy</th>
                 {isTeacher && <th className="p-3 text-right pr-4">Thao tác</th>}
               </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, idx) => (
                <tr key={s.uid} className={`border-b last:border-0 hover:bg-slate-50 transition ${s.uid === user?.uid ? 'bg-blue-50' : ''}`}>
                  <td className="p-3 pl-4 font-medium text-slate-500">#{idx + 1}</td>
                  <td className="p-3 flex items-center gap-3">
                    <Avatar profile={s} />
                    <span className={`font-medium ${s.uid === user?.uid ? 'text-blue-700' : 'text-slate-700'}`}>{s.name} {s.uid === user?.uid && '(Bạn)'}</span>
                  </td>
                  <td className="p-3 text-right font-bold text-yellow-600">{s.points || 0}</td>
                  {isTeacher && (
                    <td className="p-3 text-right pr-4">
                        <button onClick={() => handleRemoveStudent(cls.id, s.uid)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition">
                        <UserMinus size={18} />
                        </button>
                    </td>
                  )}
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={isTeacher ? 4 : 3} className="p-8 text-center text-slate-500">Chưa có học sinh nào trong lớp.</td></tr>}
            </tbody>
          </table>
       </div>
     );
  };

  const ClassAssignments = ({ cls }: { cls: ClassGroup }) => {
      const classAssignments = assignments.filter(a => (a.classIds || []).includes(cls.id) && a.createdBy === cls.teacherId);
      const studentCount = cls.studentIds.length;

      return (
          <>
            {isTeacher && (
                <button 
                    onClick={() => navigate('/assignments', { state: { createForClass: cls.id, classTitle: cls.title } })}
                    className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-md flex items-center gap-2 text-sm md:text-base"
                >
                    <PlusCircle size={20} /> Tạo Bài tập mới cho {cls.title}
                </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classAssignments.map(a => {
                    const submissionsCount = submissions.filter(s => s.assignmentId === a.id && cls.studentIds.includes(s.studentId)).length;
                    const completionRate = studentCount > 0 ? Math.round((submissionsCount / studentCount) * 100) : 0;
                    const completionColor = completionRate === 100 ? 'bg-green-100 text-green-700' : completionRate > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

                    return (
                        <div key={a.id} className="bg-white p-5 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-bold text-slate-800 truncate">{a.title}</h4>
                                {isTeacher && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${completionColor} flex-shrink-0`}>
                                        {submissionsCount}/{studentCount} ({completionRate}%)
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-500 text-sm mb-4">{a.questions.length} câu hỏi</p>
                            {isTeacher && (
                                <div className="flex gap-2 text-sm font-medium">
                                    <button 
                                        onClick={() => navigate('/assignments', { state: { editAssignment: a } })}
                                        className="flex-1 flex items-center justify-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg transition"
                                    >
                                        <Eye size={16} /> Xem/Sửa
                                    </button>
                                    <button onClick={() => setAssignmentToDelete({id: a.id, title: a.title})} className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition">
                                        <Trash2 size={16} /> Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {classAssignments.length === 0 && <p className="text-slate-500 col-span-full text-center">Chưa có bài tập nào được giao cho lớp này.</p>}
            </div>
          </>
      )
  }

  const AssignmentStatsDetail = ({ assignId, cls }: { assignId: string, cls: ClassGroup }) => {
      const assign = assignments.find(a => a.id === assignId);
      if (!assign) return null;
      
      const students = allUsers.filter(u => cls.studentIds.includes(u.uid));
      const studentStats = students.map(st => {
          const sub = submissions.find(s => s.assignmentId === assignId && s.studentId === st.uid);
          return {
              ...st,
              score: sub ? sub.score : 0,
              submitted: !!sub
          }
      }).sort((a, b) => b.score - a.score);

      return (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border mb-6 fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h5 className="text-xl font-bold text-blue-600 truncate">{assign.title} ({assign.questions.length} câu)</h5>
                  <button onClick={() => setSelectedStatId(null)} className="text-red-500 hover:text-red-700"><X size={20} /></button>
              </div>
              <div className="bg-slate-50 rounded-xl overflow-hidden shadow-inner border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="text-left text-slate-500 text-sm border-b bg-slate-100">
                                <th className="p-3 pl-4 w-12 text-center">Hạng</th>
                                <th className="p-3">Học sinh</th>
                                <th className="p-3 text-center hidden sm:table-cell">Trạng thái</th>
                                <th className="p-3 pr-4 text-right w-20">Điểm</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentStats.map((s, idx) => (
                                <tr key={s.uid} className={`border-b last:border-0 hover:bg-slate-50 transition ${!s.submitted ? 'opacity-60' : ''}`}>
                                    <td className="p-3 pl-4 font-medium text-slate-700 text-center">{idx + 1}</td>
                                    <td className="p-3 font-medium text-slate-700 flex items-center gap-3">
                                        <Avatar profile={s} />
                                        {s.name}
                                    </td>
                                    <td className="p-3 text-center hidden sm:table-cell">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.submitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {s.submitted ? 'Đã nộp' : 'Chưa nộp'}
                                        </span>
                                    </td>
                                    <td className={`p-3 pr-4 text-right font-bold text-lg ${s.score >= 50 ? 'text-green-600' : 'text-red-500'}`}>{s.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
          </div>
      )
  }

  const ClassStats = ({ cls }: { cls: ClassGroup }) => {
    const classAssignments = assignments.filter(a => a.classIds.includes(cls.id) && a.createdBy === cls.teacherId);
    const students = allUsers.filter(u => cls.studentIds.includes(u.uid));

    if (selectedStatId) return <AssignmentStatsDetail assignId={selectedStatId} cls={cls} />;

    return (
      <>
        <h4 className="text-xl font-bold text-slate-700 mb-4">Danh sách Bài tập (Chọn để xem thống kê)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classAssignments.map(a => {
                const submissionsCount = submissions.filter(s => s.assignmentId === a.id && cls.studentIds.includes(s.studentId)).length;
                const completionRate = students.length > 0 ? Math.round((submissionsCount / students.length) * 100) : 0;
                const completionColor = completionRate === 100 ? 'bg-green-600' : completionRate > 0 ? 'bg-yellow-600' : 'bg-red-600';

                return (
                    <button key={a.id} onClick={() => setSelectedStatId(a.id)} className="bg-white p-5 rounded-xl shadow-md border border-slate-100 hover:shadow-lg hover:bg-slate-50 transition text-left">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="text-lg font-bold text-slate-800 truncate">{a.title}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${completionColor} flex-shrink-0`}>{completionRate}%</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-4">{a.questions.length} câu hỏi</p>
                        <p className="text-sm font-medium text-blue-600"><BarChart3 size={16} className="inline mr-1"/> Xem thống kê chi tiết</p>
                    </button>
                );
            })}
            {classAssignments.length === 0 && <p className="text-slate-500 col-span-full text-center">Chưa có bài tập nào được giao để thống kê.</p>}
        </div>
      </>
    );
  };

  // Main Render
  if (viewClassId && selectedClass) {
    return (
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-8 rounded-2xl shadow-lg fade-in relative">
         {assignmentToDelete && <DeleteAssignmentModal />}
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
               {isTeacher ? (
                   <div className="flex items-center gap-2 w-full sm:w-auto">
                       <input 
                         defaultValue={selectedClass.title} 
                         onBlur={(e) => handleUpdateTitle(selectedClass.id, e.target.value)}
                         className="text-2xl md:text-3xl font-bold outline-none border-b-2 border-transparent hover:border-blue-200 focus:border-blue-500 w-full sm:w-auto truncate bg-transparent"
                       />
                       <div className="text-blue-500 flex-shrink-0"><Save size={24} /></div>
                   </div>
               ) : (
                   <h2 className="text-2xl md:text-3xl font-bold text-slate-800 truncate">{selectedClass.title}</h2>
               )}
               
               {isTeacher && (
                   <div 
                        onClick={() => handleCopyCode(selectedClass.classCode)}
                        className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-green-100 transition border border-green-200 select-none group"
                        title="Nhấn để sao chép mã lớp"
                    >
                        <span className="text-xs font-bold uppercase text-green-600">Mã lớp:</span>
                        <span className="text-xl font-bold font-mono tracking-wide">{selectedClass.classCode}</span>
                        <div className="p-1 rounded-md bg-white/50 group-hover:bg-white transition">
                            {copiedCode ? <Check size={14} className="text-green-600"/> : <Copy size={14} className="text-green-600"/>}
                        </div>
                    </div>
               )}
            </div>
            <button onClick={() => setViewClassId(null)} className="absolute top-4 right-4 md:static text-slate-400 hover:text-red-500 flex-shrink-0 p-1"><X size={28} /></button>
         </div>

         <div className="flex gap-2 md:gap-4 mb-8">
            {[
              { id: 'students', label: 'Thành viên & Điểm', icon: Users },
              ...(isTeacher ? [
                  { id: 'assignments', label: 'Bài tập', icon: ClipboardList },
                  { id: 'stats', label: 'Thống kê', icon: BarChart3 }
              ] : [])
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => { setViewMode(tab.id as any); setSelectedStatId(null); }}
                className={`flex-1 py-2 sm:py-3 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 font-bold transition text-sm sm:text-base ${viewMode === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <tab.icon size={20} /> {tab.label}
              </button>
            ))}
         </div>

         {viewMode === 'students' && <StudentList cls={selectedClass} />}
         {viewMode === 'assignments' && <ClassAssignments cls={selectedClass} />}
         {viewMode === 'stats' && <ClassStats cls={selectedClass} />}
      </div>
    );
  }

  return (
    <div className="fade-in">
       {classToDelete && <DeleteClassModal />}
       {assignmentToDelete && <DeleteAssignmentModal />}

       {/* Teacher: Create Class */}
       {isTeacher && (
           <button onClick={() => setIsCreating(true)} className="mb-6 bg-green-600 hover:bg-green-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-xl font-bold shadow-md flex items-center gap-2 text-sm md:text-base">
             <PlusCircle size={20} /> Tạo Lớp học mới
           </button>
       )}

       {/* Student: Join Class */}
       {!isTeacher && (
           <div className="mb-8 p-6 bg-white rounded-2xl shadow-md border border-blue-100 max-w-xl">
               <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><LogIn size={20} className="text-blue-600"/> Tham gia lớp học mới</h3>
               <div className="flex gap-3">
                   <input 
                       value={joinCode}
                       onChange={(e) => setJoinCode(e.target.value)}
                       placeholder="Nhập mã lớp (6 ký tự)..."
                       className="flex-1 p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none uppercase font-bold text-slate-700"
                       maxLength={6}
                   />
                   <button 
                       onClick={handleJoinClass} 
                       disabled={isJoining}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                   >
                       {isJoining ? '...' : 'Tham gia'}
                   </button>
               </div>
           </div>
       )}

       {/* Create Form Modal */}
       {isCreating && (
         <div className="max-w-xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-6 fade-in border border-green-100">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl md:text-2xl font-bold text-green-600">Tạo Lớp học mới</h3>
                <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-red-500"><X /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Lớp học</label>
            <input 
                 value={newTitle} 
                 onChange={e => setNewTitle(e.target.value)}
                 className="w-full p-3 border-2 rounded-lg text-base md:text-lg mb-6 focus:border-green-500" 
                 placeholder="Ví dụ: Lớp Hán ngữ 101" 
            />
            <button onClick={handleCreate} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">Lưu Lớp học</button>
         </div>
       )}

       {/* Class List */}
       <h4 className="text-xl font-bold text-slate-700 mb-4">{isTeacher ? 'Lớp học của bạn' : 'Lớp học đã tham gia'}</h4>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {classes.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition">
               <div className="flex justify-between items-center mb-3">
                 <div className="bg-green-100 p-2 rounded-lg text-green-600"><GraduationCap size={20} /></div>
                 {isTeacher && <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">{c.classCode}</span>}
               </div>
               <h4 className="font-bold text-lg text-slate-800 mb-1 truncate">{c.title}</h4>
               <p className="text-slate-500 text-sm mb-4">{c.studentIds.length} thành viên</p>
               <div className="flex gap-2 text-sm">
                  <button onClick={() => { setViewClassId(c.id); setViewMode('students'); }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-1 transition"><Eye size={16} /> Xem lớp</button>
                  {isTeacher && <button onClick={() => setClassToDelete(c.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"><Trash2 size={18} /></button>}
               </div>
            </div>
          ))}
          {classes.length === 0 && !isCreating && <p className="text-slate-500 col-span-full text-center py-8">Bạn chưa tham gia lớp học nào.</p>}
       </div>
    </div>
  );
};
