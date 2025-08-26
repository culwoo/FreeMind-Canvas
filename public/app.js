console.log('🚀 app.js 로딩 시작');

// 애플리케이션 설정 객체
const CONFIG = {
    canvas: {
        width: 2000,
        height: 1500,
        maxWidth: 2000,
        maxHeight: 1500,
        margin: 32
    },
    drawing: {
        defaultPenSize: 5,
        defaultEraserSize: 20,
        penSizes: [2, 5, 10, 15, 20],
        eraserSizes: [10, 20, 40, 60, 80],
        defaultColor: '#000000'
    },
    history: {
        maxSize: 30
    },
    autoSave: {
        intervalMs: 30000
    },
    ai: {
        loadingDelayMs: 1500,
        maxQuestions: 3,
        // API 키는 서버에서 처리하므로 제거
        getApiEndpoint: () => {
            const baseUrl = window.ENV_CONFIG?.API_BASE_URL || '';
            return `${baseUrl}/api/anthropic/messages`;
        },
        model: 'claude-sonnet-4-20250514',
        maxTokens: 3000,
        fallbackToRandom: true
    },
    touch: {
        minTouchSize: 44 // 최소 터치 타겟 크기 (px)
    }
};

class FreeMindCanvas {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.eraserPreview = document.getElementById('eraserPreview');
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = CONFIG.drawing.defaultColor;
        this.currentPenSize = CONFIG.drawing.defaultPenSize;
        this.currentEraserSize = CONFIG.drawing.defaultEraserSize;
        this.history = [];
        this.historyStep = -1;
        this.maxHistorySize = CONFIG.history.maxSize;
        this.textElements = [];
        this.lastPoint = null;
        
        // Pen and eraser sizes
        this.penSizes = CONFIG.drawing.penSizes;
        this.eraserSizes = CONFIG.drawing.eraserSizes;
        
        // AI Questions data
        this.aiQuestions = {
            perspective: [
                "어떤 관점에서 이 문제를 다르게 볼 수 있을까요?",
                "경제적/사회적/개인적 측면에서는 어떨까요?",
                "다른 사람들은 어떻게 생각할까요?"
            ],
            opposite: [
                "만약 반대 입장이라면 어떤 반박을 할까요?",
                "이것의 단점이나 위험은 무엇일까요?",
                "왜 실패할 수 있을까요?"
            ],
            concrete: [
                "더 구체적으로 나누면 어떤 단계들이 필요할까요?",
                "실행할 때 예상되는 장애물은?",
                "첫 번째 단계는 무엇일까요?"
            ],
            connection: [
                "이것과 연결될 수 있는 다른 아이디어는?",
                "A와 B 사이에는 어떤 관계가 있을까요?",
                "놓친 연결점이 있을까요?"
            ],
            priority: [
                "가장 중요한 우선순위는 무엇인가요?",
                "가장 먼저 해결해야 할 것은?",
                "리소스가 제한적이라면 무엇부터?"
            ]
        };

        this.init();
        this.setupEventListeners();
        this.setupAutoSave();
        this.loadFromStorage();
    }

    init() {
        // Set canvas size
        this.resizeCanvas();
        
        // Set initial drawing style
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.currentColor;
        this.updateCanvasStyle();

        // Save initial state
        this.saveState();

        // Set initial cursor and eraser preview
        this.updateCursor();
        this.updateEraserPreviewSize();
        this.updateSizeButtons();
    }

    updateCanvasStyle() {
        if (this.currentTool === 'pen') {
            this.ctx.lineWidth = this.currentPenSize;
        }
        // For eraser, we handle size in the drawing logic
    }

    get currentSize() {
        return this.currentTool === 'eraser' ? this.currentEraserSize : this.currentPenSize;
    }

    resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        const rect = container.getBoundingClientRect();
        
        // Make canvas responsive but maintain drawing area
        const maxWidth = Math.min(CONFIG.canvas.maxWidth, rect.width - CONFIG.canvas.margin);
        const maxHeight = Math.min(CONFIG.canvas.maxHeight, rect.height - CONFIG.canvas.margin);
        
        this.canvas.style.width = maxWidth + 'px';
        this.canvas.style.height = maxHeight + 'px';
        
        // 캔버스 크기 변경시 지우개 프리뷰 크기도 업데이트
        if (this.currentTool === 'eraser') {
            this.updateEraserPreviewSize();
        }
    }

    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.dataset.tool);
            });
        });

        // Brush size selection
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectSize(parseInt(e.target.dataset.size));
            });
        });

        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectColor(e.target.dataset.color);
            });
        });

        // Custom color picker
        document.getElementById('customColor').addEventListener('change', (e) => {
            this.selectColor(e.target.value);
        });

        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Save and export
        document.getElementById('saveBtn').addEventListener('click', () => this.save());
        document.getElementById('exportBtn').addEventListener('click', () => this.export());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());

        // AI help
        document.getElementById('aiHelpBtn').addEventListener('click', () => this.showAIHelp());
        document.getElementById('aiCloseBtn').addEventListener('click', () => this.hideAIPanel());

        // Text modal
        document.getElementById('textOkBtn').addEventListener('click', () => this.confirmText());
        document.getElementById('textCancelBtn').addEventListener('click', () => this.cancelText());
        document.getElementById('textInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.confirmText();
            if (e.key === 'Escape') this.cancelText();
        });

        // Canvas drawing events
        this.canvas.addEventListener('mousedown', this.startDraw.bind(this));
        this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDraw.bind(this));
        this.canvas.addEventListener('mouseout', this.handleMouseLeave.bind(this));

        // Canvas container mouse events for eraser preview
        const canvasContainer = document.getElementById('canvasContainer');
        canvasContainer.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        canvasContainer.addEventListener('mousemove', this.handleContainerMouseMove.bind(this));
        canvasContainer.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.stopDraw.bind(this));

        // Double click for text - listen on canvas container
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 's') {
                    e.preventDefault();
                    this.save();
                }
            }
        });

        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        this.updateCursor();
        this.updateCanvasStyle();
        this.updateSizeButtons();
        
        // Update eraser preview visibility and size
        if (tool === 'eraser') {
            this.updateEraserPreviewSize();
            // Show preview if mouse is over canvas container
            const canvasContainer = document.getElementById('canvasContainer');
            if (canvasContainer.matches(':hover')) {
                this.eraserPreview.style.display = 'block';
            }
        } else {
            this.hideEraserPreview();
        }
    }

    updateSizeButtons() {
        const sizes = this.currentTool === 'eraser' ? this.eraserSizes : this.penSizes;
        const currentSize = this.currentSize;
        const sizeButtons = document.querySelectorAll('.size-btn');
        
        // Update size button data and content
        sizeButtons.forEach((btn, index) => {
            if (index < sizes.length) {
                btn.dataset.size = sizes[index];
                btn.style.display = 'flex';
                // Update visual indicator based on size
                if (sizes[index] <= 5) {
                    btn.textContent = '•';
                    btn.style.fontSize = '12px';
                } else if (sizes[index] <= 15) {
                    btn.textContent = '●';
                    btn.style.fontSize = '16px';
                } else if (sizes[index] <= 40) {
                    btn.textContent = '●';
                    btn.style.fontSize = '20px';
                } else {
                    btn.textContent = '●';
                    btn.style.fontSize = '24px';
                }
                
                // Set active state
                if (sizes[index] === currentSize) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            } else {
                btn.style.display = 'none';
            }
        });
    }

    selectSize(size) {
        if (this.currentTool === 'eraser') {
            this.currentEraserSize = size;
        } else {
            this.currentPenSize = size;
        }
        
        this.updateCanvasStyle();
        this.updateSizeButtons();
        this.updateEraserPreviewSize();
    }

    selectColor(color) {
        this.currentColor = color;
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-color="${color}"]`)?.classList.add('active');
    }

    updateCursor() {
        const container = document.getElementById('canvasContainer');
        container.className = `canvas-container ${this.currentTool}-cursor`;
    }

    updateEraserPreviewSize() {
        if (this.eraserPreview) {
            // 캔버스 스케일링을 고려한 지우개 프리뷰 크기 설정
            const canvasRect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / canvasRect.width;
            
            // 실제 지우개 크기를 화면 크기로 변환 (스케일링 역보정)
            const displaySize = this.currentEraserSize / scaleX;
            
            this.eraserPreview.style.width = `${displaySize}px`;
            this.eraserPreview.style.height = `${displaySize}px`;
        }
    }

    updateEraserPreview(e) {
        if (this.currentTool !== 'eraser' || !this.eraserPreview) {
            this.hideEraserPreview();
            return;
        }
        
        if (e) {
            // 캔버스 요소의 위치 정보 가져오기
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // 마우스 위치를 캔버스 상대 좌표로 변환
            const relativeX = e.clientX - canvasRect.left;
            const relativeY = e.clientY - canvasRect.top;
            
            // 캔버스 스케일링 고려
            const scaleX = this.canvas.width / canvasRect.width;
            const scaleY = this.canvas.height / canvasRect.height;
            
            // 실제 지우개 크기를 화면 크기로 변환 (스케일링 역보정)
            const displaySize = this.currentEraserSize / scaleX;
            
            // 프리뷰를 캔버스 기준으로 위치 조정
            const previewX = canvasRect.left + relativeX;
            const previewY = canvasRect.top + relativeY;
            
            // 지우개 프리뷰 크기와 위치 업데이트
            this.eraserPreview.style.width = `${displaySize}px`;
            this.eraserPreview.style.height = `${displaySize}px`;
            this.eraserPreview.style.left = `${previewX}px`;
            this.eraserPreview.style.top = `${previewY}px`;
            this.eraserPreview.style.display = 'block';
        }
    }

    hideEraserPreview() {
        if (this.eraserPreview) {
            this.eraserPreview.style.display = 'none';
        }
    }

    handleMouseEnter(e) {
        if (this.currentTool === 'eraser') {
            this.updateEraserPreview(e);
        }
    }

    handleContainerMouseMove(e) {
        if (this.currentTool === 'eraser') {
            this.updateEraserPreview(e);
        }
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handlePointerMove(e) {
        // Update eraser preview at exact pointer location
        this.updateEraserPreview(e);
        
        // Handle drawing if in progress
        if (this.isDrawing) {
            this.draw(e);
        }
    }

    handleMouseLeave() {
        this.stopDraw();
        this.hideEraserPreview();
    }

    startDraw(e) {
        if (this.currentTool === 'text') return;
        
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.lastPoint = pos;
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentPenSize;
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'eraser') {
            // Start erasing immediately with circular erasing
            this.ctx.globalCompositeOperation = 'destination-out';
            const radius = this.currentEraserSize / 2;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    draw(e) {
        if (!this.isDrawing || this.currentTool === 'text') return;
        
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'pen') {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentPenSize;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (this.currentTool === 'eraser') {
            // Use ONLY circular erasing with consistent size matching the preview
            this.ctx.globalCompositeOperation = 'destination-out';
            const radius = this.currentEraserSize / 2;
            
            // Draw line of circles for smooth erasing between points
            if (this.lastPoint) {
                const distance = Math.sqrt(
                    (pos.x - this.lastPoint.x) ** 2 + (pos.y - this.lastPoint.y) ** 2
                );
                const steps = Math.max(1, Math.floor(distance / (radius / 3)));
                
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const px = this.lastPoint.x + (pos.x - this.lastPoint.x) * t;
                    const py = this.lastPoint.y + (pos.y - this.lastPoint.y) * t;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, radius, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }
            
            // Draw circle at current position
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        this.lastPoint = pos;
    }

    stopDraw() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.lastPoint = null;
            // Reset composite operation to default
            this.ctx.globalCompositeOperation = 'source-over';
            this.saveState();
        }
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        // Update eraser preview for touch
        this.updateEraserPreview(mouseEvent);
        this.startDraw(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handlePointerMove(mouseEvent);
    }

    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        this.pendingTextPos = pos;
        this.showTextModal();
    }

    showTextModal() {
        const modal = document.getElementById('textModal');
        const input = document.getElementById('textInput');
        modal.classList.remove('hidden');
        input.focus();
        input.value = '';
    }

    confirmText() {
        const input = document.getElementById('textInput');
        const text = input.value.trim();
        
        if (text && this.pendingTextPos) {
            // Reset composite operation for text
            this.ctx.globalCompositeOperation = 'source-over';
            
            // Set proper font and style
            const fontSize = Math.max(14, this.currentPenSize * 2);
            this.ctx.font = `${fontSize}px Arial, sans-serif`;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            
            // Draw text on canvas
            this.ctx.fillText(text, this.pendingTextPos.x, this.pendingTextPos.y);
            
            // 텍스트 요소를 배열에 저장 (AI 분석용)
            this.textElements.push({
                text: text,
                x: this.pendingTextPos.x,
                y: this.pendingTextPos.y,
                fontSize: fontSize,
                color: this.currentColor,
                timestamp: new Date().toISOString()
            });
            
            this.saveState();
        }
        
        this.hideTextModal();
    }

    cancelText() {
        this.hideTextModal();
    }

    hideTextModal() {
        document.getElementById('textModal').classList.add('hidden');
        this.pendingTextPos = null;
    }

    // 마인드맵 컨텍스트 정보 수집
    getCanvasContext() {
        return {
            timestamp: new Date().toISOString(),
            textElements: this.textElements,
            drawingComplexity: this.history.length,
            currentTool: this.currentTool,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            totalTexts: this.textElements.length
        };
    }

    // Anthropic Claude API를 통한 마인드맵 분석
    async analyzeWithClaude(imageData, context) {
        try {
            const apiEndpoint = CONFIG.ai.getApiEndpoint();
            console.log('🔍 API 요청 시작:', {
                endpoint: apiEndpoint,
                model: CONFIG.ai.model,
                imageSize: imageData ? imageData.length : 0,
                textCount: context.textCount
            });

            const requestBody = {
                model: CONFIG.ai.model,
                max_tokens: CONFIG.ai.maxTokens,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: imageData.split(',')[1]
                            }
                        },
                        {
                            type: 'text',
                            text: `이 마인드맵을 분석하여 사고를 확장할 수 있는 구체적인 질문 3개를 생성해주세요.

현재 상황: 텍스트 요소 ${context.textCount}개, 복잡도 ${context.complexity}/10

반드시 다음 형식으로만 답변해주세요:

1. [마인드맵 내용을 기반으로 한 구체적인 실행 질문]?
2. [새로운 관점이나 다른 분야와의 연결을 묻는 질문]?
3. [잠재적 문제점이나 개선사항을 묻는 질문]?

예시:
1. 이 아이디어를 실제로 구현하려면 어떤 첫 번째 단계부터 시작해야 할까요?
2. 이 주제를 다른 산업 분야에 적용한다면 어떤 새로운 기회가 생길까요?
3. 현재 계획에서 가장 큰 위험 요소는 무엇이며 어떻게 대비할 수 있을까요?

위 예시처럼 실제 질문 내용만 작성하고, 제목이나 설명은 포함하지 마세요.`
                        }
                    ]
                }]
            };

            console.log('📤 요청 페이로드 크기:', JSON.stringify(requestBody).length, 'bytes');

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // API 키는 프록시 서버에서 자동으로 추가됨
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 API 응답 상태:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API 요청 실패:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ API 응답 성공:', data);
            return data;

        } catch (error) {
            console.error('Claude API 호출 실패:', error);
            throw error;
        }
    }

    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
        
        // 히스토리 크기 제한으로 메모리 사용량 관리
        if (this.history.length > this.maxHistorySize) {
            this.history.shift(); // 가장 오래된 상태 제거
            this.historyStep = Math.max(0, this.historyStep - 1);
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
        }
    }

    restoreState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    async showAIHelp() {
        const panel = document.getElementById('aiPanel');
        const loading = document.getElementById('aiLoading');
        const questionsDiv = document.getElementById('aiQuestions');
        
        // First show the panel
        panel.classList.remove('hidden');
        
        // Show loading and clear questions
        loading.classList.remove('hidden');
        questionsDiv.innerHTML = '';
        
        try {
            // 실제 AI 분석 요청
            const imageData = this.canvas.toDataURL('image/png');
            const context = this.getCanvasContext();
            
            console.log('AI 분석 시작...', { 
                textCount: context.totalTexts, 
                complexity: context.drawingComplexity 
            });
            
            const aiResponse = await this.analyzeWithClaude(imageData, {
                textCount: context.totalTexts,
                complexity: context.drawingComplexity
            });
            
            // AI 응답에서 질문 추출
            const responseContent = aiResponse.content[0].text;
            
            // JSON 파싱 대신 직접 질문 추출
            const questions = this.extractQuestionsFromText(responseContent);
            
            loading.classList.add('hidden');
            this.displayAIQuestions(questions);
            
            console.log('AI 분석 완료:', questions);
            
        } catch (error) {
            console.error('AI 분석 실패:', error);
            loading.classList.add('hidden');
            
            // 폴백: 기존 랜덤 질문 사용
            if (CONFIG.ai.fallbackToRandom) {
                console.log('폴백 모드: 랜덤 질문 사용');
                this.generateAIQuestions();
                this.showNotification('AI 분석에 실패했습니다. 일반 질문을 제공합니다.');
            } else {
                questionsDiv.innerHTML = `
                    <div class="ai-question">
                        <div class="ai-question-text">AI 분석에 실패했습니다. 잠시 후 다시 시도해주세요.</div>
                        <div class="ai-question-actions">
                            <button class="btn btn--sm btn--outline" onclick="app.hideAIPanel()">닫기</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    // AI 응답에서 질문 추출 (개선된 버전)
    extractQuestionsFromText(text) {
        const questions = [];
        
        // 다양한 패턴으로 질문 추출
        const patterns = [
            // **1. [제목]** 형식
            /\*\*(\d+)\.\s*\[([^\]]+)\]\*\*\s*([^*]+?)(?=\*\*\d+\.|$)/gs,
            // 1. 질문내용 형식
            /^(\d+)\.\s*(.+)$/gm,
            // **질문:** 형식  
            /\*\*(.+?):\*\*\s*([^*]+?)(?=\*\*|$)/gs,
            // 줄바꿈으로 구분된 질문들
            /([가-힣].{20,}[?？])/g
        ];
        
        // 각 패턴 시도
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length >= 3) {
                // **1. [제목]** 패턴인 경우
                let fullMatches = [...text.matchAll(patterns[0])];
                if (fullMatches.length >= 3) {
                    fullMatches.slice(0, 3).forEach(match => {
                        const title = match[2].trim(); // [제목] 부분
                        const content = match[3].trim(); // 질문 내용
                        questions.push({ 
                            text: content || title,
                            title: title
                        });
                    });
                    break;
                }
                
                // 일반 숫자. 패턴인 경우
                fullMatches = [...text.matchAll(patterns[1])];
                if (fullMatches.length >= 3) {
                    fullMatches.slice(0, 3).forEach(match => {
                        questions.push({ text: match[2].trim() });
                    });
                    break;
                }
            }
        }
        
        // 질문이 여전히 없으면 물음표로 끝나는 문장들 찾기
        if (questions.length === 0) {
            const questionSentences = text.match(/[^.!?]*[?？][^.!?]*/g);
            if (questionSentences && questionSentences.length > 0) {
                questionSentences.slice(0, 3).forEach(q => {
                    const cleaned = q.trim().replace(/^\*+|\*+$/g, '').replace(/^#+\s*/, '');
                    if (cleaned.length > 10) {
                        questions.push({ text: cleaned });
                    }
                });
            }
        }
        
        // 마지막 대안: 텍스트를 3등분
        if (questions.length === 0 && text.trim()) {
            const cleaned = text.replace(/[*#]/g, '').trim();
            questions.push({ text: cleaned.substring(0, Math.min(200, cleaned.length)) + '...' });
        }
        
        return questions.length > 0 ? questions : [{ text: "질문을 추출할 수 없었습니다. 다시 시도해주세요." }];
    }

    // AI가 생성한 질문들을 화면에 표시
    displayAIQuestions(questions) {
        const questionsDiv = document.getElementById('aiQuestions');
        
        questionsDiv.innerHTML = questions.map((question, index) => `
            <div class="ai-question">
                <div class="ai-question-text">${question.text}</div>
                <div class="ai-question-actions">
                    <button class="btn btn--sm btn--primary" onclick="app.applyQuestion('${question.text.replace(/'/g, "\\'")}')">적용</button>
                    <button class="btn btn--sm btn--outline" onclick="app.showAIHelp()">새 분석</button>
                    <button class="btn btn--sm btn--outline" onclick="app.hideAIPanel()">나중에</button>
                </div>
            </div>
        `).join('');
    }

    generateAIQuestions() {
        const questionsDiv = document.getElementById('aiQuestions');
        const questionTypes = Object.keys(this.aiQuestions);
        const selectedQuestions = [];
        
        // Select 3 random questions from different categories
        const shuffledTypes = questionTypes.sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < Math.min(CONFIG.ai.maxQuestions, shuffledTypes.length); i++) {
            const type = shuffledTypes[i];
            const questions = this.aiQuestions[type];
            const question = questions[Math.floor(Math.random() * questions.length)];
            selectedQuestions.push(question);
        }

        questionsDiv.innerHTML = selectedQuestions.map((question, index) => `
            <div class="ai-question">
                <div class="ai-question-text">${question}</div>
                <div class="ai-question-actions">
                    <button class="btn btn--sm btn--primary" onclick="app.applyQuestion('${question}')">적용</button>
                    <button class="btn btn--sm btn--outline" onclick="app.generateAIQuestions()">다른 질문</button>
                    <button class="btn btn--sm btn--outline" onclick="app.hideAIPanel()">나중에</button>
                </div>
            </div>
        `).join('');
    }

    applyQuestion(question) {
        // For demo purposes, just hide the panel and show notification
        this.hideAIPanel();
        this.showNotification(`질문을 고려해보세요: ${question.substring(0, 30)}...`);
    }

    hideAIPanel() {
        document.getElementById('aiPanel').classList.add('hidden');
    }

    save() {
        const dataUrl = this.canvas.toDataURL();
        localStorage.setItem('freemind-canvas', dataUrl);
        localStorage.setItem('freemind-canvas-timestamp', new Date().toISOString());
        this.showSaveIndicator();
    }

    showSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        indicator.classList.remove('hidden');
        setTimeout(() => {
            indicator.classList.add('hidden');
        }, 2000);
    }

    export() {
        const link = document.createElement('a');
        link.download = `FreeMind-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        this.showNotification('마인드맵이 다운로드되었습니다!');
    }

    clear() {
        if (confirm('모든 내용을 지우시겠습니까?')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 텍스트 요소도 초기화
            this.textElements = [];
            this.saveState();
            this.showNotification('캔버스가 지워졌습니다.');
        }
    }

    setupAutoSave() {
        setInterval(() => {
            this.save();
        }, CONFIG.autoSave.intervalMs); // Auto-save every 30 seconds
    }

    loadFromStorage() {
        const saved = localStorage.getItem('freemind-canvas');
        if (saved) {
            const img = new Image();
            img.onload = () => {
                this.ctx.drawImage(img, 0, 0);
                this.saveState();
                
                const timestamp = localStorage.getItem('freemind-canvas-timestamp');
                if (timestamp) {
                    const date = new Date(timestamp);
                    this.showNotification(`이전 작업이 복원되었습니다 (${date.toLocaleString()})`);
                }
            };
            img.src = saved;
        }
    }

    showNotification(message) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'save-indicator';
        notification.textContent = message;
        notification.style.top = '80px';
        notification.style.right = '20px';
        notification.style.position = 'fixed';
        notification.style.zIndex = '1002';
        document.body.appendChild(notification);
        
        // Show notification
        requestAnimationFrame(() => {
            notification.classList.remove('hidden');
        });
        
        // Hide notification
        setTimeout(() => {
            notification.classList.add('hidden');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FreeMindCanvas();
    
    // Help button
    document.getElementById('helpBtn').addEventListener('click', () => {
        alert(`🧠 FreeMind Canvas 사용법:

✨ 기본 사용법:
1. 펜 도구로 자유롭게 그리기
2. 아무곳이나 더블클릭하여 텍스트 추가
3. 색상과 브러시 크기 조절
4. 지우개로 수정하기

🤖 AI 협력:
5. 3-5분 작업 후 'AI 도움' 버튼 클릭
6. AI가 제안하는 확장 질문으로 사고 확장
7. 새로운 관점으로 마인드맵 발전

💾 저장 및 내보내기:
8. 자동 저장되며 수동 저장도 가능
9. PNG 파일로 내보내기 가능

⌨️ 단축키:
Ctrl+Z: 실행 취소
Ctrl+Y: 다시 실행  
Ctrl+S: 저장`);
    });
    
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        const settings = prompt(`⚙️ 설정을 선택하세요:

1. 캔버스 지우기
2. 저장된 데이터 삭제
3. 도움말 보기

번호를 입력하세요 (1-3):`);
        
        switch(settings) {
            case '1':
                app.clear();
                break;
            case '2':
                if (confirm('저장된 모든 데이터를 삭제하시겠습니까?')) {
                    localStorage.removeItem('freemind-canvas');
                    localStorage.removeItem('freemind-canvas-timestamp');
                    app.showNotification('저장된 데이터가 삭제되었습니다.');
                }
                break;
            case '3':
                document.getElementById('helpBtn').click();
                break;
            default:
                if (settings !== null) {
                    alert('잘못된 선택입니다.');
                }
        }
    });
    
    // Show welcome message
    setTimeout(() => {
        app.showNotification('🧠 FreeMind Canvas에 오신 것을 환영합니다!');
    }, 1000);
});

// Service Worker for PWA (개발 중에는 완전히 비활성화)
console.log('🔍 Service Worker 환경 체크:', {
    serviceWorkerSupported: 'serviceWorker' in navigator,
    protocol: location.protocol,
    hostname: location.hostname,
    href: location.href
});

if ('serviceWorker' in navigator && location.protocol === 'https:' && location.hostname !== 'localhost') {
    console.log('✅ Service Worker 등록 조건 만족');
    window.addEventListener('load', () => {
        console.log('🚀 Service Worker 등록 시도: /sw.js');
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ SW 등록 성공:', registration);
            })
            .catch(err => {
                console.error('❌ SW 등록 실패:', err);
                console.log('🔍 SW 파일 확인을 위해 fetch 테스트');
                fetch('/sw.js')
                    .then(response => {
                        console.log('📄 SW 파일 fetch 결과:', response.status, response.statusText);
                    })
                    .catch(fetchError => {
                        console.error('❌ SW 파일 fetch 실패:', fetchError);
                    });
            });
    });
} else {
    console.log('❌ Service Worker 등록 조건 불만족');
}