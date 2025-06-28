const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../models/database');

const router = express.Router();

// JWT 비밀키 (실제 운영에서는 환경변수 사용)
const JWT_SECRET = 'tortee-secret-key-for-mvp';

/**
 * @swagger
 * components:
 *   schemas:
 *     SignupRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일
 *         password:
 *           type: string
 *           minLength: 6
 *           description: 비밀번호
 *         role:
 *           type: string
 *           enum: [mentor, mentee]
 *           description: 사용자 역할
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일
 *         password:
 *           type: string
 *           description: 비밀번호
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT 액세스 토큰
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             name:
 *               type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: 오류 메시지
 */

/**
 * @swagger
 * /signup:
 *   post:
 *     tags: [Authentication]
 *     summary: 사용자 회원가입
 *     description: 새로운 사용자를 멘토 또는 멘티로 등록합니다
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 존재하는 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // 입력 검증
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    
    if (!['mentor', 'mentee'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either mentor or mentee' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const db = getDatabase();
    
    // 이메일 중복 확인
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 사용자 생성 (name 포함)
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name || '', role],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
    
    console.log(`✅ New ${role} registered: ${email} (ID: ${result.id})`);
    res.status(201).json({ message: 'User created successfully', userId: result.id });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Authentication]
 *     summary: 사용자 로그인
 *     description: 이메일과 비밀번호로 인증하고 JWT 토큰을 발급합니다
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: 잘못된 요청 데이터
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const db = getDatabase();
    
    // 사용자 조회
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email, password, role, name FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // JWT 토큰 생성 (RFC 7519 표준 클레임 포함)
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      // 표준 클레임
      iss: 'tortee-app',           // Issuer
      sub: user.id.toString(),     // Subject
      aud: 'tortee-users',         // Audience
      exp: now + 3600,             // Expiration (1시간)
      nbf: now,                    // Not Before
      iat: now,                    // Issued At
      jti: `${user.id}-${now}`,    // JWT ID
      
      // 커스텀 클레임
      name: user.name || '',
      email: user.email,
      role: user.role
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET);
    
    console.log(`✅ User logged in: ${email} (${user.role})`);
    
    // API 명세서에 맞게 token만 반환
    res.json({
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// JWT 토큰 검증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = { router, authenticateToken };
