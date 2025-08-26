// 테스트 환경 설정
import { beforeEach, vi } from 'vitest';

// 모든 테스트 전에 DOM 초기화
beforeEach(() => {
  document.body.innerHTML = '';
  
  // localStorage mock
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  global.localStorage = localStorageMock;
  
  // Canvas mock
  global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalCompositeOperation: 'source-over',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    createImageData: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  }));
  
  global.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
});

// 전역 함수 mock
global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => 'test');