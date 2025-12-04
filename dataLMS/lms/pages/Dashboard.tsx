import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, Clock, Swords } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export const Dashboard: React.FC = () => {
  const { userProfile, user } = useAuth();
  const { assignments, submissions } = useData();
  const navigate = useNavigate();

  // Calculate Stats
  const mySubmissions = submissions.filter(s => s.studentId === user?.uid);
  const pendingCount = assignments.filter(a => 
    !submissions.some(s => s.assignmentId === a.id && s.studentId === user?.uid)
  ).length;

  return (
    <div className="fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-yellow-50 text-yellow-500"><Trophy size={24} /></div>
          <div><p className="text-slate-500 text-sm">Điểm tích lũy</p><p className="text-xl md:text-2xl font-bold text-slate-800">{userProfile?.points}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 text-green-500"><CheckCircle size={24} /></div>
          <div><p className="text-slate-500 text-sm">Bài tập đã làm</p><p className="text-xl md:text-2xl font-bold text-slate-800">{mySubmissions.length}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-500"><Clock size={24} /></div>
          <div><p className="text-slate-500 text-sm">Bài tập chờ</p><p className="text-xl md:text-2xl font-bold text-slate-800">{Math.max(0, pendingCount)}</p></div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between">
        <div className="lg:max-w-xl">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Chào mừng trở lại, {userProfile?.name}!</h3>
          <p className="text-blue-100 text-sm md:text-base mb-4 lg:mb-6">
            {userProfile?.role === 'student' ? 'Bạn đã sẵn sàng để chinh phục các thử thách hôm nay chưa?' : 'Quản lý lớp học và tạo bài tập mới.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/assignments')} className="bg-white text-blue-700 px-5 py-2 rounded-lg font-bold hover:bg-blue-50 transition text-sm">
              {userProfile?.role === 'student' ? 'Làm bài ngay' : 'Tạo bài tập'}
            </button>
            <button onClick={() => navigate('/competition')} className="bg-blue-800 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-900 transition flex items-center gap-2 text-sm">
              <Swords size={16} /> Đấu trường
            </button>
          </div>
        </div>
        <Trophy className="w-20 h-20 lg:w-32 lg:h-32 opacity-20 mt-4 lg:mt-0 lg:block flex-shrink-0" />
      </div>
    </div>
  );
};