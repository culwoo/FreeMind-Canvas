require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3001;

// CORS 헤더 설정
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 정적 파일 서빙
app.use(express.static('.'));

// Anthropic API 프록시
app.use('/api/anthropic', createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/anthropic': '/v1'
    },
    onProxyReq: (proxyReq, req, res) => {
        // API 키를 환경변수에서 가져오기
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다!');
            return res.status(500).json({ error: 'API key not configured' });
        }
        proxyReq.setHeader('x-api-key', apiKey);
        proxyReq.setHeader('anthropic-version', '2023-06-01');
        proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
        
        console.log(`프록시 요청: ${req.method} ${req.url} -> https://api.anthropic.com${proxyReq.path}`);
        console.log('헤더 설정:', { 'x-api-key': '***', 'anthropic-version': '2023-06-01' });
    },
    onError: (err, req, res) => {
        console.error('프록시 에러:', err);
        res.status(500).json({ error: '프록시 서버 오류', details: err.message });
    }
}));

app.listen(PORT, () => {
    console.log(`✅ 프록시 서버가 http://localhost:${PORT}에서 실행 중입니다`);
    console.log(`📂 정적 파일: ${path.resolve('.')}`);
    console.log(`🔄 API 프록시: /api/anthropic -> https://api.anthropic.com`);
});