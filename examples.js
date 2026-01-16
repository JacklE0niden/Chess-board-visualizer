// 示例数据 - 可以复制到网站中使用

const examples = {
    // 初始局面
    startingPosition: {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        activations: null,
        zPattern: null,
        move: null
    },

    // 有激活值的局面 - 突出显示中心区域
    activationExample: {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        activations: [
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0.1,0.2,0.2,0.1,0,0,
            0,0,0.3,0.5,0.5,0.3,0,0,
            0,0,0.1,0.2,0.2,0.1,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0
        ],
        zPattern: null,
        move: null
    },

    // Z模式连接示例 - 显示马的连接
    zPatternExample: {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        activations: [
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0.1,0,0,0,0,0.1,0
        ],
        zPattern: [
            [1, 11], [1, 16], [1, 18],
            [6, 12], [6, 17], [6, 21]
        ],
        zPatternValues: [0.05, 0.08, 0.03, 0.06, 0.09, 0.04],
        move: null
    },

    // 西西里防御开局
    sicilianDefense: {
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        activations: [
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0.3,0,0,0,0,0,
            0,0,0,0,0.2,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0
        ],
        zPattern: [
            [26, 27], [26, 28], [26, 34], [26, 35],
            [28, 26], [28, 27], [28, 35], [28, 36]
        ],
        zPatternValues: [0.04, 0.06, 0.08, 0.05, 0.03, 0.07, 0.09, 0.04],
        move: 'e2e4'
    },

    // 王翼印度防御
    kingsIndian: {
        fen: 'rnbqk2r/pppp1ppp/3b4/4p3/2B1P3/3P4/PPP2PPP/RNBQK1NR b KQkq - 1 4',
        activations: [
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0.4,0,0,0,0,0,
            0,0,0,0,0.2,0,0,0,
            0,0.1,0,0,0.3,0,0,0,
            0,0,0.5,0,0,0,0,0,
            0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0
        ],
        zPattern: [
            [19, 20], [19, 26], [19, 27], [19, 28],
            [27, 19], [27, 20], [27, 26], [27, 34], [27, 35], [27, 36]
        ],
        zPatternValues: [0.06, 0.08, 0.05, 0.04, 0.07, 0.03, 0.09, 0.06, 0.04, 0.05],
        move: 'd6c5'
    }
};

// 转换为网站使用的格式
function formatZPatternForInput(zPatternIndices, zPatternValues) {
    if (!zPatternIndices || !zPatternValues) return '';

    const connections = {};
    zPatternIndices.forEach((pair, index) => {
        const [source, target] = pair;
        const value = zPatternValues[index];
        if (!connections[source]) connections[source] = [];
        connections[source].push(`${target}=${value}`);
    });

    return Object.entries(connections)
        .map(([source, targets]) => `${source}: ${targets.join(', ')}`)
        .join('\n');
}

function formatActivationsForInput(activations) {
    return activations ? activations.join(',') : '';
}

// 导出示例数据
window.chessExamples = examples;
window.formatZPatternForInput = formatZPatternForInput;
window.formatActivationsForInput = formatActivationsForInput;
