'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // 인증된 사용자는 /profile로 리다이렉트
        router.push('/profile');
      } else {
        // 인증되지 않은 사용자는 /login으로 리다이렉트
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Tortee
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            멘토와 멘티를 연결하는 매칭 플랫폼입니다. 
            전문가로부터 배우거나, 경험을 나누어 함께 성장하세요.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-blue-600 text-4xl mb-4">🎓</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">멘토가 되어주세요</h3>
              <p className="text-gray-600 mb-6">
                당신의 경험과 지식을 공유하여 
                다음 세대의 성장을 도와주세요.
              </p>
              <Link 
                href="/signup?role=mentor"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                멘토로 시작하기
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-green-600 text-4xl mb-4">🌱</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">멘티로 성장하세요</h3>
              <p className="text-gray-600 mb-6">
                전문 멘토로부터 배우고 
                실무 경험을 쌓아보세요.
              </p>
              <Link 
                href="/signup?role=mentee"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                멘티로 시작하기
              </Link>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 mb-4">이미 계정이 있으신가요?</p>
            <Link 
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
