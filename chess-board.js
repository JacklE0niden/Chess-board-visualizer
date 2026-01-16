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
let markedActivations = new Set(); // 标记为激活的格子
let markedZPatterns = new Set(); // 标记为Z模式的格子

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
    } else {
        statusDiv.style.display = 'none';
    }
}

// 切换激活标注模式
function toggleActivationMarking() {
    isActivationMarkingMode = !isActivationMarkingMode;
    isZPatternMarkingMode = false; // 互斥

    const activationBtn = document.getElementById('activation-marking-btn');
    const zpatternBtn = document.getElementById('zpattern-marking-btn');

    if (isActivationMarkingMode) {
        activationBtn.classList.add('active');
        zpatternBtn.classList.remove('active');
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

    const activationBtn = document.getElementById('activation-marking-btn');
    const zpatternBtn = document.getElementById('zpattern-marking-btn');

    if (isZPatternMarkingMode) {
        zpatternBtn.classList.add('active');
        activationBtn.classList.remove('active');
    } else {
        zpatternBtn.classList.remove('active');
    }

    updateMarkingStatus();
    renderBoard(); // 重新渲染以更新光标样式
}

// 清除所有标注
function clearAllMarkings() {
    markedActivations.clear();
    markedZPatterns.clear();
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
                square.classList.remove('marked-activation', 'marked-zpattern');

                // 计算实际的激活值索引
                const actualRow = isFlipped ? (7 - row) : row;
                const actualCol = isFlipped ? (7 - col) : col;
                const activationIndex = actualRow * 8 + actualCol;
                const activation = currentActivations[activationIndex] || 0;

                // 检查是否被标注
                const isMarkedActivation = markedActivations.has(activationIndex);
                const isMarkedZPattern = markedZPatterns.has(activationIndex);

                // 添加标注CSS类（留边距效果）
                if (isMarkedActivation) {
                    square.classList.add('marked-activation');
                } else if (isMarkedZPattern) {
                    square.classList.add('marked-zpattern');
                }

                // 根据标注模式设置光标样式和类
                if (isActivationMarkingMode || isZPatternMarkingMode) {
                    square.style.cursor = 'pointer';
                    square.classList.add('marking-mode');
                }

                // 添加点击事件处理
                square.addEventListener('click', function(e) {
                    if (typeof window.arrowMode !== 'undefined' && window.arrowMode) {
                        return;
                    }
                    
                    if (isActivationMarkingMode) {
                        if (markedActivations.has(activationIndex)) {
                            markedActivations.delete(activationIndex);
                        } else {
                            markedActivations.add(activationIndex);
                        }
                        renderBoard();
                        updateMarkingStatus();
                    } else if (isZPatternMarkingMode) {
                        if (markedZPatterns.has(activationIndex)) {
                            markedZPatterns.delete(activationIndex);
                        } else {
                            markedZPatterns.add(activationIndex);
                        }
                        renderBoard();
                        updateMarkingStatus();
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
