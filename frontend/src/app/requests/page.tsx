'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MatchingRequest } from '@/types';
import { matchingApi } from '@/lib/api';

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MatchingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 내가 보낸 요청 목록 조회
  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const requestsData = await matchingApi.getMyRequests();
      setRequests(requestsData);
      
    } catch (error: any) {
      console.error('Failed to fetch requests:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'mentee') {
      fetchMyRequests();
    }
  }, [user]);

  // 요청 취소
  const cancelRequest = async (requestId: number) => {
    if (!confirm('정말로 이 매칭 요청을 취소하시겠습니까?')) {
      return;
    }

    try {
      await matchingApi.cancelRequest(requestId);
      alert('매칭 요청이 취소되었습니다.');
      fetchMyRequests(); // 목록 새로고침
    } catch (error: any) {
      console.error('Failed to cancel request:', error);
      alert(error.response?.data?.error || error.message || '요청 취소에 실패했습니다.');
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'accepted': return '수락됨';
      case 'rejected': return '거절됨';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-600">매칭 요청을 확인하려면 로그인하세요.</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'mentee') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600">이 페이지는 멘티만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 id="requests-title" className="text-3xl font-bold text-gray-900 mb-2">
            내가 보낸 매칭 요청
          </h1>
          <p className="text-gray-600">멘토에게 보낸 매칭 요청 현황을 확인하세요.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">보낸 요청이 없습니다</h3>
              <p className="text-gray-600 mb-4">아직 멘토에게 매칭 요청을 보내지 않았습니다.</p>
              <a
                href="/mentors"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                멘토 찾아보기
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        요청 #{request.id}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">멘토 ID</p>
                        <p className="text-gray-900">{request.mentorId}</p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">요청 메시지</p>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-md request-message" data-request-id={request.id}>
                          {request.message}
                        </p>
                      </div>
                    )}

                    {/* 멘토 이름이 있다면 표시 */}
                    {request.mentor_name && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">멘토</p>
                        <p className="text-gray-900">{request.mentor_name}</p>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="ml-4">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest(request.id)}
                        data-request-id={request.id}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
