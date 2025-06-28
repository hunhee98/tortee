'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { mentorApi, matchingApi } from '@/lib/api';

interface MentorFilters {
  skills: string[];
  sortBy: 'name' | 'skill' | 'newest' | 'oldest';
}

export default function MentorsPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<MentorFilters>({
    skills: [],
    sortBy: 'name'
  });
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  // 멘토 목록 조회
  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (filters.skills.length > 0) params.skill = filters.skills[0]; // 백엔드는 한 번에 하나의 스킬만 지원
      
      // 정렬 파라미터 설정
      if (filters.sortBy === 'name') {
        params.order_by = 'name';
      } else if (filters.sortBy === 'skill') {
        params.order_by = 'skill';
      }
      // newest, oldest는 기본 정렬(id 기준)을 사용

      const mentorsData = await mentorApi.getMentors(params);
      setMentors(mentorsData);
      
      // 모든 스킬 목록 추출
      const skillsSet = new Set<string>();
      mentorsData.forEach((mentor: User) => {
        mentor.profile.skills?.forEach(skill => skillsSet.add(skill));
      });
      setAllSkills(Array.from(skillsSet).sort());
      
    } catch (error: any) {
      console.error('Failed to fetch mentors:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [filters]);

  // 매칭 요청 보내기
  const sendMatchRequest = async (mentorId: number) => {
    setSelectedMentorId(mentorId);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  // 매칭 요청 전송
  const submitMatchRequest = async () => {
    if (!selectedMentorId || !requestMessage.trim()) {
      alert('메시지를 입력해주세요.');
      return;
    }

    try {
      const matchRequest = await matchingApi.sendRequest({
        mentorId: selectedMentorId,
        menteeId: user?.id || 0,
        message: requestMessage
      });

      alert('매칭 요청이 성공적으로 전송되었습니다!');
      setShowRequestModal(false);
      setRequestMessage('');
      setSelectedMentorId(null);
    } catch (error: any) {
      console.error('Failed to send match request:', error);
      alert(error.response?.data?.error || error.message || '매칭 요청 전송에 실패했습니다.');
    }
  };

  // 스킬 필터 토글
  const toggleSkillFilter = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600">멘토 목록을 보려면 로그인하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">멘토 찾기</h1>
          <p className="text-gray-600">원하는 분야의 전문가와 연결되어 성장하세요.</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 정렬 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬 기준
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="name"
                    type="radio"
                    name="sortBy"
                    value="name"
                    checked={filters.sortBy === 'name'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="name" className="ml-2 text-sm text-gray-700">
                    이름순
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="skill"
                    type="radio"
                    name="sortBy"
                    value="skill"
                    checked={filters.sortBy === 'skill'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="skill" className="ml-2 text-sm text-gray-700">
                    스킬순
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="newest"
                    type="radio"
                    name="sortBy"
                    value="newest"
                    checked={filters.sortBy === 'newest'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="newest" className="ml-2 text-sm text-gray-700">
                    최신순
                  </label>
                </div>
              </div>
            </div>

            {/* 새로고침 */}
            <div className="flex items-end">
              <button
                onClick={fetchMentors}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '로딩중...' : '새로고침'}
              </button>
            </div>
          </div>

          {/* 스킬 필터 */}
          {allSkills.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기술 스택 필터
              </label>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkillFilter(skill)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.skills.includes(skill)
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 멘토 목록 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">멘토를 찾을 수 없습니다</h3>
              <p className="text-gray-600">검색 조건을 변경하거나 필터를 조정해보세요.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(mentor => (
              <div key={mentor.id} className="mentor bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* 프로필 이미지 */}
                  <div className="flex items-center mb-4">
                    <img
                      src={mentor.profile.imageUrl}
                      alt={mentor.profile.name || '멘토'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mentor.profile.name || '이름 없음'}
                      </h3>
                      <p className="text-sm text-gray-500">{mentor.email}</p>
                    </div>
                  </div>

                  {/* 자기소개 */}
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {mentor.profile.bio || '자기소개가 없습니다.'}
                    </p>
                  </div>

                  {/* 기술 스택 */}
                  {mentor.profile.skills && mentor.profile.skills.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">기술 스택</h4>
                      <div className="flex flex-wrap gap-1">
                        {mentor.profile.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {mentor.profile.skills.length > 3 && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            +{mentor.profile.skills.length - 3}개 더
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 매칭 요청 버튼 */}
                  {user?.role === 'mentee' && (
                    <button
                      id="request"
                      data-mentor-id={mentor.id}
                      onClick={() => sendMatchRequest(mentor.id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      매칭 요청하기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 매칭 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">매칭 요청 보내기</h3>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                요청 메시지
              </label>
              <textarea
                id="message"
                data-mentor-id={selectedMentorId}
                data-testid={`message-${selectedMentorId}`}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="멘토에게 보낼 메시지를 입력하세요..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div id="request-status" className="hidden">
              {/* 요청 상태가 필요한 경우 여기에 표시 */}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestMessage('');
                  setSelectedMentorId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                취소
              </button>
              <button
                onClick={submitMatchRequest}
                disabled={!requestMessage.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                요청 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
