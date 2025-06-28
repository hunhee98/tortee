const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { getDatabase } = require('../models/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// 메모리에 파일 저장하는 multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024, // 1MB 제한
  },
  fileFilter: (req, file, cb) => {
    // JPG, PNG만 허용
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [mentor, mentee]
 *         name:
 *           type: string
 *         bio:
 *           type: string
 *         skillsets:
 *           type: array
 *           items:
 *             type: string
 *         profile_image_url:
 *           type: string
 *           description: 프로필 이미지 URL
 *         created_at:
 *           type: string
 *           format: date-time
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: 사용자 이름
 *         bio:
 *           type: string
 *           description: 자기소개
 *         skillsets:
 *           type: array
 *           items:
 *             type: string
 *           description: 기술 스택 (멘토만)
 */

/**
 * @swagger
 * /me:
 *   get:
 *     tags: [User Profile]
 *     summary: 현재 사용자 정보 조회
 *     description: 로그인한 사용자의 프로필 정보를 가져옵니다
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const db = getDatabase();
    
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, email, role, name, bio, skillsets, 
                profile_image_type, created_at 
         FROM users WHERE id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 기본 프로필 이미지 URL 설정
    let profileImageUrl;
    if (user.profile_image_type) {
      profileImageUrl = `/api/profile/image/${userId}`;
    } else {
      // 기본 이미지
      const defaultImage = user.role === 'mentor' 
        ? 'https://placehold.co/500x500.jpg?text=MENTOR'
        : 'https://placehold.co/500x500.jpg?text=MENTEE';
      profileImageUrl = defaultImage;
    }
    
    // skillsets JSON 파싱
    let skillsets = [];
    if (user.skillsets) {
      try {
        skillsets = JSON.parse(user.skillsets);
      } catch (e) {
        console.error('Error parsing skillsets:', e);
      }
    }
    
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        name: user.name || '',
        bio: user.bio || '',
        imageUrl: profileImageUrl,
        skills: user.role === 'mentor' ? skillsets : undefined
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /me:
 *   put:
 *     tags: [User Profile]
 *     summary: 사용자 프로필 업데이트
 *     description: 로그인한 사용자의 프로필 정보를 수정합니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, bio, skillsets } = req.body;
    const db = getDatabase();
    
    // skillsets를 JSON 문자열로 변환
    let skillsetsJson = null;
    if (skillsets && Array.isArray(skillsets)) {
      skillsetsJson = JSON.stringify(skillsets);
    }
    
    // 사용자 역할 확인
    const userRole = req.user.role;
    
    // 멘티는 skillsets 설정 불가
    if (userRole === 'mentee' && skillsets) {
      return res.status(400).json({ error: 'Mentees cannot set skillsets' });
    }
    
    // 업데이트 쿼리 구성
    let updateQuery = 'UPDATE users SET ';
    let updateParams = [];
    let updateFields = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateParams.push(bio);
    }
    
    if (skillsetsJson !== null && userRole === 'mentor') {
      updateFields.push('skillsets = ?');
      updateParams.push(skillsetsJson);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    updateParams.push(userId);
    
    await new Promise((resolve, reject) => {
      db.run(updateQuery, updateParams, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log(`✅ Profile updated for user ID: ${userId}`);
    res.json({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /profile/image:
 *   post:
 *     tags: [User Profile]
 *     summary: 프로필 이미지 업로드
 *     description: 사용자의 프로필 이미지를 업로드합니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 이미지 파일 (JPG/PNG, 최대 1MB)
 *     responses:
 *       200:
 *         description: 이미지 업로드 성공
 *       400:
 *         description: 잘못된 파일 형식 또는 크기
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.post('/profile/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    // 이미지 메타데이터 확인
    const metadata = await sharp(req.file.buffer).metadata();
    
    // 픽셀 크기 검증 (500-1000px)
    if (metadata.width < 500 || metadata.width > 1000 || metadata.height < 500 || metadata.height > 1000) {
      return res.status(400).json({ 
        error: 'Image dimensions must be between 500x500 and 1000x1000 pixels' 
      });
    }
    
    const userId = req.user.sub;
    const db = getDatabase();
    
    // 이미지 데이터와 MIME 타입 저장
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET profile_image = ?, profile_image_type = ? WHERE id = ?',
        [req.file.buffer, req.file.mimetype, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log(`✅ Profile image uploaded for user ID: ${userId}, dimensions: ${metadata.width}x${metadata.height}`);
    res.json({ 
      message: 'Profile image uploaded successfully',
      image_url: `/api/profile/image/${userId}`
    });
    
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /profile/image/{userId}:
 *   get:
 *     tags: [User Profile]
 *     summary: 프로필 이미지 조회
 *     description: 사용자의 프로필 이미지를 가져옵니다
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *     responses:
 *       200:
 *         description: 이미지 파일
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 이미지를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/profile/image/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const db = getDatabase();
    
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT profile_image, profile_image_type FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!result || !result.profile_image) {
      return res.status(404).json({ error: 'Profile image not found' });
    }
    
    res.setHeader('Content-Type', result.profile_image_type);
    res.send(result.profile_image);
    
  } catch (error) {
    console.error('Get profile image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API 명세서와 호환성을 위한 alias
router.put('/profile', authenticateToken, async (req, res) => {
  // PUT /me와 동일한 로직 사용
  try {
    const userId = req.user.sub;
    const { id, name, bio, skills, role } = req.body; // id, role 검증을 위해 추가
    const db = getDatabase();
    
    // 입력 검증 - id가 있어야 함 (API 명세서 요구사항)
    if (id === undefined) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // 필수 필드 검증 - name이 있어야 함
    if (name === undefined || name === null || name === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // role 검증 - 잘못된 role이 있으면 에러
    if (role !== undefined && !['mentor', 'mentee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be mentor or mentee' });
    }
    
    // 사용자 역할 확인
    const userRole = req.user.role;
    
    // role 변경 시도시 에러 (보안상 역할 변경 불허)
    if (role !== undefined && role !== userRole) {
      return res.status(400).json({ error: 'Cannot change user role' });
    }
    
    // skillsets를 JSON 문자열로 변환
    let skillsetsJson = null;
    if (skills && Array.isArray(skills)) {
      skillsetsJson = JSON.stringify(skills);
    }
    
    // 멘티는 skills 설정 불가
    if (userRole === 'mentee' && skills) {
      return res.status(400).json({ error: 'Mentees cannot set skills' });
    }
    
    // 업데이트 쿼리 구성
    let updateQuery = 'UPDATE users SET ';
    let updateParams = [];
    let updateFields = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      updateParams.push(bio);
    }
    
    if (skillsetsJson !== null && userRole === 'mentor') {
      updateFields.push('skillsets = ?');
      updateParams.push(skillsetsJson);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    updateParams.push(userId);
    
    // 업데이트 실행
    await new Promise((resolve, reject) => {
      db.run(updateQuery, updateParams, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 업데이트된 사용자 정보 조회
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, email, role, name, bio, skillsets, 
                profile_image_type, created_at 
         FROM users WHERE id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    // 기본 프로필 이미지 URL 설정
    let profileImageUrl;
    if (updatedUser.profile_image_type) {
      profileImageUrl = `/api/profile/image/${userId}`;
    } else {
      const defaultImage = updatedUser.role === 'mentor' 
        ? 'https://placehold.co/500x500.jpg?text=MENTOR'
        : 'https://placehold.co/500x500.jpg?text=MENTEE';
      profileImageUrl = defaultImage;
    }
    
    // skillsets JSON 파싱
    let skillsets = [];
    if (updatedUser.skillsets) {
      try {
        skillsets = JSON.parse(updatedUser.skillsets);
      } catch (e) {
        console.error('Error parsing skillsets:', e);
      }
    }
    
    console.log(`✅ Profile updated for user ID: ${userId}`);
    
    // API 명세서 형식으로 응답
    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      profile: {
        name: updatedUser.name || '',
        bio: updatedUser.bio || '',
        imageUrl: profileImageUrl,
        skills: updatedUser.role === 'mentor' ? skillsets : undefined
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
