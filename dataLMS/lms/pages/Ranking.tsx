
import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy } from 'lucide-react';

export const Ranking: React.FC = () => {
  const { allUsers } = useData();
  const { user } = useAuth();

  const sortedUsers = [...allUsers].sort((a, b) => (b.points || 0) - (a.points || 0));

  const renderMedal = (rank: number) => {
    if (rank === 0) return <span className="text-2xl">🥇</span>;
    if (rank === 1) return <span className="text-2xl">🥈</span>;
    if (rank === 2) return <span className="text-2xl">🥉</span>;
    return <span className="font-bold text-slate-500">#{rank + 1}</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-4xl mx-auto fade-in">
        <div className="bg-yellow-500 p-6 md:p-8 text-center text-white">
            <Trophy className="w-12 h-12 mx-auto drop-shadow-lg mb-2" />
            <h3 className="text-2xl md:text-3xl font-bold">Bảng Xếp Hạng</h3>
        </div>
        <div className="p-4 md:p-6">
            <table className="w-full">
                <thead>
                    <tr className="text-left text-slate-500 text-sm border-b bg-slate-50">
                        <th className="pb-3 pl-4 pt-3 w-16">Hạng</th>
                        <th className="pb-3 pt-3">Học sinh</th>
                        <th className="pb-3 text-right pr-4 pt-3">Điểm số</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedUsers.map((u, idx) => {
                        const isMe = u.uid === user?.uid;
                        return (
                          <tr key={u.uid} className={`border-b last:border-0 ${isMe ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                              <td className="py-4 pl-4 font-bold text-center">{renderMedal(idx)}</td>
                              <td className="py-4 font-medium flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isMe ? 'bg-blue-600' : 'bg-slate-400'}`}>
                                    {u.name.charAt(0)}
                                  </div>
                                  <span className={isMe ? 'text-blue-700' : 'text-slate-700'}>{u.name} {isMe && '(Bạn)'}</span>
                              </td>
                              <td className="py-4 text-right pr-4 font-bold text-xl text-yellow-600">{u.points || 0}</td>
                          </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};
