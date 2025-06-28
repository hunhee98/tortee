const express = require('express');
const { getDatabase } = require('../models/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Mentor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
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
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /mentors:
 *   get:
 *     tags: [Mentors]
 *     summary: 멘토 목록 조회
 *     description: 등록된 모든 멘토의 목록을 가져옵니다. 기술 스택으로 필터링 및 정렬이 가능합니다.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: skill
 *         schema:
 *           type: string
 *         description: 기술 스택으로 필터링 (부분 일치)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, skill, created_at]
 *           default: created_at
 *         description: 정렬 기준
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 정렬 순서
 *     responses:
 *       200:
 *         description: 멘토 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mentors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Mentor'
 *                 total:
 *                   type: integer
 *                   description: 총 멘토 수
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.get('/mentors', authenticateToken, async (req, res) => {
  try {
    const { skill, order_by = 'created_at', order = 'desc' } = req.query;
    const db = getDatabase();
    
    // 기본 쿼리
    let query = `
      SELECT id, email, role, name, bio, skillsets, profile_image_type, created_at
      FROM users 
      WHERE role = 'mentor'
    `;
    let queryParams = [];
    
    // 기술 스택 필터링
    if (skill) {
      query += ` AND (skillsets LIKE ? OR skillsets IS NULL)`;
      queryParams.push(`%${skill}%`);
    }
    
    // 정렬 추가 (order_by 파라미터 사용)
    const validSortFields = ['name', 'skill', 'created_at'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(order_by) && validOrders.includes(order.toLowerCase())) {
      if (order_by === 'skill') {
        // 기술 스택으로 정렬하는 경우, skillsets 필드로 정렬
        query += ` ORDER BY skillsets ${order.toUpperCase()}`;
      } else {
        query += ` ORDER BY ${order_by} ${order.toUpperCase()}`;
      }
    } else {
      // 기본값: mentor ID 기준 오름차순 (명세서에 맞게)
      query += ` ORDER BY id ASC`;
    }
    
    const mentors = await new Promise((resolve, reject) => {
      db.all(query, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // 응답 데이터 포맷팅
    const formattedMentors = mentors.map(mentor => {
      // 기본 프로필 이미지 URL 설정
      let profileImageUrl;
      if (mentor.profile_image_type) {
        profileImageUrl = `/api/profile/image/${mentor.id}`;
      } else {
        profileImageUrl = 'https://placehold.co/500x500.jpg?text=MENTOR';
      }
      
      // skillsets JSON 파싱
      let skillsets = [];
      if (mentor.skillsets) {
        try {
          skillsets = JSON.parse(mentor.skillsets);
        } catch (e) {
          console.error('Error parsing skillsets for mentor:', mentor.id, e);
        }
      }
      
      return {
        id: mentor.id,
        email: mentor.email,
        role: mentor.role,
        profile: {
          name: mentor.name || 'Anonymous Mentor',
          bio: mentor.bio || '',
          imageUrl: profileImageUrl,
          skills: skillsets
        }
      };
    });
    
    // 기술 스택으로 추가 필터링 (JSON 내부 검색)
    let filteredMentors = formattedMentors;
    if (skill) {
      filteredMentors = formattedMentors.filter(mentor => 
        mentor.profile.skills.some(s => 
          s.toLowerCase().includes(skill.toLowerCase())
        )
      );
    }
    
    // 기술 스택으로 정렬하는 경우 추가 정렬
    if (order_by === 'skill') {
      filteredMentors.sort((a, b) => {
        const skillA = a.profile.skills.join(', ').toLowerCase();
        const skillB = b.profile.skills.join(', ').toLowerCase();
        
        if (order.toLowerCase() === 'asc') {
          return skillA.localeCompare(skillB);
        } else {
          return skillB.localeCompare(skillA);
        }
      });
    }
    
    console.log(`✅ Fetched ${filteredMentors.length} mentors`);
    
    // API 스펙에 맞게 배열로 직접 응답
    res.json(filteredMentors);
    
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /mentors/{mentorId}:
 *   get:
 *     tags: [Mentors]
 *     summary: 특정 멘토 정보 조회
 *     description: 멘토 ID로 특정 멘토의 상세 정보를 가져옵니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mentorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 멘토 ID
 *     responses:
 *       200:
 *         description: 멘토 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Mentor'
 *       404:
 *         description: 멘토를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.get('/mentors/:mentorId', authenticateToken, async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    const db = getDatabase();
    
    const mentor = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, name, bio, skillsets, profile_image_type, created_at
         FROM users 
         WHERE id = ? AND role = 'mentor'`,
        [mentorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    
    // 기본 프로필 이미지 URL 설정
    let profileImageUrl;
    if (mentor.profile_image_type) {
      profileImageUrl = `/api/profile/image/${mentor.id}`;
    } else {
      profileImageUrl = 'https://placehold.co/500x500.jpg?text=MENTOR';
    }
    
    // skillsets JSON 파싱
    let skillsets = [];
    if (mentor.skillsets) {
      try {
        skillsets = JSON.parse(mentor.skillsets);
      } catch (e) {
        console.error('Error parsing skillsets for mentor:', mentor.id, e);
      }
    }
    
    res.json({
      id: mentor.id,
      name: mentor.name || 'Anonymous Mentor',
      bio: mentor.bio || '',
      skillsets: skillsets,
      profile_image_url: profileImageUrl,
      created_at: mentor.created_at
    });
    
  } catch (error) {
    console.error('Get mentor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
