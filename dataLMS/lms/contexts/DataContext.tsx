
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, query, where, collection } from 'firebase/firestore';
import { db, getRef } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Assignment, Submission, ClassGroup, QuestionBank, UserProfile, VocabularyItem } from '../types';

interface DataContextType {
  assignments: Assignment[];
  submissions: Submission[];
  classes: ClassGroup[];
  questionBanks: QuestionBank[];
  allUsers: UserProfile[];
  vocabulary: VocabularyItem[];
}

const DataContext = createContext<DataContextType>({
  assignments: [],
  submissions: [],
  classes: [],
  questionBanks: [],
  allUsers: [],
  vocabulary: []
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  
  // Store raw assignments separately so we can filter them whenever classes change
  const [rawAssignments, setRawAssignments] = useState<Assignment[]>([]);

  const [data, setData] = useState<DataContextType>({
    assignments: [],
    submissions: [],
    classes: [],
    questionBanks: [],
    allUsers: [],
    vocabulary: []
  });

  // Load Vocabulary (Static)
  useEffect(() => {
    // Simulating loading from file as in original code
    const mockVocab: VocabularyItem[] = [
      { word: '你好', pinyin: 'nǐ hǎo', meaning: 'Xin chào' },
      { word: '谢谢', pinyin: 'xièxie', meaning: 'Cảm ơn' },
      { word: '再见', pinyin: 'zàijiàn', meaning: 'Tạm biệt' },
      { word: '老师', pinyin: 'lǎoshī', meaning: 'Giáo viên' },
      { word: '学生', pinyin: 'xuésheng', meaning: 'Học sinh' },
      { word: '朋友', pinyin: 'péngyou', meaning: 'Bạn bè' },
      { word: '爱', pinyin: 'ài', meaning: 'Yêu' },
      { word: '喜欢', pinyin: 'xǐhuan', meaning: 'Thích' },
      { word: '猫', pinyin: 'māo', meaning: 'Con mèo' },
      { word: '狗', pinyin: 'gǒu', meaning: 'Con chó' },
      { word: '水', pinyin: 'shuǐ', meaning: 'Nước' },
      { word: '书', pinyin: 'shū', meaning: 'Sách' }
    ];
    setData(prev => ({ ...prev, vocabulary: mockVocab }));
  }, []);

  // Listeners for Data
  useEffect(() => {
    if (!user || !userProfile) return;

    const unsubs: (() => void)[] = [];

    // 1. Assignments - Fetch ALL, filter later in separate effect
    unsubs.push(onSnapshot(getRef('assignments'), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      setRawAssignments(all);
    }));

    // 2. Submissions
    unsubs.push(onSnapshot(getRef('submissions'), (snap) => {
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
      setData(prev => ({ ...prev, submissions: subs }));
    }));

    // 3. Classes
    unsubs.push(onSnapshot(getRef('classes'), (snap) => {
      const allClasses = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassGroup));
      let relevantClasses: ClassGroup[] = [];
      
      if (userProfile.role === 'teacher') {
        relevantClasses = allClasses.filter(c => c.teacherId === user.uid);
      } else {
        // Students see classes they are member of
        relevantClasses = allClasses.filter(c => (c.studentIds || []).includes(user.uid));
      }
      setData(prev => ({ ...prev, classes: relevantClasses }));
    }));

    // 4. Question Banks (Only needed for teacher usually, but loading for all for simplicity)
    if (userProfile.role === 'teacher') {
      unsubs.push(onSnapshot(getRef('question_banks'), (snap) => {
        const banks = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuestionBank));
        setData(prev => ({ ...prev, questionBanks: banks }));
      }));
    }

    // 5. Users (For ranking and student lists)
    unsubs.push(onSnapshot(getRef('users'), (snap) => {
      const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setData(prev => ({ ...prev, allUsers: users }));
    }));

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, [user, userProfile?.role]); // Re-run if user or role changes

  // Filter Assignments Effect
  // This runs whenever raw assignments update OR the user's classes list updates
  useEffect(() => {
    if (!user || !userProfile) return;

    const isTeacher = userProfile.role === 'teacher';
    // Get IDs of classes the user is actually in (from the loaded classes data)
    const myClassIds = data.classes.map(c => c.id);

    const filteredAssignments = rawAssignments.filter(a => {
      // Teachers see their own creations
      if (isTeacher) return a.createdBy === user.uid;
      
      // Students see assignments assigned to their classes
      if (!isTeacher && a.classIds && Array.isArray(a.classIds)) {
        return a.classIds.some(cid => myClassIds.includes(cid));
      }
      return false;
    });

    setData(prev => ({ ...prev, assignments: filteredAssignments }));

  }, [rawAssignments, data.classes, userProfile?.role, user?.uid]);

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};
