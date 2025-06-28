'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/lib/api';
import { User } from '@/types';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    skills: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.profile?.name || '',
        bio: user.profile?.bio || '',
        skills: user.role === 'mentor' ? (user.profile?.skills || []) : [],
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData(prev => ({
      ...prev,
      skills
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 형식 검증 (.png, .jpg, .jpeg만 허용)
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setError('이미지 형식은 PNG 또는 JPG만 지원됩니다.');
      return;
    }

    // 파일 크기 검증 (1MB 이하)
    if (file.size > 1024 * 1024) {
      setError('이미지 크기는 1MB 이하여야 합니다.');
      return;
    }

    // 이미지 픽셀 크기 검증 (500x500 ~ 1000x1000)
    const img = document.createElement('img');
    img.onload = () => {
      if (img.width < 500 || img.width > 1000 || img.height < 500 || img.height > 1000) {
        setError('이미지 크기는 500x500 ~ 1000x1000 픽셀이어야 합니다.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
      
      // 메모리 정리
      URL.revokeObjectURL(img.src);
    };
    
    img.onerror = () => {
      setError('이미지를 읽을 수 없습니다.');
      URL.revokeObjectURL(img.src);
    };
    
    img.src = URL.createObjectURL(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = {
        name: formData.name,
        bio: formData.bio,
      };

      if (user?.role === 'mentor') {
        updateData.skills = formData.skills;
      }

      // 이미지가 선택된 경우 Base64로 인코딩하여 전송
      if (selectedImage) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64String = reader.result as string;
          // "data:image/jpeg;base64," 부분을 제거하고 순수 base64만 전송
          const base64Data = base64String.split(',')[1];
          updateData.image = base64Data;
          
          await submitProfile(updateData);
        };
        reader.readAsDataURL(selectedImage);
      } else {
        await submitProfile(updateData);
      }
    } catch (error: any) {
      setError(error.message || '프로필 업데이트에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const submitProfile = async (updateData: any) => {
    try {
      const response = await profileApi.updateProfile(updateData);
      
      if (response.success && response.data) {
        updateUser(response.data);
        setSuccess('프로필이 성공적으로 업데이트되었습니다.');
        setIsEditing(false);
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        setError(response.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (error: any) {
      setError(error.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (user) {
      setFormData({
        name: user.profile?.name || '',
        bio: user.profile?.bio || '',
        skills: user.role === 'mentor' ? (user.profile?.skills || []) : [],
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 id="profile-title" className="text-2xl font-bold text-gray-900">
              내 프로필
            </h1>
            {!isEditing && (
              <button
                id="edit-profile-button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                프로필 수정
              </button>
            )}
          </div>

          {/* 프로필 이미지 */}
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative w-24 h-24">
              <Image
                id="profile-photo"
                src={imagePreview || user.profile?.imageUrl || (user.role === 'mentor' 
                  ? 'https://placehold.co/500x500.jpg?text=MENTOR'
                  : 'https://placehold.co/500x500.jpg?text=MENTEE')}
                alt="프로필 이미지"
                fill
                className="rounded-full object-cover"
              />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white text-sm"
                  >
                    변경
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {user.profile?.name || '이름 없음'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'mentor' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {user.role === 'mentor' ? '멘토' : '멘티'}
              </span>
              
              {/* 이미지 업로드 인풋 (편집 모드에서만 표시) */}
              {isEditing && (
                <div className="mt-3">
                  <input
                    id="profile"
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpg,image/jpeg"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded border hover:bg-gray-200"
                    >
                      이미지 선택
                    </button>
                    {selectedImage && (
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded border hover:bg-red-200"
                      >
                        제거
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG 형식, 1MB 이하
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 알림 메시지 */}
          {error && (
            <div id="profile-error" className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div id="profile-success" className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* 프로필 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* 이름 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                {isEditing ? (
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이름을 입력하세요"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{user.profile?.name || '설정되지 않음'}</p>
                )}
              </div>

              {/* 소개 */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  소개
                </label>
                {isEditing ? (
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="자신을 소개해주세요"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{user.profile?.bio || '설정되지 않음'}</p>
                )}
              </div>

              {/* 기술 스택 (멘토만) */}
              {user.role === 'mentor' && (
                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                    기술 스택
                  </label>
                  {isEditing ? (
                    <input
                      id="skillsets"
                      name="skills"
                      type="text"
                      value={formData.skills.join(', ')}
                      onChange={handleSkillsChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: React, Node.js, Python (쉼표로 구분)"
                    />
                  ) : (
                    <div className="py-2">
                      {user.profile?.skills && user.profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.profile.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-900">설정되지 않음</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 버튼 */}
            {isEditing && (
              <div className="flex space-x-4 mt-6">
                <button
                  id="save"
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? '저장 중...' : '저장'}
                </button>
                <button
                  id="cancel-profile-button"
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
