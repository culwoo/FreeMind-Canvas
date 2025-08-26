require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 헤더 설정 (Vercel 도메인 허용)
app.use((req, res, next) => {
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://your-app.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:3001',
        'https://localhost:5173'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Anthropic API 프록시
app.use('/api/anthropic', createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/anthropic': '/v1'
    },
    onProxyReq: (proxyReq, req, res) => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다!');
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        proxyReq.setHeader('x-api-key', apiKey);
        proxyReq.setHeader('anthropic-version', '2023-06-01');
        proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
        
        console.log(`✅ 프록시 요청: ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('❌ 프록시 에러:', err);
        res.status(500).json({ error: '프록시 서버 오류', details: err.message });
    }
}));

app.listen(PORT, () => {
    console.log(`🚀 API 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`🔄 API 프록시: /api/anthropic -> https://api.anthropic.com`);
    console.log(`🔑 API 키 설정됨: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
    console.log(`🌍 허용된 Origin: ${process.env.FRONTEND_URL || 'localhost 개발환경만'}`);
});