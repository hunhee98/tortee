'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* 로고 */}
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold">Tortee</h1>
            </Link>

            {/* 네비게이션 메뉴 */}
            <div className="hidden md:flex space-x-4">
              <Link
                href="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/profile')}`}
              >
                내 프로필
              </Link>

              {user.role === 'mentee' && (
                <>
                  <Link
                    href="/mentors"
                    className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/mentors')}`}
                  >
                    멘토 찾기
                  </Link>
                  <Link
                    href="/requests"
                    className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/requests')}`}
                  >
                    내 요청
                  </Link>
                </>
              )}

              {user.role === 'mentor' && (
                <Link
                  href="/incoming-requests"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/incoming-requests')}`}
                >
                  받은 요청
                </Link>
              )}
            </div>
          </div>

          {/* 사용자 정보 & 로그아웃 */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <img
                src={user.profile?.imageUrl || (user.role === 'mentor' 
                  ? 'https://placehold.co/32x32.jpg?text=M'
                  : 'https://placehold.co/32x32.jpg?text=ME')}
                alt={user.profile?.name || '프로필'}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium">
                {user.profile?.name || '사용자'}
              </span>
              <span className="text-xs bg-blue-500 px-2 py-1 rounded-full">
                {user.role === 'mentor' ? '멘토' : '멘티'}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        <div className="md:hidden pb-3">
          <div className="flex flex-col space-y-1">
            <Link
              href="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/profile')}`}
            >
              내 프로필
            </Link>

            {user.role === 'mentee' && (
              <>
                <Link
                  href="/mentors"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/mentors')}`}
                >
                  멘토 찾기
                </Link>
                <Link
                  href="/requests"
                  className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/requests')}`}
                >
                  내 요청
                </Link>
              </>
            )}

            {user.role === 'mentor' && (
              <Link
                href="/incoming-requests"
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors ${isActive('/incoming-requests')}`}
              >
                받은 요청
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
