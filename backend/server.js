const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { initDatabase } = require('./models/database');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'Tortee - Mentor-Mentee Matching API',
      version: '1.0.0',
      description: 'API for matching mentors and mentees in a mentoring platform',
      contact: {
        name: 'Tortee API Team'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8080/api',
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'] // API 문서가 있는 파일들
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Swagger UI 설정
app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// OpenAPI JSON 제공
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocs);
});

// 루트 경로에서 자동으로 Swagger UI로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/swagger-ui');
});

// API 라우트
app.use('/api', require('./routes/auth').router);
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/mentors'));
app.use('/api', require('./routes/matching'));

// 데이터베이스 초기화 후 서버 시작
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/swagger-ui`);
      console.log(`🔗 OpenAPI JSON: http://localhost:${PORT}/openapi.json`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
