
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, LayoutDashboard, GraduationCap, Library, Swords, Trophy, 
  LogOut, Menu, ChevronsLeft, Pencil, User, X, Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { EMOJI_AVATARS } from '../utils/helpers';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getPath, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  
  // Avatar Modal State
  const [isAvatarModalOpen, setAvatarModalOpen] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [tempAvatarType, setTempAvatarType] = useState<'url' | 'emoji' | 'text' | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  
  const navItems = [
    { id: 'dashboard', path: '/', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'classes', path: '/classes', icon: GraduationCap, label: 'Lớp học' }, // Removed role restriction
    { id: 'assignments', path: '/assignments', icon: BookOpen, label: 'Bài tập' },
    { id: 'question_bank', path: '/question_bank', icon: Library, label: 'Ngân hàng đề', role: 'teacher' as const },
    { id: 'competition', path: '/competition', icon: Swords, label: 'Đấu trường' },
    { id: 'ranking', path: '/ranking', icon: Trophy, label: 'Xếp hạng' },
  ];

  const filteredNav = navItems.filter(item => !item.role || item.role === userProfile?.role);

  // Avatar Logic
  const openAvatarModal = () => {
    setTempAvatarUrl(userProfile?.avatarUrl || null);
    setTempAvatarType(userProfile?.avatarType || null);
    setUploadStatus('');
    setAvatarModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadStatus('Đang tải lên...');
    try {
      const avatarRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setTempAvatarUrl(downloadURL);
      setTempAvatarType('url');
      setUploadStatus('Tải lên thành công!');
    } catch (error) {
      console.error(error);
      setUploadStatus('Lỗi tải ảnh.');
    }
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, getPath('users'), user.uid), {
        avatarUrl: tempAvatarUrl,
        avatarType: tempAvatarType
      });
      setAvatarModalOpen(false);
    } catch (e) {
      alert("Lỗi lưu avatar");
    }
  };

  const RenderAvatar = ({ profile, size = 'w-10 h-10', textSize = 'text-base', previewUrl, previewType }: { profile: UserProfile | null, size?: string, textSize?: string, previewUrl?: string | null, previewType?: 'url' | 'emoji' | 'text' | null }) => {
    const url = previewUrl !== undefined ? previewUrl : profile?.avatarUrl;
    const type = previewType !== undefined ? previewType : profile?.avatarType;
    
    if (url && type === 'url') {
      return <img src={url} alt="Avatar" className={`${size} rounded-full object-cover border-2 border-white shadow-md`} />;
    } else if (url && type === 'emoji') {
      return <div className={`${size} rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-inner`}><span className={textSize}>{url}</span></div>;
    }
    const initials = profile?.name?.charAt(0) || '?';
    const bgColor = profile?.role === 'teacher' ? 'bg-purple-500' : 'bg-blue-500';
    return <div className={`${size} rounded-full flex items-center justify-center font-bold text-white ${bgColor} border-2 border-white shadow-md`}><span className={textSize}>{initials}</span></div>;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="p-4 lg:p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          {!isCollapsed && <h1 className="text-xl font-bold text-white truncate">EduBattle</h1>}
          <button onClick={() => setCollapsed(!isCollapsed)} className="text-slate-500 hover:text-white transition hidden lg:block ml-auto">
            <ChevronsLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div onClick={openAvatarModal} className={`flex items-center gap-3 mb-4 px-2 group cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}>
            <RenderAvatar profile={userProfile} />
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition">{userProfile?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{userProfile?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</p>
              </div>
            )}
            {!isCollapsed && <Pencil size={16} className="text-slate-500 group-hover:text-blue-400 transition ml-auto" />}
          </div>
          <button 
            onClick={logout} 
            className={`
              w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="bg-white shadow-md lg:shadow-sm px-4 lg:px-8 py-3 lg:py-4 flex justify-between items-center z-10 flex-shrink-0">
          <button onClick={toggleSidebar} className="lg:hidden text-slate-700 hover:text-blue-600 mr-3">
            <Menu size={24} />
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 capitalize truncate">
            {navItems.find(n => n.path === location.pathname)?.label || 'EduBattle'}
          </h2>
          <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold flex items-center gap-1.5 ml-auto">
            <Trophy size={14} /> <span className="hidden md:inline">Điểm:</span> {userProfile?.points || 0}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-slate-200 shadow-2xl z-20 h-16 flex justify-around items-center">
          {filteredNav.slice(0, 5).map((item) => (
             <button key={item.id} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center p-2 ${location.pathname === item.path ? 'text-blue-600' : 'text-slate-500'}`}>
               <item.icon size={20} />
               <span className="text-[10px] font-medium mt-1">{item.label}</span>
             </button>
          ))}
        </nav>
      </div>

      {/* Avatar Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center z-50 fade-in p-4" onClick={(e) => e.target === e.currentTarget && setAvatarModalOpen(false)}>
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-blue-700">Chỉnh sửa Avatar</h3>
                    <button onClick={() => setAvatarModalOpen(false)} className="text-slate-500 hover:text-red-500"><X /></button>
                </div>
                
                <div className="flex flex-col items-center mb-6">
                    <div className="mb-4">
                        <RenderAvatar profile={userProfile} size="w-24 h-24" textSize="text-4xl" previewUrl={tempAvatarUrl} previewType={tempAvatarType} />
                    </div>
                    
                    <div className="w-full mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tải ảnh lên:</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} 
                               className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        <p className={`text-xs mt-2 ${uploadStatus.includes('lỗi') ? 'text-red-500' : 'text-green-600'}`}>{uploadStatus}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="font-bold text-slate-700 mb-3">Hoặc chọn Emoji:</h4>
                    <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl bg-slate-50">
                        {EMOJI_AVATARS.map(emoji => (
                            <button key={emoji} onClick={() => { setTempAvatarUrl(emoji); setTempAvatarType('emoji'); setUploadStatus(''); }} 
                                    className={`p-3 text-2xl rounded-full hover:bg-slate-200 transition ${tempAvatarType === 'emoji' && tempAvatarUrl === emoji ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-slate-100'}`}>
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={handleSaveAvatar} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 transition">
                    <Save size={20} /> Lưu Avatar
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
