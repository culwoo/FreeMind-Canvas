import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../app.js';

describe('FreeMindCanvas', () => {
  let app;
  
  beforeEach(() => {
    // HTML 구조 설정
    document.body.innerHTML = `
      <div id="canvasContainer">
        <canvas id="mainCanvas" width="2000" height="1500"></canvas>
      </div>
      <div id="eraserPreview"></div>
      <div id="aiPanel" class="hidden"></div>
      <div id="aiLoading" class="hidden"></div>
      <div id="aiQuestions"></div>
      <div id="saveIndicator" class="hidden"></div>
      <div id="textModal" class="hidden">
        <input id="textInput" />
      </div>
    `;
    
    app = new FreeMindCanvas();
  });

  describe('초기화', () => {
    it('CONFIG 객체가 올바르게 정의되어야 함', () => {
      expect(CONFIG).toBeDefined();
      expect(CONFIG.canvas.width).toBe(2000);
      expect(CONFIG.canvas.height).toBe(1500);
      expect(CONFIG.history.maxSize).toBe(30);
    });

    it('FreeMindCanvas가 올바르게 초기화되어야 함', () => {
      expect(app).toBeDefined();
      expect(app.canvas).toBeDefined();
      expect(app.ctx).toBeDefined();
      expect(app.currentTool).toBe('pen');
      expect(app.currentColor).toBe(CONFIG.drawing.defaultColor);
      expect(app.maxHistorySize).toBe(CONFIG.history.maxSize);
    });

    it('펜과 지우개 크기 배열이 설정되어야 함', () => {
      expect(app.penSizes).toEqual(CONFIG.drawing.penSizes);
      expect(app.eraserSizes).toEqual(CONFIG.drawing.eraserSizes);
    });
  });

  describe('도구 선택', () => {
    it('펜 도구를 선택할 수 있어야 함', () => {
      app.selectTool('pen');
      expect(app.currentTool).toBe('pen');
    });

    it('지우개 도구를 선택할 수 있어야 함', () => {
      app.selectTool('eraser');
      expect(app.currentTool).toBe('eraser');
    });

    it('텍스트 도구를 선택할 수 있어야 함', () => {
      app.selectTool('text');
      expect(app.currentTool).toBe('text');
    });
  });

  describe('크기 선택', () => {
    it('펜 크기를 변경할 수 있어야 함', () => {
      app.selectTool('pen');
      app.selectSize(10);
      expect(app.currentPenSize).toBe(10);
    });

    it('지우개 크기를 변경할 수 있어야 함', () => {
      app.selectTool('eraser');
      app.selectSize(40);
      expect(app.currentEraserSize).toBe(40);
    });

    it('currentSize getter가 올바르게 작동해야 함', () => {
      app.selectTool('pen');
      app.selectSize(15);
      expect(app.currentSize).toBe(15);
      
      app.selectTool('eraser');
      app.selectSize(60);
      expect(app.currentSize).toBe(60);
    });
  });

  describe('색상 선택', () => {
    it('색상을 변경할 수 있어야 함', () => {
      app.selectColor('#FF0000');
      expect(app.currentColor).toBe('#FF0000');
    });
  });

  describe('히스토리 관리', () => {
    it('상태를 저장할 수 있어야 함', () => {
      const initialLength = app.history.length;
      app.saveState();
      expect(app.history.length).toBe(initialLength + 1);
      expect(app.historyStep).toBe(initialLength);
    });

    it('히스토리 크기가 maxHistorySize를 초과하지 않아야 함', () => {
      // maxHistorySize보다 많은 상태 저장
      for (let i = 0; i < CONFIG.history.maxSize + 5; i++) {
        app.saveState();
      }
      
      expect(app.history.length).toBeLessThanOrEqual(CONFIG.history.maxSize);
    });

    it('실행 취소가 작동해야 함', () => {
      app.saveState();
      app.saveState();
      const stepBefore = app.historyStep;
      
      app.undo();
      expect(app.historyStep).toBe(stepBefore - 1);
    });

    it('다시 실행이 작동해야 함', () => {
      app.saveState();
      app.saveState();
      app.undo();
      const stepBefore = app.historyStep;
      
      app.redo();
      expect(app.historyStep).toBe(stepBefore + 1);
    });
  });

  describe('AI 기능', () => {
    it('AI 질문이 정의되어야 함', () => {
      expect(app.aiQuestions).toBeDefined();
      expect(app.aiQuestions.perspective).toBeInstanceOf(Array);
      expect(app.aiQuestions.opposite).toBeInstanceOf(Array);
      expect(app.aiQuestions.concrete).toBeInstanceOf(Array);
    });

    it('AI 질문을 생성할 수 있어야 함', () => {
      app.generateAIQuestions();
      const questionsDiv = document.getElementById('aiQuestions');
      expect(questionsDiv.innerHTML).not.toBe('');
    });
  });

  describe('저장/로드', () => {
    it('캔버스를 저장할 수 있어야 함', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      app.save();
      
      expect(setItemSpy).toHaveBeenCalledWith('freemind-canvas', expect.any(String));
      expect(setItemSpy).toHaveBeenCalledWith('freemind-canvas-timestamp', expect.any(String));
    });
  });

  describe('캔버스 크기 조정', () => {
    it('캔버스 크기를 조정할 수 있어야 함', () => {
      // 컨테이너 크기 모킹
      const container = document.getElementById('canvasContainer');
      container.getBoundingClientRect = vi.fn(() => ({
        width: 1000,
        height: 800
      }));
      
      app.resizeCanvas();
      
      const expectedWidth = Math.min(CONFIG.canvas.maxWidth, 1000 - CONFIG.canvas.margin);
      const expectedHeight = Math.min(CONFIG.canvas.maxHeight, 800 - CONFIG.canvas.margin);
      
      expect(app.canvas.style.width).toBe(expectedWidth + 'px');
      expect(app.canvas.style.height).toBe(expectedHeight + 'px');
    });
  });

  describe('지우개 프리뷰', () => {
    beforeEach(() => {
      // 캔버스와 컨테이너 크기 모킹
      app.canvas.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 100,
        width: 800,
        height: 600
      }));
    });

    it('지우개 도구 선택시 프리뷰 크기가 스케일링에 맞게 설정되어야 함', () => {
      app.selectTool('eraser');
      app.selectSize(40);
      
      app.updateEraserPreviewSize();
      
      // 스케일링 계산 (캔버스 실제 크기 / 화면 크기)
      const scaleX = app.canvas.width / 800; // 2000 / 800 = 2.5
      const expectedDisplaySize = 40 / scaleX; // 40 / 2.5 = 16
      
      expect(app.eraserPreview.style.width).toBe(`${expectedDisplaySize}px`);
      expect(app.eraserPreview.style.height).toBe(`${expectedDisplaySize}px`);
    });

    it('지우개 프리뷰 위치가 마우스 위치와 정확히 일치해야 함', () => {
      app.selectTool('eraser');
      
      const mockEvent = {
        clientX: 300, // 화면상 x 좌표
        clientY: 250  // 화면상 y 좌표
      };
      
      app.updateEraserPreview(mockEvent);
      
      // 캔버스 기준 상대 좌표: 300 - 100 = 200, 250 - 100 = 150
      // 최종 위치: 캔버스 시작점 + 상대 좌표 = 100 + 200 = 300, 100 + 150 = 250
      expect(app.eraserPreview.style.left).toBe('300px');
      expect(app.eraserPreview.style.top).toBe('250px');
    });

    it('캔버스 크기 변경시 지우개 프리뷰도 업데이트되어야 함', () => {
      app.selectTool('eraser');
      const updateSpy = vi.spyOn(app, 'updateEraserPreviewSize');
      
      app.resizeCanvas();
      
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});