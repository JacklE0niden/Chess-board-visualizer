// 棋盘显示相关逻辑

// ==================== 统一颜色和坐标计算函数 ====================

/**
 * 计算格子的颜色（考虑翻转状态）
 * @param {number} row - 行索引 (0-7)
 * @param {number} col - 列索引 (0-7)
 * @param {boolean} isFlipped - 是否翻转
 * @returns {boolean} true为浅色，false为深色
 */
function getSquareColor(row, col, isFlipped) {
    return (row + col) % 2 === 0;
}

/**
 * 计算坐标文字的颜色（根据格子颜色决定）
 * @param {number} row - 行索引 (0-7)
 * @param {number} col - 列索引 (0-7)
 * @param {boolean} isFlipped - 是否翻转
 * @returns {boolean} true为浅色文字，false为深色文字
 */
function getCoordColor(row, col, isFlipped) {
    return getSquareColor(row, col, isFlipped);
}

/**
 * 获取列字母（考虑翻转状态）
 * @param {number} col - 列索引 (0-7)
 * @param {boolean} isFlipped - 是否翻转
 * @returns {string} a-h 的字母
 */
function getFileLetter(col, isFlipped) {
    const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return isFlipped ? fileLetters[7 - col] : fileLetters[col];
}

/**
 * 获取行号（考虑翻转状态）
 * @param {number} row - 行索引 (0-7)
 * @param {boolean} isFlipped - 是否翻转
 * @returns {string} 1-8 的数字
 */
function getRankNumber(row, isFlipped) {
    return (isFlipped ? row : (7 - row)) + 1;
}

// ==================== 棋子资源 ====================

// 标准国际象棋棋子SVG路径 (从本地pieces目录加载)
const PIECE_SVG = {
    // 白棋子
    'K': 'pieces/wK.svg',
    'Q': 'pieces/wQ.svg',
    'R': 'pieces/wR.svg',
    'B': 'pieces/wB.svg',
    'N': 'pieces/wN.svg',
    'P': 'pieces/wP.svg',

    // 黑棋子
    'k': 'pieces/bK.svg',
    'q': 'pieces/bQ.svg',
    'r': 'pieces/bR.svg',
    'b': 'pieces/bB.svg',
    'n': 'pieces/bN.svg',
    'p': 'pieces/bP.svg'
};

// ==================== 全局状态 ====================

// 全局状态 - 棋盘显示相关
let currentBoard = [];
let currentActivations = [];
let showCoordinates = true;
let isFlipped = false;
let currentMode = 'analysis';

// 标注状态
let isActivationMarkingMode = false;
let isZPatternMarkingMode = false;
let isCorrectMoveMarkingMode = false;
let markedActivations = new Map(); // 使用 Map 存储索引和对应的透明度 (0-1)
let markedZPatterns = new Map(); // 使用 Map 存储索引和对应的透明度 (0-1)
let markedCorrectMoves = new Set(); // 使用 Set 存储被标记为正确move的格子索引

// 当前正在调节强度的目标
let activeIntensityTarget = null; // { type: 'activation' | 'zpattern', index: number } | null

// 单击/双击冲突处理：单击延迟执行，双击优先
let pendingMarkClickTimer = null;
let pendingMarkClickKey = null; // `${type}:${index}`

// 根据 activationIndex 找到当前 DOM 中对应的格子元素（考虑翻转后的显示顺序）
function getSquareElementByActivationIndex(activationIndex) {
    const squares = document.querySelectorAll('#chessboard .board-square');
    if (!squares || squares.length !== 64) return null;
    const r = Math.floor(activationIndex / 8);
    const c = activationIndex % 8;
    const displayIdx = isFlipped ? ((7 - r) * 8 + (7 - c)) : activationIndex;
    return squares[displayIdx] || null;
}

function positionIntensityPopoverNearSquare(squareEl) {
    const popover = document.getElementById('intensity-popover');
    if (!popover || !squareEl) return;

    // 先显示以便拿到实际尺寸
    popover.style.display = 'flex';
    popover.style.visibility = 'visible';
    popover.style.opacity = '1';

    const rect = squareEl.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const popW = popRect.width || 120;
    const popH = popRect.height || 48;

    const centerX = rect.left + rect.width / 2;
    let left = centerX - popW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));

    // 默认显示在格子下方；若下方放不下，自动翻到上方
    let top = rect.bottom + 8;
    if (top + popH + 8 > window.innerHeight) {
        top = rect.top - popH - 8;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
}

// FEN解析函数
function parseFEN(fen) {
    const parts = fen.trim().split(' ');
    if (parts.length < 4) {
        throw new Error('Invalid FEN string');
    }

    const [boardPart, activeColor, castling, enPassant] = parts;
    const rows = boardPart.split('/');

    if (rows.length !== 8) {
        throw new Error('Invalid board configuration in FEN');
    }

    const board = [];
    for (let i = 0; i < 8; i++) {
        const row = [];
        const rowStr = rows[i];

        for (const char of rowStr) {
            if (/\d/.test(char)) {
                const emptySquares = parseInt(char);
                for (let j = 0; j < emptySquares; j++) {
                    row.push(null);
                }
            } else {
                row.push(char);
            }
        }
        board.push(row);
    }

    return {
        board,
        activeColor,
        castling,
        enPassant,
        isWhiteToMove: activeColor === 'w'
    };
}

// 更新状态指示器
function updateStatusIndicator() {
    const indicator = document.querySelector('.player-indicator');
    const statusText = document.querySelector('.status-indicator span');

    try {
        const fenInput = document.getElementById('fen-input');
        const parsed = parseFEN(fenInput.value);

        if (parsed.isWhiteToMove) {
            indicator.className = 'player-indicator white';
            statusText.textContent = 'White to move';
        } else {
            indicator.className = 'player-indicator black';
            statusText.textContent = 'Black to move';
        }
    } catch (error) {
        statusText.textContent = 'Invalid position';
    }
}

// 执行棋盘翻转操作
function performFlipBoard() {
    isFlipped = !isFlipped;
    renderBoard();
}

// 设置模式
function setMode(mode) {
    currentMode = mode;

    // 更新工具栏按钮状态
    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.remove('active');
    });

    if (mode === 'analysis') {
        document.querySelector('button[onclick*="setMode(\'analysis\'"]').classList.add('active');
    } else if (mode === 'explore') {
        document.querySelector('button[onclick*="setMode(\'explore\'"]').classList.add('active');
    }

    renderBoard();
}

// 清除棋盘高亮
function clearBoard() {
    currentActivations = new Array(64).fill(0);
    renderBoard();
}

// 切换坐标显示
function toggleCoordinates() {
    showCoordinates = !showCoordinates;
    const coords = document.querySelectorAll('.coord');
    coords.forEach(coord => {
        coord.style.display = showCoordinates ? 'block' : 'none';
    });
}

// 更新标注状态显示
function updateMarkingStatus() {
    const statusDiv = document.getElementById('marking-status');
    const modeText = document.getElementById('marking-mode-text');
    const countText = document.getElementById('marked-count');

    if (isActivationMarkingMode) {
        statusDiv.style.display = 'block';
        modeText.textContent = '🔴 激活标注模式';
        countText.textContent = `${markedActivations.size} 个格子已标注`;
    } else if (isZPatternMarkingMode) {
        statusDiv.style.display = 'block';
        modeText.textContent = '🔵 Z模式标注模式';
        countText.textContent = `${markedZPatterns.size} 个格子已标注`;
    } else if (isCorrectMoveMarkingMode) {
        statusDiv.style.display = 'block';
        modeText.textContent = '✅ 正确move标注模式';
        countText.textContent = `${markedCorrectMoves.size} 个格子已标注`;
    } else {
        statusDiv.style.display = 'none';
    }
}

// 切换激活标注模式
function toggleActivationMarking() {
    isActivationMarkingMode = !isActivationMarkingMode;
    isZPatternMarkingMode = false; // 互斥
    isCorrectMoveMarkingMode = false; // 互斥

    const activationBtn = document.getElementById('activation-marking-btn');
    const zpatternBtn = document.getElementById('zpattern-marking-btn');
    const correctMoveBtn = document.getElementById('correct-move-marking-btn');

    if (isActivationMarkingMode) {
        activationBtn.classList.add('active');
        zpatternBtn.classList.remove('active');
        if (correctMoveBtn) correctMoveBtn.classList.remove('active');
    } else {
        activationBtn.classList.remove('active');
    }

    updateMarkingStatus();
    renderBoard(); // 重新渲染以更新光标样式
}

// 切换Z模式标注模式
function toggleZPatternMarking() {
    isZPatternMarkingMode = !isZPatternMarkingMode;
    isActivationMarkingMode = false; // 互斥
    isCorrectMoveMarkingMode = false; // 互斥

    const activationBtn = document.getElementById('activation-marking-btn');
    const zpatternBtn = document.getElementById('zpattern-marking-btn');
    const correctMoveBtn = document.getElementById('correct-move-marking-btn');

    if (isZPatternMarkingMode) {
        zpatternBtn.classList.add('active');
        activationBtn.classList.remove('active');
        if (correctMoveBtn) correctMoveBtn.classList.remove('active');
    } else {
        zpatternBtn.classList.remove('active');
    }

    updateMarkingStatus();
    renderBoard(); // 重新渲染以更新光标样式
}

// 切换正确move标注模式
function toggleCorrectMoveMarking() {
    isCorrectMoveMarkingMode = !isCorrectMoveMarkingMode;
    isActivationMarkingMode = false; // 互斥
    isZPatternMarkingMode = false; // 互斥

    const correctMoveBtn = document.getElementById('correct-move-marking-btn');
    const activationBtn = document.getElementById('activation-marking-btn');
    const zpatternBtn = document.getElementById('zpattern-marking-btn');

    if (isCorrectMoveMarkingMode) {
        if (correctMoveBtn) correctMoveBtn.classList.add('active');
        if (activationBtn) activationBtn.classList.remove('active');
        if (zpatternBtn) zpatternBtn.classList.remove('active');
    } else {
        if (correctMoveBtn) correctMoveBtn.classList.remove('active');
    }

    updateMarkingStatus();
    renderBoard(); // 重新渲染以更新光标样式
}

// 清除所有标注
function clearAllMarkings() {
    markedActivations.clear();
    markedZPatterns.clear();
    markedCorrectMoves.clear();
    updateMarkingStatus();
    renderBoard();
}

// 更新棋盘
function updateBoard() {
    const fenInput = document.getElementById('fen-input');
    const activationsInput = document.getElementById('activations-input');

    try {
        const parsed = parseFEN(fenInput.value);
        currentBoard = parsed.board;

        // 解析激活值
        if (activationsInput.value.trim()) {
            currentActivations = activationsInput.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            if (currentActivations.length !== 64) {
                currentActivations = new Array(64).fill(0);
            }
        } else {
            currentActivations = new Array(64).fill(0);
        }

        renderBoard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// 将所有需要的函数暴露到全局作用域，以便HTML可以调用
window.performFlipBoard = performFlipBoard;
window.setMode = setMode;
window.clearBoard = clearBoard;
window.toggleCoordinates = toggleCoordinates;
window.updateMarkingStatus = updateMarkingStatus;
window.toggleActivationMarking = toggleActivationMarking;
window.toggleZPatternMarking = toggleZPatternMarking;
window.toggleCorrectMoveMarking = toggleCorrectMoveMarking;
window.clearAllMarkings = clearAllMarkings;
window.updateBoard = updateBoard;
window.renderBoard = renderBoard;
window.updateStatusIndicator = updateStatusIndicator;

// 调试函数：检查坐标显示
function debugCoordinates() {
    const coords = document.querySelectorAll('.coord');
    console.log('坐标数量:', coords.length);
    console.log('isFlipped:', isFlipped);
    coords.forEach((coord, index) => {
        console.log(`坐标 ${index}: "${coord.textContent}" - 显示: ${coord.style.display} - 类: ${coord.className} - 位置: top=${coord.style.top}, left=${coord.style.left}, bottom=${coord.style.bottom}, right=${coord.style.right}`);
    });
}
window.debugCoordinates = debugCoordinates;

// 渲染棋盘
function renderBoard() {
    // 打印当前翻转状态，便于调试
    console.log('renderBoard: isFlipped =', isFlipped);
    const boardElement = document.getElementById('chessboard');
    boardElement.innerHTML = '';

    const displayBoard = isFlipped ? [...currentBoard].reverse().map(row => [...row].reverse()) : currentBoard;

            for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                // 使用统一函数计算格子颜色
                const isLight = getSquareColor(row, col, isFlipped);

                square.className = `board-square ${isLight ? 'light' : 'dark'}`;
                // 清除之前的标注类
                square.classList.remove('marked-activation', 'marked-zpattern', 'marked-correct-move');

                // 计算实际的激活值索引
                const actualRow = isFlipped ? (7 - row) : row;
                const actualCol = isFlipped ? (7 - col) : col;
                const activationIndex = actualRow * 8 + actualCol;
                const activation = currentActivations[activationIndex] || 0;

                // 检查是否被标注
                const isMarkedActivation = markedActivations.has(activationIndex);
                const isMarkedZPattern = markedZPatterns.has(activationIndex);
                const isMarkedCorrectMove = markedCorrectMoves.has(activationIndex);

                // 添加标注CSS类（留边距效果）
                // 先清除可能残留的内联背景（避免取消标注后残留）
                square.style.removeProperty('background');
                square.style.removeProperty('background-color');
                if (isMarkedActivation) {
                    square.classList.add('marked-activation');
                    const intensity = markedActivations.get(activationIndex) || 0.8;
                    // CSS里 marked-activation 使用了 !important，这里也用 important 覆盖到不同强度
                    square.style.setProperty('background', `rgba(239, 68, 68, ${intensity})`, 'important');
                } else if (isMarkedZPattern) {
                    square.classList.add('marked-zpattern');
                    const intensity = markedZPatterns.get(activationIndex) || 0.8;
                    square.style.setProperty('background', `rgba(59, 130, 246, ${intensity})`, 'important');
                } else if (isMarkedCorrectMove) {
                    square.classList.add('marked-correct-move');
                }

                // 根据标注模式设置光标样式和类
                if (isActivationMarkingMode || isZPatternMarkingMode || isCorrectMoveMarkingMode) {
                    square.style.cursor = 'pointer';
                    square.classList.add('marking-mode');
                }

                const toggleMark = (type, idx) => {
                    if (type === 'activation') {
                        if (markedActivations.has(idx)) markedActivations.delete(idx);
                        else markedActivations.set(idx, 0.8);
                    } else if (type === 'zpattern') {
                        if (markedZPatterns.has(idx)) markedZPatterns.delete(idx);
                        else markedZPatterns.set(idx, 0.8);
                    } else if (type === 'correctmove') {
                        if (markedCorrectMoves.has(idx)) markedCorrectMoves.delete(idx);
                        else markedCorrectMoves.add(idx);
                    }
                    renderBoard();
                    updateMarkingStatus();
                };

                const openIntensityPopover = (type, idx) => {
                    const popover = document.getElementById('intensity-popover');
                    const slider = document.getElementById('intensity-slider');
                    const valueDisplay = document.getElementById('intensity-value');
                    if (!popover || !slider || !valueDisplay) return;

                    // 如果还没染色，双击时自动染色（无论之前是否染过）
                    if (type === 'activation') {
                        if (!markedActivations.has(idx)) markedActivations.set(idx, 0.8);
                    } else {
                        if (!markedZPatterns.has(idx)) markedZPatterns.set(idx, 0.8);
                    }
                    renderBoard();
                    updateMarkingStatus();

                    activeIntensityTarget = { type, index: idx };
                    const currentIntensity =
                        type === 'activation'
                            ? (markedActivations.get(idx) || 0.8)
                            : (markedZPatterns.get(idx) || 0.8);

                    slider.value = String(Math.round(currentIntensity * 100));
                    valueDisplay.textContent = slider.value;

                    // 关键：renderBoard 后 square DOM 已重建，必须重新找当前格子再定位
                    const squareEl = getSquareElementByActivationIndex(idx);
                    positionIntensityPopoverNearSquare(squareEl);
                };

                const cancelPendingClick = (key) => {
                    if (pendingMarkClickTimer && pendingMarkClickKey === key) {
                        clearTimeout(pendingMarkClickTimer);
                        pendingMarkClickTimer = null;
                        pendingMarkClickKey = null;
                    }
                };

                // 添加点击事件处理（延迟，避免打断 dblclick）
                square.addEventListener('click', function(e) {
                    if (typeof window.arrowMode !== 'undefined' && window.arrowMode) {
                        return;
                    }
                    
                    if (isActivationMarkingMode) {
                        const key = `activation:${activationIndex}`;
                        cancelPendingClick(key);
                        pendingMarkClickKey = key;
                        pendingMarkClickTimer = setTimeout(() => {
                            toggleMark('activation', activationIndex);
                            pendingMarkClickTimer = null;
                            pendingMarkClickKey = null;
                        }, 220);
                    } else if (isZPatternMarkingMode) {
                        const key = `zpattern:${activationIndex}`;
                        cancelPendingClick(key);
                        pendingMarkClickKey = key;
                        pendingMarkClickTimer = setTimeout(() => {
                            toggleMark('zpattern', activationIndex);
                            pendingMarkClickTimer = null;
                            pendingMarkClickKey = null;
                        }, 220);
                    } else if (isCorrectMoveMarkingMode) {
                        const key = `correctmove:${activationIndex}`;
                        cancelPendingClick(key);
                        pendingMarkClickKey = key;
                        pendingMarkClickTimer = setTimeout(() => {
                            toggleMark('correctmove', activationIndex);
                            pendingMarkClickTimer = null;
                            pendingMarkClickKey = null;
                        }, 220);
                    }
                });

                // 添加双击事件处理 - 弹出强度调节器
                square.addEventListener('dblclick', function(e) {
                    if (!isActivationMarkingMode && !isZPatternMarkingMode) return;
                    e.preventDefault();
                    e.stopPropagation();

                    if (isActivationMarkingMode) {
                        cancelPendingClick(`activation:${activationIndex}`);
                        openIntensityPopover('activation', activationIndex);
                    } else if (isZPatternMarkingMode) {
                        cancelPendingClick(`zpattern:${activationIndex}`);
                        openIntensityPopover('zpattern', activationIndex);
                    }
                });

            // 添加坐标标签 - 强制显示所有坐标
            // 行号（1-8）- 显示在最右边一列
            if (col === 7) {
                const rankCoord = document.createElement('div');
                // 使用统一函数计算坐标颜色
                const isLightSquare = getCoordColor(row, col, isFlipped);
                rankCoord.className = `coord rank ${isLightSquare ? 'light' : 'dark'}`;
                rankCoord.textContent = getRankNumber(actualRow, false);
                rankCoord.style.display = 'block';
                rankCoord.style.visibility = 'visible';
                rankCoord.style.opacity = '1';
                square.appendChild(rankCoord);
            }

            // 列字母（a-h）- 显示在最下面一行
            if (row === 7) {
                const fileCoord = document.createElement('div');
                // 使用统一函数计算坐标颜色
                const isLightSquare = getCoordColor(row, col, isFlipped);
                fileCoord.className = `coord file ${isLightSquare ? 'light' : 'dark'}`;
                fileCoord.textContent = getFileLetter(col, isFlipped);
                fileCoord.style.display = 'block';
                fileCoord.style.visibility = 'visible';
                fileCoord.style.opacity = '1';
                square.appendChild(fileCoord);
            }

            // 棋子
            const piece = displayBoard[row][col];
            if (piece) {
                const pieceElement = document.createElement('img');
                pieceElement.className = 'piece';
                pieceElement.src = PIECE_SVG[piece] || '';
                pieceElement.alt = piece;
                pieceElement.draggable = false;
                square.appendChild(pieceElement);
            }

            // 激活值显示
            if (activation !== 0 && currentMode === 'analysis') {
                const activationElement = document.createElement('div');
                activationElement.className = 'activation-badge';
                // 如果在最右边列，激活值显示在左上角，避免与行号重叠
                if (col === 7) {
                    activationElement.style.left = '2px';
                    activationElement.style.right = 'auto';
                }
                activationElement.textContent = Math.abs(activation).toFixed(2);
                square.appendChild(activationElement);
            }

            boardElement.appendChild(square);
        }
    }

    // 更新状态指示器
    updateStatusIndicator();
}

// 滑动条事件处理
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('intensity-slider');
    const valueDisplay = document.getElementById('intensity-value');
    const popover = document.getElementById('intensity-popover');
    let hideTimer = null;

    const hidePopover = () => {
        if (!popover) return;
        popover.style.display = 'none';
        activeIntensityTarget = null;
    };

    // 鼠标离开滑条区域就隐藏（轻量交互）；进入时取消隐藏
    if (popover) {
        popover.addEventListener('mouseenter', () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
            }
        });
        popover.addEventListener('mouseleave', () => {
            // 给一个很小的缓冲，避免误触（尤其是触控板/快速移动）
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                hidePopover();
                hideTimer = null;
            }, 150);
        });
    }

    if (slider) {
        slider.addEventListener('input', function() {
            if (activeIntensityTarget !== null) {
                const intensity = parseInt(this.value) / 100;
                valueDisplay.textContent = this.value;
                if (activeIntensityTarget.type === 'activation') {
                    markedActivations.set(activeIntensityTarget.index, intensity);
                } else {
                    markedZPatterns.set(activeIntensityTarget.index, intensity);
                }
                renderBoard();
                // 拖动过程中会触发重绘，重绘后把滑条继续贴在当前格子附近
                const squareEl = getSquareElementByActivationIndex(activeIntensityTarget.index);
                positionIntensityPopoverNearSquare(squareEl);
            }
        });
    }

    // 点击页面其他地方隐藏弹窗
    document.addEventListener('mousedown', function(e) {
        if (popover && !popover.contains(e.target) && !e.target.closest('.board-square')) {
            hidePopover();
        }
    });
});
