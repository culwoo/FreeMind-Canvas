// 환경별 설정
const ENV_CONFIG = {
    development: {
        API_BASE_URL: 'http://localhost:3001'
    },
    production: {
        API_BASE_URL: 'https://freemind-canvas-production.up.railway.app'
    }
};

// 현재 환경 감지
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const currentEnv = isProduction ? 'production' : 'development';

// 설정 내보내기
window.ENV_CONFIG = ENV_CONFIG[currentEnv];

console.log(`🌍 환경: ${currentEnv}`, ENV_CONFIG[currentEnv]);