const express = require('express');
const { getDatabase } = require('../models/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MatchingRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         mentee_id:
 *           type: integer
 *         mentor_id:
 *           type: integer
 *         message:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, cancelled]
 *         mentee_name:
 *           type: string
 *         mentor_name:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     CreateMatchingRequest:
 *       type: object
 *       required:
 *         - mentor_id
 *         - message
 *       properties:
 *         mentor_id:
 *           type: integer
 *           description: 매칭을 요청할 멘토 ID
 *         message:
 *           type: string
 *           description: 멘토에게 보낼 메시지
 */

/**
 * @swagger
 * /matching/requests:
 *   post:
 *     tags: [Matching]
 *     summary: 매칭 요청 생성
 *     description: 멘티가 특정 멘토에게 매칭 요청을 보냅니다
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMatchingRequest'
 *     responses:
 *       201:
 *         description: 매칭 요청 생성 성공
 *       400:
 *         description: 잘못된 요청 (중복 요청, 권한 없음 등)
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 멘토를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/match-requests', authenticateToken, async (req, res) => {
  try {
    const authenticatedUserId = req.user.sub;
    const userRole = req.user.role;
    const { mentorId, menteeId, message } = req.body;
    
    // 멘티만 요청 가능
    if (userRole !== 'mentee') {
      return res.status(400).json({ error: 'Only mentees can send matching requests' });
    }
    
    // 입력 검증
    if (!mentorId || !message) {
      return res.status(400).json({ error: 'Mentor ID and message are required' });
    }
    
    // menteeId가 제공되었다면 인증된 사용자와 일치하는지 확인
    // 제공되지 않았다면 인증된 사용자 ID 사용
    let finalMenteeId = menteeId;
    if (menteeId) {
      if (parseInt(authenticatedUserId) !== parseInt(menteeId)) {
        return res.status(400).json({ error: 'You can only send requests as yourself' });
      }
    } else {
      finalMenteeId = authenticatedUserId;
    }
    
    const db = getDatabase();
    
    // 멘토 존재 확인
    const mentor = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE id = ? AND role = ?',
        [mentorId, 'mentor'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
     // 중복 요청 확인 (같은 멘토에게)
    const existingRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM matching_requests WHERE mentee_id = ? AND mentor_id = ?',
        [finalMenteeId, mentorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'You have already sent a request to this mentor' });
    }

    // 다른 멘토에게 보낸 pending 요청 확인 (비즈니스 로직: 한 번에 하나의 요청만)
    const pendingRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, mentor_id FROM matching_requests WHERE mentee_id = ? AND status = ?',
        [finalMenteeId, 'pending'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (pendingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending request. Please wait for a response or cancel it first.' 
      });
    }

    // 매칭 요청 생성
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO matching_requests (mentee_id, mentor_id, message) VALUES (?, ?, ?)',
        [finalMenteeId, mentorId, message],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    console.log(`✅ Matching request created: Mentee ${finalMenteeId} -> Mentor ${mentorId}`);

    // API 스펙에 맞는 응답 형식
    res.status(200).json({ 
      id: result.id,
      mentorId: mentorId,
      menteeId: finalMenteeId,
      message: message,
      status: 'pending'
    });
    
  } catch (error) {
    console.error('Create matching request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /matching/requests:
 *   get:
 *     tags: [Matching]
 *     summary: 매칭 요청 목록 조회
 *     description: 사용자의 역할에 따라 보낸 요청(멘티) 또는 받은 요청(멘토) 목록을 조회합니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, cancelled]
 *         description: 요청 상태로 필터링
 *     responses:
 *       200:
 *         description: 매칭 요청 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MatchingRequest'
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.get('/match-requests/incoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userRole = req.user.role;
    const { status } = req.query;
    const db = getDatabase();
    
    // 멘토만 접근 가능
    if (userRole !== 'mentor') {
      return res.status(403).json({ error: 'Only mentors can access incoming requests' });
    }
    
    let query = `
      SELECT mr.*, u.name as mentee_name
      FROM matching_requests mr
      LEFT JOIN users u ON mr.mentee_id = u.id
      WHERE mr.mentor_id = ?
    `;
    let queryParams = [userId];
    
    // 상태 필터링
    if (status) {
      query += ' AND mr.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY mr.created_at DESC';
    
    const requests = await new Promise((resolve, reject) => {
      db.all(query, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // API 스펙에 맞게 배열로 응답
    res.json(requests.map(req => ({
      id: req.id,
      mentorId: req.mentor_id,
      menteeId: req.mentee_id,
      message: req.message,
      status: req.status
    })));
    
  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /match-requests/outgoing:
 *   get:
 *     tags: [Matching]
 *     summary: 내가 보낸 요청 목록 (멘티 전용)
 *     description: 멘티가 보낸 매칭 요청 목록을 조회합니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, cancelled]
 *         description: 요청 상태로 필터링
 *     responses:
 *       200:
 *         description: 매칭 요청 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MatchingRequest'
 *       401:
 *         description: 인증 필요
 *       500:
 *         description: 서버 오류
 */
router.get('/match-requests/outgoing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userRole = req.user.role;
    const { status } = req.query;
    const db = getDatabase();
    
    // 멘티만 접근 가능
    if (userRole !== 'mentee') {
      return res.status(403).json({ error: 'Only mentees can access outgoing requests' });
    }
    
    let query = `
      SELECT mr.*, u.name as mentor_name
      FROM matching_requests mr
      LEFT JOIN users u ON mr.mentor_id = u.id
      WHERE mr.mentee_id = ?
    `;
    let queryParams = [userId];
    
    // 상태 필터링
    if (status) {
      query += ' AND mr.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY mr.created_at DESC';
    
    const requests = await new Promise((resolve, reject) => {
      db.all(query, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // API 스펙에 맞게 배열로 응답
    res.json(requests.map(req => ({
      id: req.id,
      mentorId: req.mentor_id,
      menteeId: req.mentee_id,
      status: req.status
    })));
    
  } catch (error) {
    console.error('Get outgoing requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /matching/requests/{requestId}/accept:
 *   post:
 *     tags: [Matching]
 *     summary: 매칭 요청 수락
 *     description: 멘토가 매칭 요청을 수락합니다. 수락 시 다른 모든 요청은 자동으로 거절됩니다.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     responses:
 *       200:
 *         description: 요청 수락 성공
 *       400:
 *         description: 잘못된 요청 (권한 없음, 이미 처리됨 등)
 *       404:
 *         description: 요청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/match-requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const mentorId = req.user.sub;
    const userRole = req.user.role;
    const requestId = req.params.id;
    
    // 멘토만 수락 가능
    if (userRole !== 'mentor') {
      return res.status(400).json({ error: 'Only mentors can accept requests' });
    }
    
    const db = getDatabase();
    
    // 요청 확인
    const request = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM matching_requests WHERE id = ? AND mentor_id = ?',
        [requestId, mentorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Matching request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }
    
    // 트랜잭션 시작하여 원자성 보장
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // 해당 요청 수락
        db.run(
          'UPDATE matching_requests SET status = ? WHERE id = ?',
          ['accepted', requestId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
          }
        );
        
        // 해당 멘토에게 온 다른 모든 pending 요청들을 자동 거절
        db.run(
          'UPDATE matching_requests SET status = ? WHERE mentor_id = ? AND id != ? AND status = ?',
          ['rejected', mentorId, requestId, 'pending'],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            console.log(`✅ Auto-rejected ${this.changes} other requests for mentor ${mentorId}`);
          }
        );
        
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
    
    console.log(`✅ Matching request accepted: Request ${requestId} by Mentor ${mentorId}`);
    
    // 업데이트된 요청 정보 조회하여 반환 (API 명세서에 맞게)
    const updatedRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM matching_requests WHERE id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (updatedRequest) {
      // camelCase로 변환하여 반환
      res.json({
        id: updatedRequest.id,
        mentorId: updatedRequest.mentor_id,
        menteeId: updatedRequest.mentee_id,
        message: updatedRequest.message,
        status: updatedRequest.status
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve updated request' });
    }
    
  } catch (error) {
    console.error('Accept matching request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /matching/requests/{requestId}/reject:
 *   post:
 *     tags: [Matching]
 *     summary: 매칭 요청 거절
 *     description: 멘토가 매칭 요청을 거절합니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     responses:
 *       200:
 *         description: 요청 거절 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 요청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/match-requests/:id/reject', authenticateToken, async (req, res) => {
  try {
    const mentorId = req.user.sub;
    const userRole = req.user.role;
    const requestId = req.params.id;
    
    // 멘토만 거절 가능
    if (userRole !== 'mentor') {
      return res.status(400).json({ error: 'Only mentors can reject requests' });
    }
    
    const db = getDatabase();
    
    // 요청 확인 및 업데이트
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE matching_requests SET status = ? WHERE id = ? AND mentor_id = ? AND status = ?',
        ['rejected', requestId, mentorId, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Matching request not found or already processed' });
    }
    
    console.log(`✅ Matching request rejected: Request ${requestId} by Mentor ${mentorId}`);
    
    // 업데이트된 요청 정보 조회하여 반환 (API 명세서에 맞게)
    const updatedRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM matching_requests WHERE id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (updatedRequest) {
      // camelCase로 변환하여 반환
      res.json({
        id: updatedRequest.id,
        mentorId: updatedRequest.mentor_id,
        menteeId: updatedRequest.mentee_id,
        message: updatedRequest.message,
        status: updatedRequest.status
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve updated request' });
    }
    
  } catch (error) {
    console.error('Reject matching request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /matching/requests/{requestId}/cancel:
 *   delete:
 *     tags: [Matching]
 *     summary: 매칭 요청 취소
 *     description: 멘티가 보낸 매칭 요청을 취소합니다
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 매칭 요청 ID
 *     responses:
 *       200:
 *         description: 요청 취소 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 요청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/match-requests/:id', authenticateToken, async (req, res) => {
  try {
    const menteeId = req.user.sub;
    const userRole = req.user.role;
    const requestId = req.params.id;
    
    // 멘티만 취소 가능
    if (userRole !== 'mentee') {
      return res.status(400).json({ error: 'Only mentees can cancel their requests' });
    }
    
    const db = getDatabase();
    
    // 요청 취소 (pending 상태인 것만)
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE matching_requests SET status = ? WHERE id = ? AND mentee_id = ? AND status = ?',
        ['cancelled', requestId, menteeId, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Matching request not found or cannot be cancelled' });
    }
    
    console.log(`✅ Matching request cancelled: Request ${requestId} by Mentee ${menteeId}`);
    
    // 업데이트된 요청 정보 조회하여 반환 (API 명세서에 맞게)
    const updatedRequest = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM matching_requests WHERE id = ?',
        [requestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (updatedRequest) {
      // camelCase로 변환하여 반환
      res.json({
        id: updatedRequest.id,
        mentorId: updatedRequest.mentor_id,
        menteeId: updatedRequest.mentee_id,
        message: updatedRequest.message,
        status: updatedRequest.status
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve updated request' });
    }
    
  } catch (error) {
    console.error('Cancel matching request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
