'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MatchingRequest } from '@/types';
import { matchingApi } from '@/lib/api';

export default function IncomingRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MatchingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 받은 요청 목록 조회
  const fetchIncomingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const requestsData = await matchingApi.getReceivedRequests();
      setRequests(requestsData);
      
    } catch (error: any) {
      console.error('Failed to fetch requests:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'mentor') {
      fetchIncomingRequests();
    }
  }, [user]);

  // 요청 수락
  const acceptRequest = async (requestId: number) => {
    if (!confirm('이 매칭 요청을 수락하시겠습니까?')) {
      return;
    }

    try {
      await matchingApi.acceptRequest(requestId);
      alert('매칭 요청을 수락했습니다.');
      fetchIncomingRequests(); // 목록 새로고침
    } catch (error: any) {
      console.error('Failed to accept request:', error);
      alert(error.response?.data?.error || error.message || '요청 수락에 실패했습니다.');
    }
  };

  // 요청 거절
  const rejectRequest = async (requestId: number) => {
    if (!confirm('이 매칭 요청을 거절하시겠습니까?')) {
      return;
    }

    try {
      await matchingApi.rejectRequest(requestId);
      alert('매칭 요청을 거절했습니다.');
      fetchIncomingRequests(); // 목록 새로고침
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      alert(error.response?.data?.error || error.message || '요청 거절에 실패했습니다.');
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

  if (user.role !== 'mentor') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600">이 페이지는 멘토만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">받은 매칭 요청</h1>
          <p className="text-gray-600">멘티들이 보낸 매칭 요청을 확인하고 응답하세요.</p>
        </div>

        {/* 새로고침 버튼 */}
        <div className="mb-6">
          <button
            onClick={fetchIncomingRequests}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? '로딩중...' : '새로고침'}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 요청 목록 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414A1 1 0 0014 19H10a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 16H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">받은 요청이 없습니다</h3>
              <p className="text-gray-600">아직 멘티들로부터 매칭 요청이 없습니다.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
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
                        <p className="text-sm text-gray-500 mb-1">멘티 ID</p>
                        <p className="text-gray-900">{request.menteeId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">요청 일시</p>
                        <p className="text-gray-900">{request.created_at ? new Date(request.created_at).toLocaleString('ko-KR') : '정보 없음'}</p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">요청 메시지</p>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-md request-message" data-mentee={request.menteeId}>
                          {request.message}
                        </p>
                      </div>
                    )}

                    {/* 멘티 이름이 있다면 표시 */}
                    {request.mentee_name && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">멘티</p>
                        <p className="text-gray-900">{request.mentee_name}</p>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="ml-4">
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          id="accept"
                          onClick={() => acceptRequest(request.id)}
                          data-request-id={request.id}
                          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                          수락
                        </button>
                        <button
                          id="reject"
                          onClick={() => rejectRequest(request.id)}
                          data-request-id={request.id}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        >
                          거절
                        </button>
                      </div>
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
