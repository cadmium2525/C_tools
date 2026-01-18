/*
    Pazumono Game Logic
*/

// --- Constants & Config ---
const CONFIG = {
    cols: 6,
    rows: 5,
    orbTypes: 7, // 0:Red, 1:Green, 2:Yellow, 3:Blue, 4:White, 5:Black, 6:Heart
    moveTime: 6000, // 6 seconds
    aoeThreshold: 5 // 5+ match
};

const ELEMENTS = {
    RED: 0, GREEN: 1, YELLOW: 2, BLUE: 3, WHITE: 4, BLACK: 5, HEART: 6
};

const IMAGE_PATH = 'images/';

const SKILLS = {
    // Monol (Black)
    'dai_taorekomi': { name: '大たおれこみ', desc: '敵単体に小ダメージ', cost: 18, type: 'damage', val: 50 },
    'aurora_gate': { name: 'オーロラゲート', desc: '敵単体に大ダメージ', cost: 34, type: 'damage', val: 200 },

    // Hinotori (Red)
    'flame_line': { name: 'フレイムライン', desc: '敵単体に中ダメージ', cost: 25, type: 'damage', val: 100 },
    'fire_wave': { name: 'ファイアウェーブ', desc: '全ドロップを火属性に変換', cost: 43, type: 'convert', color: ELEMENTS.RED },

    // Plant (Green)
    'mitsu': { name: 'ミツ', desc: '全敵の行動を3ターン遅らせる', cost: 26, type: 'delay', val: 3 },
    'flower_beam': { name: 'フラワービーム', desc: '大ダメージ＋木ドロップを生成', cost: 42, type: 'damage_spawn', val: 200, spawnColor: ELEMENTS.GREEN, spawnCount: 6 },

    // Undine (Blue)
    'aqua_wave': { name: 'アクアウェイブ', desc: '水ドロップを6個生成', cost: 19, type: 'spawn', spawnColor: ELEMENTS.BLUE, spawnCount: 6 },
    'crystal_arrow': { name: 'クリスタルアロー', desc: '敵単体に大ダメージ', cost: 37, type: 'damage', val: 200 },

    // Suezo (Yellow)
    'nameru': { name: 'なめる', desc: '小ダメージ＋1ターン遅延', cost: 22, type: 'damage_delay', val: 50, delay: 1 },
    'berobinta': { name: 'ベロビンタ', desc: '中ダメージ＋1ターン遅延', cost: 35, type: 'damage_delay', val: 100, delay: 1 },

    // Gali (White)
    'knuckle': { name: 'ナックル', desc: '敵単体に小ダメージ', cost: 18, type: 'damage', val: 50 },
    'god_rising': { name: 'ゴッドライジング', desc: '盤面の色の数に応じて大ダメージ', cost: 40, type: 'variable_damage', val: 100 }
};

const ALLY_DATA = [
    { name: 'モノリス', img: 'モノリス.png', baseHp: 400, atk: 70, element: ELEMENTS.BLACK, skills: ['dai_taorekomi', 'aurora_gate'] },
    { name: 'ヒノトリ', img: 'ヒノトリ.png', baseHp: 300, atk: 90, element: ELEMENTS.RED, skills: ['flame_line', 'fire_wave'] },
    { name: 'プラント', img: 'プラント.png', baseHp: 350, atk: 60, element: ELEMENTS.GREEN, skills: ['mitsu', 'flower_beam'] },
    { name: 'ウンディーネ', img: 'ウンディーネ.png', baseHp: 250, atk: 80, element: ELEMENTS.BLUE, skills: ['aqua_wave', 'crystal_arrow'] },
    { name: 'スエゾー', img: 'スエゾー.png', baseHp: 280, atk: 75, element: ELEMENTS.YELLOW, skills: ['nameru', 'berobinta'] },
    { name: 'ガリ', img: 'ガリ.png', baseHp: 320, atk: 85, element: ELEMENTS.WHITE, skills: ['knuckle', 'god_rising'] }
];

const ENEMY_IMAGES = [
    'はてな.png', 'アローヘッド.png', 'アーク.png', 'イルミネ.png', 'ウンディーネ.png',
    'カワズモー.png', 'ガリ.png', 'キジン.png', 'キュービ.png', 'グジラ.png',
    'ケンタウロス.png', 'ゲル.png', 'ゴースト.png', 'シンリュウ.png', 'ジョーカー.png',
    'ディノ.png', 'デュラハン.png', 'ドラゴン.png', 'ナーガ.png', 'ニャー.png',
    'ネンドロ.png', 'ハム.png', 'ヒノトリ.png', 'プラント.png', 'ヘンガー.png',
    'メタルナー.png', 'モノリス.png', 'ユグドラシル.png', 'ワーム.png'
];

// モンスターのオーラ定義
const AURA_COLORS = {
    '青': '#4444ff',
    '赤': '#ff4444',
    '黒': '#333333',
    '白': '#ffffff',
    '緑': '#44ff44',
    '黄色': '#ffff44'
};

const MONSTER_AURAS = {
    'アーク': '青', 'アローヘッド': '赤', 'イルミネ': '黒', 'ウンディーネ': '青',
    'ガリ': '白', 'カワズモー': '緑', 'キジン': '黄色', 'キュービ': '白',
    'グジラ': '青', 'ゲル': '青', 'ケンタウロス': '緑', 'ゴースト': '黄色',
    'ゴーレム': '黒', 'ジョーカー': '黒', 'シンリュウ': '青', 'スエゾー': '黄色',
    'ディノ': '緑', 'デュラハン': '白', 'ドラゴン': '赤', 'ナーガ': '黒',
    'ニャー': '白', 'ネンドロ': '黄色', 'ハム': '黄色', 'ピクシー': '赤',
    'ヒノトリ': '赤', 'プラント': '緑', 'ヘンガー': '黄色', 'メタルナー': '白',
    'モッチー': '赤', 'モノリス': '黒', 'ユグドラシル': '緑', 'ライガー': '青',
    'ワーム': '黄色'
};

// --- Classes ---

class Monster {
    constructor(data, isEnemy = false, level = 1) {
        this.name = data.name || 'Unknown';
        this.img = data.img;
        this.isEnemy = isEnemy;
        const multiplier = isEnemy ? (1 + level * 0.2) : 1;
        this.maxHp = Math.floor((data.baseHp || 1000) * multiplier); // Enemies stronger
        this.currentHp = this.maxHp;
        this.atk = Math.floor((data.atk || 50) * multiplier);

        // Element logic
        if (data.element !== undefined) {
            this.element = data.element;
        } else {
            this.element = Math.floor(Math.random() * 6); // 0-5
        }

        this.turnTimer = Math.floor(Math.random() * 3) + 2; // 2-4
        this.currentTimer = this.turnTimer;

        // Skills & Guts (Ally)
        this.skills = data.skills || [];
        this.guts = 0;
        this.maxGuts = 99;
    }

    addGuts(amount) {
        this.guts = Math.min(this.maxGuts, this.guts + amount);
    }

    takeDamage(amount) {
        this.currentHp = Math.max(0, this.currentHp - amount);
        return this.currentHp === 0;
    }
}

class Board {
    constructor(game) {
        this.game = game;
        this.grid = [];
        this.width = CONFIG.cols;
        this.height = CONFIG.rows;
        this.element = document.getElementById('board');
        this.timerContainer = document.getElementById('timer-bar-container');
        this.timerBar = document.getElementById('timer-bar-fill');

        this.selectedOrb = null;
        this.isDragging = false;
        this.startPos = { x: 0, y: 0 }; // Touch/Mouse start coordinates
        this.gridPos = { r: -1, c: -1 }; // Current grid position of dragged orb

        this.init();
    }

    init() {
        this.element.innerHTML = '';
        this.grid = [];
        for (let r = 0; r < this.height; r++) {
            const row = [];
            for (let c = 0; c < this.width; c++) {
                let type;
                do {
                    type = this.getRandomType();
                } while (this.createsMatch(r, c, row, type));

                const orb = this.createOrbElement(type, r, c);
                row.push({ type, el: orb, isSkillGenerated: false });
                this.element.appendChild(orb);
            }
            this.grid.push(row);
        }
        this.setupInput();
    }

    createsMatch(r, c, currentRow, type) {
        // Check horizontal (left 2)
        if (c >= 2) {
            if (currentRow[c - 1].type === type && currentRow[c - 2].type === type) return true;
        }
        // Check vertical (up 2)
        if (r >= 2) {
            if (this.grid[r - 1][c].type === type && this.grid[r - 2][c].type === type) return true;
        }
        return false;
    }

    getRandomType() {
        return Math.floor(Math.random() * CONFIG.orbTypes);
    }

    createOrbElement(type, r, c) {
        const div = document.createElement('div');
        div.className = 'orb';
        if (type === ELEMENTS.HEART) div.classList.add('square');
        div.dataset.type = type;
        div.dataset.r = r;
        div.dataset.c = c;
        // Optional: add image or icon based on type
        return div;
    }

    setupInput() {
        this.dragStartTime = 0;
        this.timerId = null;

        const handleStart = (e) => {
            if (this.game.isProcessing) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!target || !target.classList.contains('orb')) return;

            this.game.audio.init();

            this.isDragging = true;
            this.isTimerStarted = false; // タイマー開始フラグ

            // Timer UI の初期化（表示のみ）
            if (this.timerId) clearInterval(this.timerId);
            this.timerId = null;
            this.timerContainer.classList.add('active');
            this.timerBar.style.transform = 'scaleX(1)';

            this.selectedOrb = target;
            this.selectedOrb.style.opacity = '0.5';
            this.selectedOrb.classList.add('holding');

            this.dragEl = target.cloneNode(true);
            this.dragEl.classList.add('dragging-clone');
            this.dragEl.style.position = 'absolute';
            this.dragEl.style.width = target.offsetWidth + 'px';
            this.dragEl.style.height = target.offsetHeight + 'px';
            this.dragEl.style.opacity = '1';
            this.dragEl.style.zIndex = '1000';
            this.dragEl.style.pointerEvents = 'none';
            document.body.appendChild(this.dragEl);

            this.updateDragVisual(touch.clientX, touch.clientY);

            const r = parseInt(target.dataset.r);
            const c = parseInt(target.dataset.c);
            this.gridPos = { r, c };

            document.addEventListener('mousemove', handleMove);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchend', handleEnd);
        };

        const handleMove = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;

            this.updateDragVisual(touch.clientX, touch.clientY);

            const target = document.elementFromPoint(touch.clientX, touch.clientY);

            if (target && target.classList.contains('orb') && target !== this.selectedOrb) {
                const targetR = parseInt(target.dataset.r);
                const targetC = parseInt(target.dataset.c);

                // 最初の移動でタイマー開始
                if (!this.isTimerStarted) {
                    this.isTimerStarted = true;
                    this.dragStartTime = Date.now();
                    this.timerId = setInterval(() => {
                        const elapsed = Date.now() - this.dragStartTime;
                        const ratio = Math.max(0, 1 - elapsed / CONFIG.moveTime);
                        this.timerBar.style.transform = `scaleX(${ratio})`;

                        if (elapsed > CONFIG.moveTime) {
                            handleEnd();
                        }
                    }, 50);
                }

                this.swapOrbs(this.gridPos.r, this.gridPos.c, targetR, targetC);
                this.gridPos = { r: targetR, c: targetC };
                this.game.audio.playSwapSE();
            }
        };

        const handleEnd = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;

            if (this.timerId) {
                clearInterval(this.timerId);
                this.timerId = null;
            }

            if (this.dragEl) {
                this.dragEl.remove();
                this.dragEl = null;
            }

            this.timerContainer.classList.remove('active');

            if (this.selectedOrb) {
                this.selectedOrb.style.opacity = '1';
                this.selectedOrb.classList.remove('holding');
                this.selectedOrb = null;
            }

            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchend', handleEnd);

            this.game.processTurn();
        };

        this.element.addEventListener('mousedown', handleStart);
        this.element.addEventListener('touchstart', handleStart, { passive: false });
    }

    updateDragVisual(x, y) {
        if (this.dragEl) {
            this.dragEl.style.left = (x - this.dragEl.offsetWidth / 2) + 'px';
            this.dragEl.style.top = (y - this.dragEl.offsetHeight / 2) + 'px';

            // Calculate progress for visual feedback (can be added later to DOM)
            // const elapsed = Date.now() - this.dragStartTime;
        }
    }

    swapOrbs(r1, c1, r2, c2) {
        const orb1 = this.grid[r1][c1];
        const orb2 = this.grid[r2][c2];

        // Swap in Loop/Array
        this.grid[r1][c1] = orb2;
        this.grid[r2][c2] = orb1;

        // Swap DOM positions
        const el1 = orb1.el;
        const el2 = orb2.el;

        // Swap implementation using placeholders
        const next1 = el1.nextSibling;
        const next2 = el2.nextSibling;

        // If they are adjacent, special handling
        if (next1 === el2) {
            this.element.insertBefore(el2, el1);
        } else if (next2 === el1) {
            this.element.insertBefore(el1, el2);
        } else {
            this.element.insertBefore(el1, next2);
            this.element.insertBefore(el2, next1);
        }

        // Update Coordinates
        orb1.el.dataset.r = r2;
        orb1.el.dataset.c = c2;
        orb2.el.dataset.r = r1;
        orb2.el.dataset.c = c1;
    }

    findMatchGroups() {
        // Step 1: Identify all orbs that are part of a line of 3+
        const matchedOrbs = Array.from({ length: this.height }, () => Array(this.width).fill(false));

        // Horizontal
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width - 2; c++) {
                const type = this.grid[r][c].type;
                let len = 1;
                while (c + len < this.width && this.grid[r][c + len].type === type) {
                    len++;
                }
                if (len >= 3) {
                    for (let i = 0; i < len; i++) {
                        matchedOrbs[r][c + i] = true;
                    }
                }
                c += len - 1;
            }
        }

        // Vertical
        for (let c = 0; c < this.width; c++) {
            for (let r = 0; r < this.height - 2; r++) {
                const type = this.grid[r][c].type;
                let len = 1;
                while (r + len < this.height && this.grid[r + len][c].type === type) {
                    len++;
                }
                if (len >= 3) {
                    for (let i = 0; i < len; i++) {
                        matchedOrbs[r + i][c] = true;
                    }
                }
                r += len - 1;
            }
        }

        // Step 2: Group connected matched orbs into combos
        const groups = [];
        const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));

        const getComponent = (r, c, type) => {
            const coords = [];
            const queue = [{ r, c }];
            visited[r][c] = true;
            coords.push({ r, c });

            let head = 0;
            while (head < queue.length) {
                const curr = queue[head++];
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (let d of dirs) {
                    const nr = curr.r + d[0];
                    const nc = curr.c + d[1];
                    if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                        // Must be same type AND marked as matched by line check
                        if (!visited[nr][nc] && matchedOrbs[nr][nc] && this.grid[nr][nc].type === type) {
                            visited[nr][nc] = true;
                            queue.push({ r: nr, c: nc });
                            coords.push({ r: nr, c: nc });
                        }
                    }
                }
            }
            return coords;
        };

        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (matchedOrbs[r][c] && !visited[r][c]) {
                    const type = this.grid[r][c].type;
                    const component = getComponent(r, c, type);
                    groups.push({ type, coords: component });
                }
            }
        }
        return groups;
    }

    async fadeOrbs(coords) {
        coords.forEach(({ r, c }) => {
            const el = this.grid[r][c].el;
            el.style.transition = 'opacity 0.2s, transform 0.2s';
            el.style.opacity = '0';
            el.style.transform = 'scale(1.2)';
        });
        await new Promise(r => setTimeout(r, 200));
    }

    async removeAndDrop(groups) {
        // Collect all matched coordinates
        const matches = new Set();
        groups.forEach(g => {
            g.coords.forEach(({ r, c }) => matches.add(`${r},${c}`));
        });

        const moves = []; // Store animations to apply {el, fromY}

        for (let c = 0; c < this.width; c++) {
            let writePos = this.height - 1;
            // Scan from bottom to top
            for (let r = this.height - 1; r >= 0; r--) {
                if (!matches.has(`${r},${c}`)) {
                    if (writePos !== r) {
                        // Move orb current(r) to new(writePos)
                        const src = this.grid[r][c];
                        const dst = this.grid[writePos][c];

                        // Data update
                        dst.type = src.type;
                        dst.isSkillGenerated = src.isSkillGenerated; // フラグを継承
                        dst.el.dataset.type = src.type;
                        dst.el.classList.toggle('square', dst.type === ELEMENTS.HEART);

                        // Style reset for reuse
                        dst.el.style.opacity = '1';

                        // Animation setup
                        const dist = (writePos - r) * 100;
                        moves.push({ el: dst.el, startY: -dist });
                    }
                    writePos--;
                }
            }
            // Fill new
            let newCount = 0;
            while (writePos >= 0) {
                const dst = this.grid[writePos][c];
                const newType = this.getRandomType();
                dst.type = newType;
                dst.isSkillGenerated = false; // 新しいドロップは通常ドロップ
                dst.el.dataset.type = newType;
                dst.el.classList.toggle('square', dst.type === ELEMENTS.HEART);

                dst.el.style.opacity = '1';

                newCount++;
                const dist = (newCount * 100) + (writePos * 100);
                moves.push({ el: dst.el, startY: -dist });

                writePos--;
            }
        }

        // Apply visual logic
        moves.forEach(m => {
            m.el.style.transition = 'none';
            m.el.style.transform = `translateY(${m.startY}%)`;
        });

        document.body.offsetHeight;

        moves.forEach(m => {
            m.el.style.transition = 'transform 0.3s cubic-bezier(0.5, 0, 0.5, 1)';
            m.el.style.transform = 'translateY(0)';
        });

        await new Promise(r => setTimeout(r, 300));
    }

    // Skill Helpers
    convertAllOrbs(targetType) {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const orb = this.grid[r][c];
                orb.type = targetType;
                orb.isSkillGenerated = true; // スキル生成フラグを設定
                orb.el.dataset.type = targetType;
                orb.el.classList.toggle('square', targetType === ELEMENTS.HEART);
            }
        }
    }

    spawnOrbs(targetType, count) {
        // Randomly pick N positions to change
        let available = [];
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (this.grid[r][c].type !== targetType) {
                    available.push({ r, c });
                }
            }
        }

        // Shuffle
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }

        const toChange = available.slice(0, count);
        toChange.forEach(({ r, c }) => {
            const orb = this.grid[r][c];
            orb.type = targetType;
            orb.isSkillGenerated = true; // スキル生成フラグを設定
            orb.el.dataset.type = targetType;
            orb.el.classList.toggle('square', targetType === ELEMENTS.HEART);

            // Visual flair
            orb.el.style.transform = 'scale(1.2)';
            setTimeout(() => orb.el.style.transform = 'scale(1)', 200);
        });
    }
}

class Game {
    constructor() {
        this.floor = 0;
        this.score = 0;
        this.isProcessing = false; // Input lock
        this.audio = new AudioController();
        this.board = new Board(this);

        this.party = [];
        this.enemies = [];
        this.playerHp = 0;
        this.playerMaxHp = 0;

        // UI Refs
        this.floorEl = document.getElementById('floor-display');
        this.scoreEl = document.getElementById('score-display');
        this.enemyContainer = document.getElementById('enemy-container');
        this.partyContainer = document.getElementById('party-container');
        this.hpBar = document.getElementById('player-hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.comboDisplay = document.getElementById('combo-display');
        this.modal = document.getElementById('modal-overlay');

        this.initParty();
        this.setupStart();
        this.setupBGM();
    }

    setupBGM() {
        this.bgmBtn = document.getElementById('bgm-toggle');
        if (this.bgmBtn) {
            this.bgmBtn.onclick = () => {
                const isPlaying = this.audio.toggleBGM();
                this.bgmBtn.textContent = isPlaying ? "BGM: ON" : "BGM: OFF";
            };
        }
    }

    initParty() {
        // Create 6 fixed monsters
        this.party = ALLY_DATA.map(data => new Monster(data));
        this.playerMaxHp = this.party.reduce((sum, m) => sum + m.maxHp, 0);
        this.playerHp = this.playerMaxHp;
        this.updateHpUI();

        // Render Party UI
        this.partyContainer.innerHTML = '';
        this.party.forEach((m, index) => {
            const div = document.createElement('div');
            div.className = 'party-member';
            div.style.borderColor = this.getElementColor(m.element);

            const img = document.createElement('img');
            img.src = IMAGE_PATH + m.img;

            // Guts Meter
            const gutsVal = document.createElement('div');
            gutsVal.className = 'guts-val';
            gutsVal.textContent = m.guts;

            div.appendChild(img);
            div.appendChild(gutsVal);

            div.onclick = () => this.openSkillMenu(m);

            m.el = div;
            this.partyContainer.appendChild(div);
        });
    }

    getElementColor(el) {
        switch (el) {
            case ELEMENTS.RED: return '#ff4444';
            case ELEMENTS.GREEN: return '#44ff44';
            case ELEMENTS.YELLOW: return '#ffff44';
            case ELEMENTS.BLUE: return '#4444ff';
            case ELEMENTS.WHITE: return '#ddd';
            case ELEMENTS.BLACK: return '#555';
            case ELEMENTS.HEART: return '#ff44ff';
        }
        return '#fff';
    }

    updateGutsUI() {
        this.party.forEach(m => {
            if (m.el) {
                const val = m.el.querySelector('.guts-val');
                if (val) val.textContent = m.guts;
            }
        });
    }

    openSkillMenu(monster) {
        if (this.isProcessing) return;

        // Remove existing modal if any
        const existing = document.getElementById('skill-modal');
        if (existing) existing.remove();

        const skillModal = document.createElement('div');
        skillModal.id = 'skill-modal';
        skillModal.className = 'skill-modal'; // Use class for styling in CSS

        const title = document.createElement('h2');
        title.textContent = monster.name + ' Skill';
        skillModal.appendChild(title);

        monster.skills.forEach(skillKey => {
            const skill = SKILLS[skillKey];
            const skillContainer = document.createElement('div');
            skillContainer.className = 'skill-item';

            const btn = document.createElement('button');
            const canUse = monster.guts >= skill.cost;
            btn.textContent = `${skill.name} (Guts: ${skill.cost})`;
            btn.className = 'skill-btn';
            if (!canUse) btn.classList.add('disabled');
            btn.disabled = !canUse;

            const desc = document.createElement('div');
            desc.className = 'skill-desc';
            desc.textContent = skill.desc;

            btn.onclick = () => {
                // Ensure modal closes and no re-clicks
                skillModal.remove();
                this.executeSkill(monster, skill);
            };

            skillContainer.appendChild(btn);
            skillContainer.appendChild(desc);
            skillModal.appendChild(skillContainer);
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cancel';
        closeBtn.className = 'close-btn';
        closeBtn.onclick = () => skillModal.remove();
        skillModal.appendChild(closeBtn);

        document.body.appendChild(skillModal);
    }

    async executeSkill(monster, skill) {
        if (this.isProcessing) return;
        if (monster.guts < skill.cost) return;

        this.isProcessing = true;
        monster.guts -= skill.cost;
        this.updateGutsUI();

        // Skill Feedback
        this.audio.playSkillSE();
        const flash = document.createElement('div');
        flash.className = 'skill-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);

        // Apply Effect
        switch (skill.type) {
            case 'damage':
                this.dealDamageToRandomEnemy(skill.val, monster.element);
                break;
            case 'variable_damage':
                const boardColors = new Set();
                this.board.grid.forEach(row => row.forEach(cell => boardColors.add(cell.type)));
                const diversity = boardColors.size;
                this.dealDamageToRandomEnemy(skill.val * diversity, monster.element);
                break;
            case 'convert':
                this.board.convertAllOrbs(skill.color);
                break;
            case 'spawn':
                this.board.spawnOrbs(skill.spawnColor, skill.spawnCount);
                break;
            case 'damage_spawn':
                this.dealDamageToRandomEnemy(skill.val, monster.element);
                this.board.spawnOrbs(skill.spawnColor, skill.spawnCount);
                break;
            case 'delay':
            case 'damage_delay':
                if (skill.val) this.dealDamageToRandomEnemy(skill.val, monster.element);
                const delay = skill.delay || 1;
                this.enemies.forEach(e => {
                    e.currentTimer += delay;
                    this.showDamageText(`Delay +${delay}`, 'cyan', e.el);
                });
                break;
        }

        // スキルの演出待ち
        await new Promise(r => setTimeout(r, 800));
        await this.checkLevelClear();
        this.isProcessing = false;
    }


    addGutsToParty(counts) {
        this.party.forEach(m => {
            if (counts[m.element] > 0) {
                // スキル生成ドロップ分を除いたカウントでガッツ加算
                const naturalCount = counts[m.element];
                if (naturalCount > 0) {
                    const amount = Math.floor(naturalCount * 1.5);
                    m.addGuts(amount);
                }
            }
        });
        this.updateGutsUI();
    }

    setupStart() {
        this.modal.addEventListener('click', () => {
            if (this.modal.querySelector('#game-over-screen').classList.contains('hidden')) {
                this.audio.init();
                this.audio.startBGM();
                this.modal.classList.add('hidden');
                this.startLevel();
            } else {
                // Retry
                location.reload();
            }
        });
    }

    startLevel() {
        this.floor++;
        this.floorEl.textContent = this.floor;
        this.spawnEnemies();
    }

    spawnEnemies() {
        this.enemies = [];
        this.enemyContainer.innerHTML = '';
        const count = Math.floor(Math.random() * 3) + 1; // 1-3 enemies

        for (let i = 0; i < count; i++) {
            const imgName = ENEMY_IMAGES[Math.floor(Math.random() * ENEMY_IMAGES.length)];
            const data = {
                name: imgName.replace('.png', ''),
                img: imgName,
                baseHp: 100 + (this.floor * 20),
                atk: 25 + (this.floor * 3)
            };
            const enemy = new Monster(data, true, this.floor);
            this.enemies.push(enemy);

            // オーラ色の取得
            const auraColorName = MONSTER_AURAS[enemy.name] || '白';
            const shadowColor = AURA_COLORS[auraColorName] || '#ffffff';

            // UI
            const div = document.createElement('div');
            div.className = 'enemy';
            // Visual Aura
            div.style.border = `3px solid ${shadowColor}`;
            div.style.borderRadius = '8px';
            div.style.boxShadow = `0 0 15px ${shadowColor}`;
            div.style.position = 'relative';

            div.innerHTML = `
                <div class="enemy-hp-bar"><div class="enemy-hp-fill" style="width: 100%"></div></div>
                <div class="enemy-timer" style="position:absolute; top:-20px; right:0; color:white; font-weight:bold; font-size:12px; text-shadow:1px 1px 0 #000;">あと${enemy.currentTimer}</div>
                <img src="${IMAGE_PATH}${enemy.img}">
            `;
            enemy.el = div;
            enemy.hpFillEl = div.querySelector('.enemy-hp-fill');
            enemy.timerEl = div.querySelector('.enemy-timer');
            this.enemyContainer.appendChild(div);
        }
    }

    async processTurn() {
        this.isProcessing = true;

        let comboCount = 0;
        let totalDamage = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 0-5 for damage types. 6 is Heart.
        let totalHeal = 0;
        let aoeFlags = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };

        // Track erased orbs by color for Guts
        let erasedCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        // Loop matches/drops
        while (true) {
            const groups = this.board.findMatchGroups(); // [[{r,c},...], ...]
            if (groups.length === 0) break;

            // Sequential processing of combos in this wave
            for (const group of groups) {
                comboCount++;
                this.audio.playMatchSE(comboCount);

                // Add to stats
                const type = group.type;
                const count = group.coords.length;

                if (erasedCounts[type] !== undefined) {
                    erasedCounts[type] += count;
                }

                if (type === ELEMENTS.HEART) {
                    totalHeal += 20 * (count / 3);
                } else if (type <= 5) { // Damage types
                    totalDamage[type] += 10 * (count / 3);
                    if (count >= CONFIG.aoeThreshold) {
                        aoeFlags[type] = true;
                    }
                }

                // スキル生成でないドロップのみガッツ加算用にカウント
                const naturalOrbs = group.coords.filter(({ r, c }) => !this.board.grid[r][c].isSkillGenerated);
                erasedCounts[type] += naturalOrbs.length;

                // コンボ表示更新
                this.updateComboUI(comboCount);

                await this.board.fadeOrbs(group.coords);
            }

            await this.board.removeAndDrop(groups);
            await new Promise(r => setTimeout(r, 400)); // Drop animation wait
        }

        // コンボに応じた倍率計算 (低め: 1コンボにつき +5%)
        const comboMultiplier = 1.0 + (comboCount - 1) * 0.05;

        // Apply Results
        if (comboCount > 0) {
            // Guts Accumulation (Per Element)
            this.addGutsToParty(erasedCounts);

            // Heal (倍率適用)
            if (totalHeal > 0) {
                this.heal(Math.floor(totalHeal * comboMultiplier));
            }

            // Attack (倍率適用)
            await this.playerAttack(totalDamage, comboMultiplier, aoeFlags);

            // コンボ表示を消す
            setTimeout(() => {
                this.comboDisplay.classList.add('hidden');
            }, 1000);
        }

        // Check Clear (スキルによる撃破も含めてここで統合チェック)
        await this.checkLevelClear();
        this.isProcessing = false;
    }

    updateComboUI(count) {
        this.comboDisplay.textContent = `${count} Combo`;
        this.comboDisplay.classList.remove('hidden', 'pop');
        void this.comboDisplay.offsetWidth; // reflow
        this.comboDisplay.classList.add('pop');
    }

    async checkLevelClear() {
        if (this.enemies.length === 0 && !this.isLevelClearing) {
            this.isLevelClearing = true;
            this.audio.playClearSE();
            await new Promise(r => setTimeout(r, 1000));
            this.startLevel();
            this.isLevelClearing = false;
        } else if (this.enemies.length > 0) {
            // 残っていれば敵のターンへ
            await this.enemyTurn();
        }
    }

    heal(amount) {
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + amount);
        this.updateHpUI();
        this.showDamageText(amount, 'green', this.hpBar);
    }

    async playerAttack(damageDict, comboMultiplier, aoeFlags) {
        // Calculate total dmg per element
        for (let el = 0; el < 6; el++) { // 6 Elements
            if (damageDict[el] > 0) {
                // Find allies with this element
                const attackers = this.party.filter(m => m.element === el);
                if (attackers.length === 0) continue;

                const multiplier = (damageDict[el] / 10) * comboMultiplier;

                // Attack SE
                this.audio.playAttackSE();

                for (const m of attackers) {
                    const dmg = Math.floor(m.atk * multiplier);
                    if (aoeFlags[el]) {
                        // AOE: Attack ALL enemies
                        for (const enemy of [...this.enemies]) {
                            this.dealDamage(dmg, m.element, enemy);
                        }
                    } else {
                        // Single: Random target
                        const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                        if (target) this.dealDamage(dmg, m.element, target);
                    }
                    await new Promise(r => setTimeout(r, 200)); // Stagger attacks
                }
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }

    getAffinityMultiplier(atkEl, defEl) {
        if (atkEl <= 3 && defEl <= 3) {
            // Check Strong
            if ((atkEl === ELEMENTS.RED && defEl === ELEMENTS.GREEN) ||
                (atkEl === ELEMENTS.GREEN && defEl === ELEMENTS.YELLOW) ||
                (atkEl === ELEMENTS.YELLOW && defEl === ELEMENTS.BLUE) ||
                (atkEl === ELEMENTS.BLUE && defEl === ELEMENTS.RED)) {
                return 1.5;
            }
            // Check Weak (Reverse)
            if ((defEl === ELEMENTS.RED && atkEl === ELEMENTS.GREEN) ||
                (defEl === ELEMENTS.GREEN && atkEl === ELEMENTS.YELLOW) ||
                (defEl === ELEMENTS.YELLOW && atkEl === ELEMENTS.BLUE) ||
                (defEl === ELEMENTS.BLUE && atkEl === ELEMENTS.RED)) {
                return 0.5;
            }
        }

        // White/Black
        if ((atkEl === ELEMENTS.WHITE && defEl === ELEMENTS.BLACK) ||
            (atkEl === ELEMENTS.BLACK && defEl === ELEMENTS.WHITE)) {
            return 1.5;
        }

        return 1.0;
    }

    dealDamage(baseDmg, atkEl, target) {
        if (!target || target.currentHp <= 0) return;

        const mult = this.getAffinityMultiplier(atkEl, target.element);
        const finalDmg = Math.floor(baseDmg * mult);
        const isCritical = mult > 1.0;
        const color = isCritical ? 'orange' : (mult < 1.0 ? 'gray' : 'white');
        const text = finalDmg + (isCritical ? ' (x1.5)' : '');

        const isDead = target.takeDamage(finalDmg);
        this.showDamageText(text, color, target.el);

        // Update Enemy UI
        const pct = (target.currentHp / target.maxHp) * 100;
        target.hpFillEl.style.width = `${pct}%`;

        if (isDead) {
            target.el.style.opacity = '0';
            setTimeout(() => {
                if (target.el.parentNode) target.el.parentNode.removeChild(target.el);
            }, 500);
            this.enemies = this.enemies.filter(e => e !== target);
            this.score += 100 * this.floor;
            this.scoreEl.textContent = this.score;
        }
    }

    dealDamageToRandomEnemy(baseDmg, atkEl) {
        if (this.enemies.length === 0) return;
        const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
        this.dealDamage(baseDmg, atkEl, target);
    }

    async enemyTurn() {
        if (this.enemies.length === 0) return;
        for (const enemy of this.enemies) {
            enemy.currentTimer--;
            if (enemy.timerEl) {
                enemy.timerEl.textContent = `あと${enemy.currentTimer}`;
            }

            if (enemy.currentTimer <= 0) {
                enemy.el.classList.add('shake');
                setTimeout(() => enemy.el.classList.remove('shake'), 500);

                const dmg = enemy.atk;
                this.playerHp = Math.max(0, this.playerHp - dmg);
                this.updateHpUI();

                this.audio.playDamageSE();
                this.showDamageText(dmg, 'red', this.hpBar);

                document.getElementById('game-container').classList.add('shake');
                setTimeout(() => document.getElementById('game-container').classList.remove('shake'), 500);

                if (this.playerHp === 0) {
                    this.gameOver();
                    return;
                }

                enemy.currentTimer = enemy.turnTimer;
                if (enemy.timerEl) {
                    enemy.timerEl.textContent = `あと${enemy.currentTimer}`;
                }
                await new Promise(r => setTimeout(r, 600));
            }
        }
    }

    updateHpUI() {
        const pct = (this.playerHp / this.playerMaxHp) * 100;
        this.hpBar.style.width = `${pct}%`;
        this.hpText.textContent = `${this.playerHp}/${this.playerMaxHp}`;
    }

    showDamageText(val, color, targetEl) {
        if (!targetEl) return;
        const div = document.createElement('div');
        div.className = 'damage-text';
        div.textContent = val;
        div.style.color = color;
        div.style.fontSize = '20px';
        div.style.textShadow = '2px 2px 0 #000';

        const rect = targetEl.getBoundingClientRect();
        div.style.left = (rect.left + rect.width / 2) + 'px';
        div.style.top = (rect.top) + 'px';

        document.body.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }

    gameOver() {
        this.modal.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        const goScreen = document.getElementById('game-over-screen');
        goScreen.classList.remove('hidden');
        document.getElementById('final-score').textContent = this.score;
        this.audio.stopBGM();
    }
}

// Start Game
window.onload = () => {
    const game = new Game();
};
