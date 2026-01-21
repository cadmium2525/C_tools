// Constants moved to data.js
const IMAGE_PATH = 'images/';

// --- Classes ---

class Monster {
    constructor(data, isEnemy = false, level = 1) {
        this.uid = data.uid || Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        this.name = data.name || 'Unknown';
        this.img = data.img;
        this.isEnemy = isEnemy;

        // Rarity Logic
        this.rarity = data.rarity || 1;
        this.rarity = Math.min(10, Math.max(1, this.rarity));

        // Stats based on Rarity
        let baseStats = RARITY_STATS[this.rarity] || RARITY_STATS[1];

        const multiplier = isEnemy ? (1 + level * 0.2) : 1;

        this.maxHp = Math.floor(baseStats.hp * multiplier);
        this.atk = Math.floor(baseStats.atk * multiplier);

        // Enemy specific override (optional, keep them challenging)
        if (isEnemy) {
            this.maxHp = Math.floor((data.baseHp || 1000) * multiplier); // Enemies keep original logic or scaled? Use original for enemies to be safe
            // User request says "Monster has status elements... HP/ATK changes with rarity". 
            // "Life total is adventure life". This implies Player Party monsters.
            // For enemies, we should stick to a balanced curve or assume they also have rarity?
            // Let's stick to old enemy logic if 'baseHp' is provided in data, else use Rarity.
            if (data.baseHp) {
                this.maxHp = Math.floor(data.baseHp * multiplier);
                this.atk = Math.floor(data.atk * multiplier);
            }
        }

        this.currentHp = this.maxHp;

        // Element logic
        if (data.element !== undefined) {
            this.element = data.element;
        } else {
            // Assign element from aura in data.js
            const aura = MONSTER_AURAS[this.name] || '白';
            this.element = AURA_TO_ELEMENT[aura] || ELEMENTS.WHITE;
        }

        this.turnTimer = Math.floor(Math.random() * 3) + 2;
        this.currentTimer = this.turnTimer;

        // Skills & Guts (Ally)
        this.guts = 0;
        this.maxGuts = 99;

        // Status Effects
        this.status = null;
        this.statusTurns = 0;
        this.atkMultiplier = 1.0;
        this.gutsMultiplier = 1.0;
        this.costMultiplier = 1.0;
        this.critMultiplier = 1.0;
        this.extraAtk = 0;

        this.statusEl = null;

        // Skill costs & multipliers
        this.baseCostMultiplier = 1.0;
        this.critChanceMultiplier = 1.0;

        // Assign Skills (Hero Skill + Normal Skill) based on User Request
        this.assignHeroSkill();
        this.assignDefaultSkills();
    }

    assignHeroSkill() {
        let types = [1, 2, 3];
        this.heroSkillType = types[Math.floor(Math.random() * types.length)];

        // 特定のモンスターは勇者スキルを固定
        if (this.name === 'モノリス') this.heroSkillType = 1;
        if (this.name === 'ガリ') this.heroSkillType = 2;

        switch (this.heroSkillType) {
            case 1:
                this.heroSkill = {
                    type: 1,
                    desc: (this.name === 'モノリス')
                        ? "黒ディスクを5個繋げて消すと味方全員の攻撃力が4倍、6個で6倍"
                        : "同色ディスク5個消しで攻撃力4倍、6個以上で6倍",
                    calc: (type, count) => {
                        if (type === this.element) {
                            if (count >= 6) return 6.0;
                            if (count === 5) return 4.0;
                        }
                        return 1.0;
                    }
                };
                break;
            case 2:
                this.heroSkill = {
                    type: 2,
                    desc: "3色:2倍, 4色:3倍, 5色:5倍, 5色+回復:7倍",
                    // calc handled in Game.processTurn based on unique types
                };
                break;
            case 3:
                this.heroSkill = {
                    type: 3,
                    desc: "3コンボ:2倍, 7コンボ:6倍, 10コンボ:10倍",
                    // calc handled in Game.processTurn based on comboCount
                };
                break;
        }
    }

    assignDefaultSkills() {
        if (MONSTER_SKILLS[this.name]) {
            this.skills = MONSTER_SKILLS[this.name];
        } else {
            // Generic skills based on Element
            const elementNames = ['赤', '緑', '黄', '青', '白', '黒'];
            const elName = elementNames[this.element] || '無';
            const genericSkills = [
                { name: `${elName}のアタック`, cost: 20, type: 'damage', val: this.atk * 3, desc: `敵単体に${elName}属性ダメージ` },
                { name: `${elName}の恵み`, cost: 30, type: 'spawn', spawnColor: this.element, spawnCount: 5, desc: `${elName}ディスクを5個生成` }
            ];
            this.skills = genericSkills;
        }
    }

    getRarityStars() {
        let s = '';
        for (let i = 0; i < this.rarity; i++) {
            // 1-5: ☆ (Yellow/White?), 6-10: ★ (Red?)
            // User: 1-5=☆, 6-10=★ + ☆...
            // Wait:
            // 1: ☆
            // 5: ☆☆☆☆☆
            // 6: ★☆☆☆☆
            // 10: ★★★★★
            // So 5 stars max displayed? 
            // Logic:
            // Solid Stars (Red ★) = Math.max(0, rarity - 5)
            // Empty/Yellow Stars (Verify User: "☆＝黄色, ★＝赤")
            // Rarity 6: ★(1) + ☆(4) = Total 5 icons?
            // Rarity 7: ★★☆☆☆
            // So always 5 icons, filled with Red then Yellow?
        }
        // Let's implement this logic in rendering, not here.
        return this.rarity;
    }


    addStatus(name, turns) {
        this.status = name;
        this.statusTurns = turns;
        this.updateStatusEffects();
    }

    updateStatusEffects() {
        if (!this.el) return;
        if (this.statusEl) this.statusEl.remove();
        if (this.status) {
            this.statusEl = document.createElement('div');
            this.statusEl.className = 'status-effect';
            this.statusEl.textContent = this.status;
            this.el.appendChild(this.statusEl);

            // Apply immediate effects
            switch (this.status) {
                case '憤怒': this.extraAtk = this.atk * 0.5; break;
                case '逆上': this.atkMultiplier = 1.5; this.costMultiplier = 1.5; break;
                case '余裕': this.gutsMultiplier = 1.5; this.costMultiplier = 0.5; break;
                case '必死': this.critChanceMultiplier = 0.8; break; // Crit chance handled in dealDamage
                case '底力': this.atkMultiplier = 1.0; break; // Handled in playerAttack based on HP
                case '根性': break; // Handled in enemyTurn
            }
        } else {
            // Reset effects if status is removed
            this.atkMultiplier = 1.0;
            this.gutsMultiplier = 1.0;
            this.costMultiplier = 1.0;
            this.critChanceMultiplier = 1.0;
            this.extraAtk = 0;
        }
    }

    addGuts(amount) {
        const finalAmount = Math.floor(amount * this.gutsMultiplier);
        this.guts = Math.min(this.maxGuts, this.guts + finalAmount);
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
            // Fix: ドラッグ開始時に以前のリスナーを確実に掃除し、多重起動を防ぐ
            handleEnd();
            if (this.game.isProcessing) return;
            e.preventDefault();

            // Fix: Remove any existing drag element to prevent artifacts
            if (this.dragEl) {
                this.dragEl.remove();
                this.dragEl = null;
            }

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

            // Fix: 画面外やタブ切り替えで操作不能になるのを防ぐ
            window.addEventListener('blur', handleEnd);
            document.addEventListener('mouseleave', handleEnd);
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

                // 隣接セル（斜め含む）のみスワップを許可
                const distR = Math.abs(targetR - this.gridPos.r);
                const distC = Math.abs(targetC - this.gridPos.c);

                if (distR <= 1 && distC <= 1) {
                    // 最初の移動でタイマー開始
                    if (!this.isTimerStarted) {
                        this.isTimerStarted = true;
                        this.dragStartTime = Date.now();
                        this.timerId = setInterval(() => {
                            const elapsed = Date.now() - this.dragStartTime;
                            const currentMoveTime = this.moveTimeBonus > 0 ? CONFIG.moveTime * 2 : CONFIG.moveTime;
                            const ratio = Math.max(0, 1 - elapsed / currentMoveTime);
                            this.timerBar.style.transform = `scaleX(${ratio})`;

                            if (elapsed > currentMoveTime) {
                                handleEnd();
                            }
                        }, 50);
                    }

                    this.swapOrbs(this.gridPos.r, this.gridPos.c, targetR, targetC);
                    this.gridPos = { r: targetR, c: targetC };
                    this.game.audio.playSwapSE();
                }
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
            window.removeEventListener('blur', handleEnd);
            document.removeEventListener('mouseleave', handleEnd);

            if (this.isTimerStarted) {
                this.game.processTurn();
            }
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

    convertRow(rowIdx, targetType) {
        if (rowIdx === 'center') rowIdx = Math.floor(this.height / 2);
        for (let c = 0; c < this.width; c++) {
            const orb = this.grid[rowIdx][c];
            orb.type = targetType;
            orb.isSkillGenerated = true;
            orb.el.dataset.type = targetType;
            orb.el.classList.toggle('square', targetType === ELEMENTS.HEART);
        }
    }

    convertColumns(colIndices, targetType) {
        colIndices.forEach(c => {
            if (c < 0 || c >= this.width) return;
            for (let r = 0; r < this.height; r++) {
                const orb = this.grid[r][c];
                orb.type = targetType;
                orb.isSkillGenerated = true;
                orb.el.dataset.type = targetType;
                orb.el.classList.toggle('square', targetType === ELEMENTS.HEART);
            }
        });
    }

    convertDual(color1, color2) {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const orb = this.grid[r][c];
                orb.type = Math.random() < 0.5 ? color1 : color2;
                orb.isSkillGenerated = true;
                orb.el.dataset.type = orb.type;
                orb.el.classList.toggle('square', orb.type === ELEMENTS.HEART);
            }
        }
    }

    convertSpecific(fromType, toType) {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const orb = this.grid[r][c];
                if (orb.type === fromType) {
                    orb.type = toType;
                    orb.el.dataset.type = toType;
                    orb.el.classList.toggle('square', toType === ELEMENTS.HEART);
                }
            }
        }
    }

    ensureMinimumOrbs(minCount = 3) {
        // 全色（0-6）について、確実にminCount以上ある状態にする
        // 開発メモ：無差別に上書きすると他色の確保分を消してしまうため、余剰分から奪うようにする。

        for (let type = 0; type < 7; type++) {
            const currentPositions = [];
            const otherPositions = [];

            for (let r = 0; r < this.height; r++) {
                for (let c = 0; c < this.width; c++) {
                    if (this.grid[r][c].type === type) {
                        currentPositions.push({ r, c });
                    } else {
                        // 4個以上ある色（削っても3個残る）の場所をリストアップ
                        const otherType = this.grid[r][c].type;
                        let otherCount = 0;
                        for (let r2 = 0; r2 < this.height; r2++) {
                            for (let c2 = 0; c2 < this.width; c2++) {
                                if (this.grid[r2][c2].type === otherType) otherCount++;
                            }
                        }
                        if (otherCount > minCount) {
                            otherPositions.push({ r, c });
                        }
                    }
                }
            }

            if (currentPositions.length < minCount) {
                let needed = minCount - currentPositions.length;

                // otherPositionsをシャッフル
                for (let i = otherPositions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [otherPositions[i], otherPositions[j]] = [otherPositions[j], otherPositions[i]];
                }

                for (let pos of otherPositions) {
                    if (needed <= 0) break;
                    const orb = this.grid[pos.r][pos.c];
                    orb.type = type;
                    orb.isSkillGenerated = true;
                    orb.el.dataset.type = type;
                    orb.el.classList.toggle('square', type === ELEMENTS.HEART);
                    needed--;
                }
            }
        }
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
        this.currentTarget = null;
        this.comboHistory = 0; // 5コンボ以上の連続達成数
        this.damageShield = 1.0; // ダメージ軽減倍率
        this.longPressTimer = null; // 長押し用タイマー

        // UI Refs
        this.floorEl = document.getElementById('floor-display');
        this.scoreEl = document.getElementById('score-display');
        this.enemyContainer = document.getElementById('enemy-container');
        this.partyContainer = document.getElementById('party-container');
        this.hpBar = document.getElementById('player-hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.comboDisplay = document.getElementById('combo-display');
        this.modal = document.getElementById('modal-overlay');
        this.helpModal = document.getElementById('help-overlay');
        this.helpBtn = document.getElementById('help-btn');

        // Shop & Bag Elements
        this.shopOverlay = document.getElementById('shop-overlay');
        this.bagOverlay = document.getElementById('bag-overlay');
        this.shopItemsEl = document.getElementById('shop-items');
        this.bagItemsEl = document.getElementById('bag-items');
        this.inventory = {}; // { itemId: count }
        this.board.moveTimeBonus = 0;

        this.initHighScore();
        // this.initParty(); // Removed fixed party init
        this.setupStart();
        this.setupBGM();
        this.setupHelp();
        this.setupItemBag();

        // Gacha & Team Data
        this.ownedMonsters = []; // Array of Monster objects
        this.party = []; // Array of Monster objects (max 6)
        this.lastGachaResults = [];
        this.gachaCount = 0; // Initialize to prevent NaN

        // Load Game Check
        if (localStorage.getItem('pazumono_save_data')) {
            const contBtn = document.getElementById('continue-btn');
            contBtn.classList.remove('hidden');
            contBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent bubbling if any
                this.audio.init();
                this.audio.startBGM();
                this.modal.classList.add('hidden');
                this.loadGame();
            };
        }
    }

    startNewGame() {
        this.ownedMonsters = [];
        this.party = []; // Fixed size 6, filled with nulls strictly? Or just array.
        // Let's initialize party with 6 nulls to support slot-based editing
        this.party = [null, null, null, null, null, null];

        this.floor = 1;
        this.score = 0;
        this.inventory = {};

        this.shopItemsCache = [];
        this.shopFloor = 0;
        this.gachaCount = 0; // Track 5-pull gacha count for cost scaling

        // 1. Initial 10-pull Gacha (Free)
        this.drawGacha(10, true);
    }

    // --- Gacha System ---
    // --- Gacha System ---
    drawGacha(count, isInitial = false) {
        if (!isInitial) {
            this.gachaCount++;
        }

        const results = [];
        for (let i = 0; i < count; i++) {
            // Rarity Logic: 1-3 only from Gacha
            const rand = Math.random() * 100;
            let rarity = 1;
            if (rand < 15) rarity = 3;
            else if (rand < 40) rarity = 2;

            if (isInitial && rarity > 3) rarity = 3;

            // Pick Random Monster Species
            const speciesName = MONSTER_SPECIES[Math.floor(Math.random() * MONSTER_SPECIES.length)];
            const imgName = speciesName + '.png';

            const monsterData = {
                name: speciesName,
                img: imgName,
                rarity: rarity,
            };

            // Resolve Element from Aura
            const auraColor = MONSTER_AURAS[speciesName];
            if (auraColor) {
                if (auraColor === '赤') monsterData.element = ELEMENTS.RED;
                else if (auraColor === '緑') monsterData.element = ELEMENTS.GREEN;
                else if (auraColor === '青') monsterData.element = ELEMENTS.BLUE;
                else if (auraColor === '白') monsterData.element = ELEMENTS.WHITE;
                else if (auraColor === '黒') monsterData.element = ELEMENTS.BLACK;
                else if (auraColor === '黄色') monsterData.element = ELEMENTS.YELLOW;
            }

            const newMonster = new Monster(monsterData);

            // NO AUTO FUSION. Always add as new.
            this.ownedMonsters.push(newMonster);
            results.push({ monster: newMonster, isNew: true });
        }

        this.lastGachaResults = results;
        this.playGachaAnimation(results, isInitial);
    }

    playGachaAnimation(results, isInitial) {
        // Show Gacha Screen
        const screen = document.getElementById('gacha-screen');
        const stoneImg = document.getElementById('gacha-stone-img');
        const message = document.getElementById('gacha-message');
        const resultsContainer = document.getElementById('gacha-results');
        const closeBtn = document.getElementById('gacha-close-btn');

        screen.classList.remove('hidden');
        resultsContainer.innerHTML = ''; // Clear previous
        resultsContainer.classList.add('hidden');
        closeBtn.classList.add('hidden');
        stoneImg.src = 'images/gacha_stone_0.png';
        stoneImg.classList.remove('hidden');
        message.classList.remove('hidden');

        // BGM切り替え
        this.audio.startBGM('gacha');

        // Wait for click
        const clickHandler = () => {
            screen.removeEventListener('click', clickHandler);

            // Animation Sequence
            message.classList.add('hidden');
            stoneImg.classList.add('shaking');
            this.audio.playGachaShakeSE();

            // Stone Break Animation (Crumble 1 -> 2 -> 3)
            let step = 1;
            const animInterval = setInterval(() => {
                if (step <= 3) {
                    stoneImg.src = `images/gacha_crumble_${step}.png`;
                    this.audio.playGachaShakeSE();
                    step++;
                } else {
                    clearInterval(animInterval);
                    stoneImg.classList.remove('shaking');
                    stoneImg.classList.add('hidden');
                    this.audio.playGachaBreakSE();

                    // Show Light Effect based on max rarity in result
                    const maxRarity = Math.max(...results.map(r => r.monster.rarity));
                    // Create light element
                    const light = document.createElement('div');
                    light.className = 'gacha-light active';
                    if (maxRarity >= 3) light.style.boxShadow = '0 0 500px 300px rgba(255, 215, 0, 1)'; // Gold
                    else light.style.boxShadow = '0 0 500px 300px rgba(200, 200, 255, 1)'; // Blueish

                    document.getElementById('gacha-animation-container').appendChild(light);

                    // Fade to Results
                    setTimeout(() => {
                        light.remove();
                        this.showGachaResults(results, isInitial);
                    }, 1000);
                }
            }, 200); // 200ms per frame
        };

        screen.addEventListener('click', clickHandler);
    }

    showGachaResults(results, isInitial) {
        const container = document.getElementById('gacha-results');
        container.classList.remove('hidden');

        results.forEach((res, index) => {
            const card = document.createElement('div');
            card.className = 'gacha-result-card';
            card.style.animationDelay = `${index * 0.1}s`;

            const img = document.createElement('img');
            img.src = IMAGE_PATH + res.monster.img;

            const name = document.createElement('div');
            name.className = 'gacha-result-name';
            name.textContent = res.monster.name;

            const rarity = document.createElement('div');
            rarity.className = 'monster-rarity';
            rarity.innerHTML = this.renderStars(res.monster.rarity);

            if (res.isNew) {
                const badge = document.createElement('div');
                badge.className = 'new-badge';
                badge.textContent = 'NEW';
                card.appendChild(badge);
            }

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(rarity); // Add stars to card
            container.appendChild(card);
        });

        const closeBtn = document.getElementById('gacha-close-btn');
        closeBtn.classList.remove('hidden');
        closeBtn.onclick = () => {
            document.getElementById('gacha-screen').classList.add('hidden');

            if (isInitial) {
                this.audio.startBGM('peace');
                this.openTeamSelect();
            } else {
                this.saveGame();
                // Return to shop (Refresh shop to update cost!)
                this.showShop(true);
            }
        };
    }

    renderStars(rarity) {
        let red = 0;
        let yellow = 0;

        if (rarity <= 5) {
            yellow = rarity;
        } else {
            red = rarity - 5;
            yellow = 5 - red; // Fill remainder with yellow
        }

        let html = '';
        for (let i = 0; i < red; i++) html += '<span class="star red">★</span>';
        for (let i = 0; i < yellow; i++) html += '<span class="star yellow">★</span>';
        return html;
    }

    // --- Team Selection ---
    openTeamSelect(fromShop = false) {
        const screen = document.getElementById('team-select-screen');
        screen.classList.remove('hidden');

        if (fromShop) {
            this.shopOverlay.classList.add('hidden');
        }

        document.getElementById('start-adventure-btn').textContent = fromShop ? "決定" : "冒険に出る";

        // Reset party to 6 slots if needed (to ensure we can edit 6 slots)
        if (this.party.length < 6) {
            while (this.party.length < 6) this.party.push(null);
        }

        this.selectedTeamSlot = null; // Reset selection
        this.renderTeamSelect();

        document.getElementById('start-adventure-btn').onclick = () => {
            // 全スロットが埋まっているかチェック (6体必須)
            const filledSlots = this.party.filter(m => m !== null);
            if (filledSlots.length < 6) {
                alert("パーティを6体すべて埋めてください！\n（スロットを選択してモンスターを選んでください）");
                return;
            }

            if (fromShop) {
                document.getElementById('team-select-screen').classList.add('hidden');
                this.showShop((this.floor - 1) % 10 === 0); // Re-render shop
                return;
            }

            // gameplay cleanup

            // Temp cleanup for adventure
            const adventureParty = this.party.filter(m => m !== null);

            // Clean up nulls for actual gameplay session
            this.party = adventureParty;

            document.getElementById('team-select-screen').classList.add('hidden');
            this.startAdventure();
        };
    }

    renderTeamSelect() {
        const slotsContainer = document.getElementById('team-slots');
        const listContainer = document.getElementById('monster-list');

        slotsContainer.innerHTML = '';
        // Always 6 slots
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'team-slot';
            if (this.selectedTeamSlot === i) {
                slot.classList.add('selected-slot'); // CSS style needed
            }

            const member = this.party[i];

            if (member) {
                slot.classList.add('filled');
                const img = document.createElement('img');
                img.src = IMAGE_PATH + member.img;
                slot.appendChild(img);

                const label = document.createElement('div');
                label.className = 'team-slot-label';
                label.textContent = (i === 0) ? '勇者' : `供${i}`;
                slot.appendChild(label);
            } else {
                slot.textContent = (i === 0) ? '勇者' : `供${i}`;
                slot.style.color = '#555';
                slot.style.fontSize = '12px';
            }

            slot.onclick = () => {
                // Select this slot
                if (this.selectedTeamSlot === i) {
                    this.selectedTeamSlot = null; // Toggle off
                } else {
                    this.selectedTeamSlot = i;
                }
                this.renderTeamSelect();
            };

            slotsContainer.appendChild(slot);
        }

        listContainer.innerHTML = '';
        this.ownedMonsters.forEach(m => {
            // Check if m is in party
            const currentSlot = this.party.findIndex(p => p === m); // Exact object match
            const isInParty = currentSlot !== -1;

            const card = document.createElement('div');
            card.className = 'monster-card';
            if (isInParty) card.classList.add('selected'); // Visual dimming

            const img = document.createElement('img');
            img.src = IMAGE_PATH + m.img;

            const rarity = document.createElement('div');
            rarity.className = 'monster-rarity';
            rarity.innerHTML = this.renderStars(m.rarity);

            card.appendChild(img);
            card.appendChild(rarity);

            // Show current position badge if in party
            if (isInParty) {
                const badge = document.createElement('div');
                badge.className = 'slot-badge';
                badge.textContent = (currentSlot === 0) ? '勇' : currentSlot;
                card.appendChild(badge);
            }

            card.onclick = () => {
                this.showTeamMemberInfo(m);

                // If a slot is selected, Assign/Swap
                if (this.selectedTeamSlot !== null) {
                    const targetSlot = this.selectedTeamSlot;

                    if (isInParty) {
                        if (currentSlot === targetSlot) {
                            // Clicked same monster in same slot -> Remove?
                            this.party[targetSlot] = null;
                        } else {
                            // Move/Swap?
                            // Logic: Move m to targetSlot.
                            // What happens to content of targetSlot?
                            // Swap them?
                            const existingInTarget = this.party[targetSlot];
                            this.party[targetSlot] = m;
                            this.party[currentSlot] = existingInTarget; // Swap
                        }
                    } else {
                        // Not in party -> Assign to targetSlot
                        this.party[targetSlot] = m;
                    }
                    this.renderTeamSelect();
                } else {
                    // No slot selected -> Do nothing or auto-fill?
                    // Let's prompt user or just select first empty?
                    // Guidance says "Specify slot". So waiting for slot selection is better.
                    // But for better UX, if no slot selected, maybe show alert "Select a slot first"?
                    // Or just do nothing.
                    // I will do nothing but maybe highlight slots?
                }
            };

            listContainer.appendChild(card);
        });
    }

    showTeamMemberInfo(monster) {
        const infoBox = document.getElementById('team-skill-info');
        infoBox.classList.remove('hidden');

        document.getElementById('ts-name').textContent = monster.name;

        // 勇者スキルは monster.heroSkill.desc を使用
        document.getElementById('ts-hero-desc').textContent = monster.heroSkill.desc;

        // 固有スキルまたはデフォルトスキルを表示
        const skills = monster.skills || [];
        if (skills && skills.length > 0) {
            const s = skills[0]; // 最初のスキルを表示
            document.getElementById('ts-normal-desc').textContent = `${s.name}: ${s.desc}`;
        } else {
            document.getElementById('ts-normal-desc').textContent = "なし";
        }
    }

    startAdventure() {
        this.saveGame();
        this.audio.startBGM('battle'); // Combat music

        // Reset Game State for Adventure
        this.playerMaxHp = this.party.reduce((sum, m) => sum + m.maxHp, 0);
        this.playerHp = this.playerMaxHp;
        this.updateHpUI();

        // Render Party in Game UI
        this.renderPartyUI();

        // Show Board
        document.getElementById('start-screen').parentElement.classList.add('hidden'); // Close start screen
        this.gameStarted = true;
        this.board.init();

        // Start Level (Spawn Enemies etc)
        this.startLevel();
    }

    // --- Save/Load System ---
    saveGame() {
        const data = {
            floor: this.floor,
            score: this.score,
            inventory: this.inventory,
            ownedMonsters: this.ownedMonsters,
            party: this.party,
            gachaCount: this.gachaCount,
            currentBg: this.currentBg, // 背景も保存
            // currentHp? If saving mid-dungeon
        };
        localStorage.setItem('pazumono_save_data', JSON.stringify(data));
    }

    loadGame() {
        const json = localStorage.getItem('pazumono_save_data');
        if (!json) return;

        const data = JSON.parse(json);
        this.floor = data.floor || 1;
        this.score = data.score || 0;
        this.inventory = data.inventory || {};
        this.gachaCount = data.gachaCount || 0;

        // Reconstruct Monsters (Lose methods on JSON stringify, need to re-hydrate)
        this.ownedMonsters = (data.ownedMonsters || []).map(d => this.hydrateMonster(d));
        // partyはownedMonstersの中の同一uidのインスタンスを参照させる
        this.party = (data.party || []).map(d => {
            if (!d) return null;
            return this.ownedMonsters.find(m => m.uid === d.uid) || this.hydrateMonster(d);
        });

        // Update UI
        document.getElementById('floor-display').textContent = this.floor;
        document.getElementById('score-display').textContent = this.score;

        // 背景の復元
        if (data.currentBg) {
            this.changeBackground(data.currentBg);
        }

        // Start Adventure
        if (this.party.length > 0) {
            this.startAdventure();
        } else {
            // Fallback if save is broken?
            this.startNewGame();
        }
    }

    hydrateMonster(data) {
        // Create new Monster instance and copy props
        const m = new Monster(data);
        m.uid = data.uid || m.uid;
        m.rarity = data.rarity;
        m.currentHp = data.currentHp;
        m.guts = data.guts || 0;
        m.heroSkillType = data.heroSkillType || m.heroSkillType;
        m.assignHeroSkill();
        m.assignDefaultSkills();

        return m;
    }


    getMonsterStatusName(name) {
        switch (name) {
            case 'モノリス': return '根性';
            case 'ヒノトリ': return '憤怒';
            case 'プラント': return '必死';
            case 'ウンディーネ': return '余裕';
            case 'スエゾー': return '逆上';
            case 'ガリ': return '底力';
            default: return 'なし';
        }
    }

    initHighScore() {
        this.bestFloor = parseInt(localStorage.getItem('pazumono_best_floor')) || 0;
        const bestScoreDisplay = document.getElementById('best-score-display');
        const bestScoreVal = document.getElementById('best-score-val');
        if (bestScoreDisplay && this.bestFloor > 0) {
            bestScoreDisplay.classList.remove('hidden');
            bestScoreVal.textContent = this.bestFloor + 'F';
        }
        // Legacy cleanup or migration?
        // If old score exists but new floor doesn't? Assume fresh start for feature.
    }

    saveHighScore() {
        // High Score is now based on Floor Reached
        if (this.floor > this.bestFloor) {
            this.bestFloor = this.floor;
            localStorage.setItem('pazumono_best_floor', this.bestFloor);
        }
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

    renderPartyUI() {
        // Render Party UI (No data reset!)
        this.partyContainer.innerHTML = '';
        this.party.forEach((m, index) => {
            const div = document.createElement('div');
            div.className = 'party-member';
            div.style.borderColor = this.getElementColor(m.element);

            // Hero Indicator
            if (index === 0) {
                div.classList.add('is-hero'); // CSS for styling hero
                // Maybe add icon?
            }

            const img = document.createElement('img');
            img.src = IMAGE_PATH + m.img;

            // Guts Meter
            const gutsVal = document.createElement('div');
            gutsVal.className = 'guts-val';
            gutsVal.textContent = m.guts;

            // Rarity Stars (In-game small display)
            const rarityDiv = document.createElement('div');
            rarityDiv.className = 'party-rarity';
            rarityDiv.innerHTML = this.renderStars(m.rarity);

            div.appendChild(img);
            div.appendChild(gutsVal);
            div.appendChild(rarityDiv);

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

        const monsterSkills = monster.skills || [];
        monsterSkills.forEach(skill => {
            const skillContainer = document.createElement('div');
            skillContainer.className = 'skill-item';

            const btn = document.createElement('button');
            const cost = Math.floor(skill.cost * monster.costMultiplier);
            const canUse = monster.guts >= cost;
            btn.textContent = `${skill.name} (Guts: ${cost})`;
            btn.className = 'skill-btn';
            if (!canUse) btn.classList.add('disabled');
            btn.disabled = !canUse;

            const desc = document.createElement('div');
            desc.className = 'skill-desc';
            desc.textContent = skill.desc;

            btn.onclick = () => {
                // Ensure modal closes and no re-clicks
                skillModal.remove();
                this.executeSkill(monster, skill, cost);
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

        // 固有の状態変化名をタイトルに追加
        const statusName = this.getMonsterStatusName(monster.name);
        title.textContent = `${monster.name} Skill [${statusName}]`;

        document.body.appendChild(skillModal);

        // 勇者スキルの表示
        const heroInfo = document.createElement('div');
        heroInfo.className = 'hero-skill-info';

        const heroTitle = document.createElement('div');
        heroTitle.className = 'hero-skill-title';
        heroTitle.textContent = (monster === this.party[0]) ? '★ 勇者スキル (発動中) ★' : '★ 勇者スキル (リーダー時) ★';

        const heroDesc = document.createElement('div');
        heroDesc.className = 'skill-desc';
        heroDesc.style.color = '#fff';
        heroDesc.textContent = monster.heroSkill.desc;

        heroInfo.appendChild(heroTitle);
        heroInfo.appendChild(heroDesc);

        // Append BEFORE close button
        skillModal.insertBefore(heroInfo, closeBtn);
    }

    async executeSkill(monster, skill, cost) {
        if (this.isProcessing) return;
        if (monster.guts < cost) return;

        this.isProcessing = true;
        monster.guts -= cost;
        this.updateGutsUI();

        // Skill Feedback
        this.audio.playSkillSE();
        const flash = document.createElement('div');
        flash.className = 'skill-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);

        // Apply Effect
        switch (skill.type) {
            case 'delay':
            case 'damage_delay':
                if (skill.val) this.dealSkillDamage(skill.val, monster, skill.type);
                const delay = skill.delay || 1;
                this.enemies.forEach(e => {
                    if (skill.type === 'damage_delay' && e !== (this.currentTarget || this.enemies[0])) return; // 単体遅延の場合

                    e.currentTimer += delay;
                    if (e.timerEl) e.timerEl.textContent = `あと${e.currentTimer}`;
                    this.showDamageText(`Delay +${delay}`, 'cyan', e.el);
                });
                break;
            case 'damage_shield':
                this.dealSkillDamage(skill.val, monster, 'single');
                this.damageShield = skill.shield;
                this.showDamageText('SHIELD UP!', 'gold', this.hpBar);
                break;
            case 'damage_convert':
                this.dealSkillDamage(skill.val, monster, 'all');
                this.board.convertSpecific(skill.from, skill.to);
                break;
            case 'damage_row':
                this.dealSkillDamage(skill.val, monster, 'single');
                this.board.convertRow(skill.row, skill.color);
                break;
            case 'convert_dual':
                this.board.convertDual(skill.color1, skill.color2);
                break;
            case 'damage_col_convert':
                this.dealSkillDamage(skill.val, monster, 'all');
                this.board.convertColumns([0, 5], skill.color);
                break;
            case 'spawn':
                this.board.spawnOrbs(skill.spawnColor, skill.spawnCount);
                break;
            case 'damage_spawn':
                this.dealSkillDamage(skill.val, monster, skill.target || 'single');
                this.board.spawnOrbs(skill.spawnColor, skill.spawnCount);
                break;
            case 'variable_damage_ensure':
                const boardColors = new Set();
                this.board.grid.forEach(row => row.forEach(cell => boardColors.add(cell.type)));
                this.dealSkillDamage(skill.val * boardColors.size, monster, 'all');
                this.board.ensureMinimumOrbs(3);
                break;
        }

        // スキルの演出待ち
        await new Promise(r => setTimeout(r, 800));
        await this.checkLevelClear(false); // スキル使用時はターンを経過させない
        this.isProcessing = false;
    }


    addGutsToParty(counts) {
        this.party.forEach(m => {
            if (counts[m.element] > 0) {
                // スキル生成ドロップ分を除いたカウントでガッツ加算
                const naturalCount = counts[m.element];
                if (naturalCount > 0) {
                    const amount = Math.floor(naturalCount * 2); // 1個につき2ガッツ
                    m.addGuts(amount);
                }
            }
        });
        this.updateGutsUI();
    }

    setupStart() {
        const newGameBtn = document.getElementById('new-game-btn');
        newGameBtn.onclick = (e) => {
            e.stopPropagation();
            this.audio.init();
            this.audio.startBGM();
            // Hide start screen part but keep overlay if used for gacha? 
            // Actually Gacha screen is separate overlay.
            // We can hide start screen now.
            this.modal.classList.add('hidden');
            this.startNewGame();
        };

        const retryBtn = document.getElementById('retry-button');
        retryBtn.onclick = () => {
            location.reload();
        };
    }

    setupHelp() {
        if (!this.helpBtn || !this.helpModal) return;
        this.helpBtn.addEventListener('click', () => {
            this.helpModal.classList.remove('hidden');
        });
        const closeBtn = document.getElementById('close-help-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.helpModal.classList.add('hidden');
            });
        }
    }

    startLevel() {
        this.floorEl.textContent = this.floor;
        this.scoreEl.textContent = this.score;

        // 5階層クリアごとに商人を出現させる (例: 6, 11, 16...)
        // (floor-1)==5 means completed 5 floors? No.
        // If we are AT floor 6, we just finished 5.
        // Logic: If (this.floor - 1) % 5 === 0 ?
        // User said "Start at Floor 2". If we have Floor 1.
        // Let's stick to existing logic for shop but fix floor increment.
        if (this.floor > 1 && (this.floor - 1) % CONFIG.shopInterval === 0) {
            const hasGacha = (this.floor - 1) % 10 === 0; // 10階層ごとにガチャあり
            this.showShop(hasGacha);
            return;
        }

        // Change background every 5 levels (Floor 1, 6, 11...)
        // User requested: "Background changes randomly every 5 floors"
        if ((this.floor - 1) % 5 === 0) {
            this.changeBackground();
        } else {
            // Ensure background is set if it's potentially missing (e.g. reload)?
            // If we just rely on CSS or persistence, it might be fine.
            // But let's check if empty? No easy way.
            // However, changeBackground sets style on #battle-area. It persists until changed.
            // So we only need to call it on trigger floors.
            if (this.floor === 1) this.changeBackground(); // Ensure floor 1 has one.
        }

        this.spawnEnemies();
    }

    changeBackground(bgName = null) {
        const bg = bgName || BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
        this.currentBg = bg; // 現在の背景を記録
        const battleArea = document.getElementById('battle-area');
        battleArea.style.backgroundImage = `url('images/${bg}')`;
    }

    spawnEnemies() {
        this.enemies = [];
        this.currentTarget = null;
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
                <div class="enemy-timer">あと${enemy.currentTimer}</div>
                <img src="${IMAGE_PATH}${enemy.img}">
            `;
            enemy.el = div;
            enemy.hpFillEl = div.querySelector('.enemy-hp-fill');
            enemy.timerEl = div.querySelector('.enemy-timer');

            div.onclick = () => {
                if (this.currentTarget === enemy) {
                    this.currentTarget = null;
                    div.classList.remove('targeted');
                } else {
                    if (this.currentTarget) this.currentTarget.el.classList.remove('targeted');
                    this.currentTarget = enemy;
                    div.classList.add('targeted');
                }
            };

            // 長押しでステータス表示
            const handlePressStart = (e) => {
                this.longPressTimer = setTimeout(() => {
                    this.showEnemyStats(enemy);
                }, 600);
            };
            const handlePressEnd = () => {
                clearTimeout(this.longPressTimer);
            };

            div.addEventListener('mousedown', handlePressStart);
            div.addEventListener('touchstart', handlePressStart, { passive: true });
            div.addEventListener('mouseup', handlePressEnd);
            div.addEventListener('touchend', handlePressEnd);
            div.addEventListener('mouseleave', handlePressEnd);

            this.enemyContainer.appendChild(div);
        }
    }

    showEnemyStats(enemy) {
        // 既存のモーダルがあれば削除
        const existing = document.getElementById('status-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'status-modal';
        modal.className = 'skill-modal'; // 流用
        modal.style.zIndex = '2000';

        modal.innerHTML = `
            <h2>${enemy.name} のステータス</h2>
            <div style="font-size: 1.2em; line-height: 2em; margin: 20px 0;">
                <p>❤️ ライフ: ${enemy.currentHp} / ${enemy.maxHp}</p>
                <p>⚔️ ちから: ${enemy.atk}</p>
                <p>⏳ 次の攻撃まで: ${enemy.currentTimer} ターン</p>
                <p>💫 属性: ${['赤', '緑', '黄', '青', '白', '黒'][enemy.element]}</p>
            </div>
            <button class="close-btn">閉じる</button>
        `;

        modal.querySelector('.close-btn').onclick = () => modal.remove();
        document.body.appendChild(modal);
    }

    async processTurn() {
        this.isProcessing = true;
        try {
            this.heroMultiplier = 1.0;

            let comboCount = 0;
            let totalDamage = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let totalHeal = 0;
            let aoeFlags = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false };

            // ガッツ加算用（自然発生のみ）と勇者スキル判定用（全消去分）
            let gutsCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            let typeCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

            // Loop matches/drops
            while (true) {
                const groups = this.board.findMatchGroups();
                if (groups.length === 0) break;

                for (const group of groups) {
                    comboCount++;
                    this.audio.playMatchSE(comboCount);

                    const type = group.type;
                    const count = group.coords.length;

                    // 勇者スキル判定 (タイプ1: モノリス等)
                    const hero = this.party[0];
                    if (hero && hero.heroSkillType === 1) {
                        const mult = hero.heroSkill.calc(type, count);
                        this.heroMultiplier = Math.max(this.heroMultiplier, mult);
                    }

                    if (type === ELEMENTS.HEART) {
                        totalHeal += 100 * (count / 3);
                    } else if (type <= 5) {
                        totalDamage[type] += 10 * (count / 3);
                        if (count >= CONFIG.aoeThreshold) {
                            aoeFlags[type] = true;
                        }
                    }

                    // ガッツ用と属性数判定用をカウント
                    typeCounts[type] += group.coords.length;
                    const naturalOrbs = group.coords.filter(({ r, c }) => !this.board.grid[r][c].isSkillGenerated);
                    gutsCounts[type] += naturalOrbs.length;

                    this.updateComboUI(comboCount);
                    await this.board.fadeOrbs(group.coords);
                }

                await this.board.removeAndDrop(groups);
                await new Promise(r => setTimeout(r, 400));
            }

            const comboMultiplier = 1.0 + (comboCount - 1) * 0.05;
            let finalMultiplier = comboMultiplier;
            if (comboCount >= 7) finalMultiplier *= 2.0;

            // ターンの開始時にシールドをリセット（既に敵の攻撃を受けた後のため）
            // Note: スキルで貼られたシールドは維持される

            if (comboCount > 0) {
                // 勇者スキル倍率計算 (タイプ2: ガリ等 / タイプ3)
                const hero = this.party[0];
                if (hero) {
                    if (hero.heroSkillType === 2) {
                        const uniqueTypes = new Set(Object.keys(typeCounts).filter(t => typeCounts[t] > 0 && parseInt(t) <= 5));
                        const hasHeart = typeCounts[ELEMENTS.HEART] > 0;
                        const count = uniqueTypes.size;
                        let mult = 1.0;
                        if (count === 3) mult = 2.0;
                        else if (count === 4) mult = 3.0;
                        else if (count >= 5) mult = (hasHeart ? 7.0 : 5.0);
                        this.heroMultiplier = mult;
                    } else if (hero.heroSkillType === 3) {
                        let mult = 1.0;
                        if (comboCount >= 10) mult = 10.0;
                        else if (comboCount >= 7) mult = 6.0;
                        else if (comboCount >= 3) mult = 2.0;
                        this.heroMultiplier = mult;
                    }
                }

                if (this.heroMultiplier > 1.0) {
                    this.showDamageText(`勇者パワー x${this.heroMultiplier}!`, '#ffd700', document.getElementById('battle-area'));
                }
                if (comboCount >= 7) {
                    this.showDamageText(`7 COMBO BONUS x2!`, '#ff3366', document.getElementById('battle-area'));
                }

                this.addGutsToParty(gutsCounts);

                if (totalHeal > 0) {
                    this.heal(Math.floor(totalHeal * comboMultiplier));
                }

                await this.playerAttack(totalDamage, finalMultiplier * this.heroMultiplier, aoeFlags);

                setTimeout(() => {
                    this.comboDisplay.classList.add('hidden');
                }, 1000);

                this.checkStatusByCombo(comboCount);
            }

            this.tickStatusTurns();
            await this.checkLevelClear();
        } catch (e) {
            console.error("Turn Error:", e);
        } finally {
            this.isProcessing = false;
        }
    }

    updateComboUI(count) {
        this.comboDisplay.textContent = `${count} Combo`;

        // アニメーションを確実に再トリガーさせるためクラスを一度削除して再適用
        this.comboDisplay.classList.remove('hidden', 'pop', 'mega-pop');
        void this.comboDisplay.offsetWidth; // 強制リフロ

        if (count >= 7) {
            this.comboDisplay.classList.add('mega-pop');
        } else {
            this.comboDisplay.classList.add('pop');
        }
    }

    async checkLevelClear(isTurnEnd = true) {
        if (this.enemies.length === 0 && !this.isLevelClearing) {
            this.isLevelClearing = true;
            // 階層クリア時に憤怒リセット
            this.party.filter(p => p).forEach(m => {
                if (m.status === '憤怒') {
                    m.extraAtk = 0;
                }
            });
            this.audio.playClearSE();
            await new Promise(r => setTimeout(r, 1000));
            this.floor++; // Increment floor here

            // Auto-Save every floor
            this.saveGame();

            this.startLevel();
            this.isLevelClearing = false;
        } else if (this.enemies.length > 0 && isTurnEnd) {
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

                const baseMultiplier = (damageDict[el] / 10) * comboMultiplier;

                // Attack SE
                this.audio.playAttackSE();

                for (const m of attackers) {
                    // 状態変化による倍率適用
                    let currentAtkMultiplier = m.atkMultiplier;
                    if (m.status === '底力' && m.currentHp <= m.maxHp * 0.1) {
                        currentAtkMultiplier *= 3;
                    }

                    const dmg = Math.floor((m.atk + m.extraAtk) * baseMultiplier * currentAtkMultiplier * this.heroMultiplier);
                    if (aoeFlags[el]) {
                        // AOE: Attack ALL enemies
                        for (const enemy of [...this.enemies]) {
                            this.dealDamage(dmg, m, enemy);
                        }
                    } else {
                        // Single: Target or Random
                        let target = this.currentTarget;
                        if (!target || !this.enemies.includes(target)) {
                            target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
                        }
                        if (target) this.dealDamage(dmg, m, target);
                    }
                    await new Promise(r => setTimeout(r, 200)); // Stagger attacks
                }
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }

    getAffinityMultiplier(atkEl, defEl) {
        // 赤>緑>黄>青>赤
        if (atkEl === ELEMENTS.RED && defEl === ELEMENTS.GREEN) return 1.5;
        if (atkEl === ELEMENTS.GREEN && defEl === ELEMENTS.YELLOW) return 1.5;
        if (atkEl === ELEMENTS.YELLOW && defEl === ELEMENTS.BLUE) return 1.5;
        if (atkEl === ELEMENTS.BLUE && defEl === ELEMENTS.RED) return 1.5;

        // 逆相性
        if (defEl === ELEMENTS.RED && atkEl === ELEMENTS.GREEN) return 0.5;
        if (defEl === ELEMENTS.GREEN && atkEl === ELEMENTS.YELLOW) return 0.5;
        if (defEl === ELEMENTS.YELLOW && atkEl === ELEMENTS.BLUE) return 0.5;
        if (defEl === ELEMENTS.BLUE && atkEl === ELEMENTS.RED) return 0.5;

        // 白<>黒 (互いに強い)
        if ((atkEl === ELEMENTS.WHITE && defEl === ELEMENTS.BLACK) ||
            (atkEl === ELEMENTS.BLACK && defEl === ELEMENTS.WHITE)) {
            return 1.5;
        }

        return 1.0;
    }

    dealDamage(baseDmg, attacker, target) {
        if (!target || target.currentHp <= 0) return;

        const affinityMult = this.getAffinityMultiplier(attacker.element, target.element);

        // クリティカル判定
        let critRate = 0.2;
        if (attacker.status === '必死' && attacker.currentHp <= attacker.maxHp * 0.4) {
            critRate = 0.8;
        }
        const isCritical = Math.random() < critRate;
        const critMult = isCritical ? 1.5 : 1.0;

        const finalDmg = Math.floor(baseDmg * affinityMult * critMult);
        const color = isCritical ? '#ffcc00' : (affinityMult > 1.0 ? 'orange' : (affinityMult < 1.0 ? 'gray' : 'white'));
        const text = finalDmg + (isCritical ? ' CRIT!' : '');

        // ビーム演出
        this.launchBeam(attacker, target, () => {
            const isDead = target.takeDamage(finalDmg);
            this.showDamageText(text, color, target.el);
            this.spawnHitEffect(target.el);

            // Update Enemy UI
            const pct = (target.currentHp / target.maxHp) * 100;
            target.hpFillEl.style.width = `${pct}%`;

            if (isDead) {
                if (this.currentTarget === target) this.currentTarget = null;
                target.el.style.opacity = '0';
                setTimeout(() => {
                    if (target.el.parentNode) target.el.parentNode.removeChild(target.el);
                }, 500);
                this.enemies = this.enemies.filter(e => e !== target);
                this.score += 100 * this.floor;
                this.scoreEl.textContent = this.score;
                this.saveHighScore();
            }
        });
    }

    dealSkillDamage(baseDmg, attacker, type) {
        if (this.enemies.length === 0) return;

        const targets = (type === 'all' || type === 'delay') ? this.enemies : [this.currentTarget || this.enemies[Math.floor(Math.random() * this.enemies.length)]];

        targets.forEach(target => {
            this.dealDamage(baseDmg, attacker, target);
        });
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
                let finalDmg = Math.floor(dmg * this.damageShield);

                // 根性チェック
                const monolith = this.party.find(m => m && m.name === 'モノリス');
                if (monolith && monolith.status === '根性' && this.playerHp <= finalDmg) {
                    finalDmg = Math.max(0, this.playerHp - 1);
                    if (this.playerHp > 1) {
                        this.showDamageText('Gut!', 'gold', monolith.el);
                        // 発動したので解除
                        this.removeStatus(monolith);
                    }
                }

                this.playerHp = Math.max(0, this.playerHp - finalDmg);

                this.updateHpUI();

                this.audio.playDamageSE();
                this.showDamageText(finalDmg, 'red', this.hpBar);

                // 被ダメージ時の状態変化トリガー
                this.checkStatusByDamage();

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
        // 敵全員の攻撃が終わったらシールドをリセット
        if (this.damageShield < 1.0) {
            this.damageShield = 1.0;
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
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();

        div.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
        div.style.top = (rect.top - containerRect.top) + 'px';

        container.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }

    spawnHitEffect(targetEl) {
        if (!targetEl) return;
        const rect = targetEl.getBoundingClientRect();
        const hit = document.createElement('div');
        hit.className = 'hit-effect';
        hit.style.left = (rect.left + rect.width / 2) + 'px';
        hit.style.top = (rect.top + rect.height / 2) + 'px';
        document.body.appendChild(hit);
        setTimeout(() => hit.remove(), 400);
    }

    launchBeam(attacker, target, onHit) {
        if (!attacker.el || !target.el) {
            onHit();
            return;
        }

        const rectFrom = attacker.el.getBoundingClientRect();
        const rectTo = target.el.getBoundingClientRect();

        // ビームのコンテナ（回転と位置を担当）
        const container = document.createElement('div');
        container.className = 'beam-container';

        // ビームの実体（アニメーションを担当）
        const beamBody = document.createElement('div');
        beamBody.className = 'beam-body';
        const color = this.getElementColor(attacker.element);
        beamBody.style.backgroundColor = color;
        beamBody.style.boxShadow = `0 0 15px 2px ${color}`;

        container.appendChild(beamBody);

        // スクロールを考慮
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        const x1 = rectFrom.left + rectFrom.width / 2 + scrollX;
        const y1 = rectFrom.top + rectFrom.height / 2 + scrollY;
        const x2 = rectTo.left + rectTo.width / 2 + scrollX;
        const y2 = rectTo.top + rectTo.height / 2 + scrollY;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        container.style.width = length + 'px';
        container.style.left = x1 + 'px';
        container.style.top = y1 + 'px';
        container.style.transform = `rotate(${angle}deg)`;

        document.body.appendChild(container);

        setTimeout(() => {
            container.remove();
            onHit();
        }, 300);
    }

    gameOver() {
        this.saveHighScore();
        this.modal.classList.remove('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        const goScreen = document.getElementById('game-over-screen');
        goScreen.classList.remove('hidden');
        document.getElementById('final-score').textContent = this.score;
        this.audio.stopBGM();
    }

    // --- Status Effect Logic ---

    checkStatusByDamage() {
        const hpPct = this.playerHp / this.playerMaxHp;

        this.party.forEach(m => {
            // 根性: 20%以下で確率
            if (m.name === 'モノリス' && hpPct <= 0.2 && !m.status) {
                if (Math.random() < 0.3) m.addStatus('根性', 999);
            }
            // 憤怒: ダメージ時確率
            if (m.name === 'ヒノトリ' && !m.status) {
                if (Math.random() < 0.3) {
                    m.addStatus('憤怒', Math.floor(Math.random() * 3) + 3);
                    m.extraAtk += 50; // 攻撃力上昇
                }
            }
            // 逆上: ダメージ時確率
            if (m.name === 'スエゾー' && !m.status) {
                if (Math.random() < 0.3) {
                    m.addStatus('逆上', Math.floor(Math.random() * 3) + 3);
                    m.gutsMultiplier = 1.5;
                }
            }
            // 底力: 10%で発動
            if (m.name === 'ガリ' && hpPct <= 0.1 && !m.status) {
                m.addStatus('底力', Math.floor(Math.random() * 3) + 3);
            }
            // 必死: 40%を切った時に発動
            if (m.name === 'プラント' && hpPct <= 0.4 && !m.status) {
                m.addStatus('必死', Math.floor(Math.random() * 3) + 3);
            }
        });
    }

    checkStatusByCombo(combo) {
        if (combo >= 5) {
            this.comboHistory++;
        } else {
            this.comboHistory = 0;
        }

        const undine = this.party.find(m => m.name === 'ウンディーネ');
        if (undine && this.comboHistory >= 3 && !undine.status) {
            if (Math.random() < 0.5) {
                undine.addStatus('余裕', Math.floor(Math.random() * 3) + 3);
                undine.costMultiplier = 0.5;
            }
        }
    }

    tickStatusTurns() {
        this.party.forEach(m => {
            // m might be null or undefined if filtered? 
            // processTurn filters active members?
            // Wait, this.party in Game is the filtered array.
            if (m && m.status && m.status !== '根性') {
                m.statusTurns--;
                if (m.statusTurns <= 0) {
                    this.removeStatus(m);
                }
            }
        });

        // 操作時間延長終了チェック
        if (this.board.moveTimeBonus > 0) {
            this.board.moveTimeBonus--;
            if (this.board.moveTimeBonus === 0) {
                this.showDamageText('操作時間延長終了!', '#fff', document.getElementById('board-area'));
            }
        }
        this.updateTimerIcon();
    }

    updateTimerIcon() {
        let icon = document.getElementById('timer-icon');
        if (!icon) {
            // Lazy create
            const bagBtn = document.getElementById('item-bag-btn');
            if (bagBtn && bagBtn.parentNode) {
                icon = document.createElement('div');
                icon.id = 'timer-icon';
                icon.className = 'timer-icon hidden';
                icon.innerHTML = '⏱️'; // Clock emoji
                // Styling will be handled in CSS, basically absolute below bag button
                bagBtn.parentNode.appendChild(icon);
            }
        }
        if (icon) {
            if (this.board.moveTimeBonus > 0) {
                icon.classList.remove('hidden');
            } else {
                icon.classList.add('hidden');
            }
        }
    }

    setupHelp() {
        const helpBtn = document.getElementById('help-btn');
        const helpOverlay = document.getElementById('help-overlay');
        const closeHelpBtn = document.getElementById('close-help-btn');

        if (helpBtn) {
            helpBtn.onclick = () => helpOverlay.classList.remove('hidden');
        }
        if (closeHelpBtn) {
            closeHelpBtn.onclick = () => helpOverlay.classList.add('hidden');
        }
    }

    removeStatus(monster) {
        monster.status = null;
        monster.atkMultiplier = 1.0;
        monster.gutsMultiplier = 1.0;
        monster.costMultiplier = 1.0;
        monster.critMultiplier = 1.0;
        monster.updateStatusEffects();
    }

    // --- Shop & Item Bag ---

    setupItemBag() {
        const bagBtn = document.getElementById('item-bag-btn');
        const closeBagBtn = document.getElementById('close-bag-btn');
        const closeShopBtn = document.getElementById('close-shop-btn');
        const shopTeamBtn = document.getElementById('shop-team-btn');

        bagBtn.onclick = () => this.showBag();
        closeBagBtn.onclick = () => this.bagOverlay.classList.add('hidden');
        closeShopBtn.onclick = () => {
            this.shopOverlay.classList.add('hidden');

            // Fix: ショップでの合体や編成変更を戦場に同期
            // 1. 合体素材等でいなくなったパーティ枠を掃除
            this.party = this.party.filter(m => m !== null);

            // 2. 最大HPの再計算とアイコンの再描画
            this.playerMaxHp = this.party.reduce((sum, m) => sum + m.maxHp, 0);
            this.playerHp = Math.min(this.playerHp, this.playerMaxHp); // 最大値を超えないよう補正

            this.renderPartyUI();
            this.updateHpUI();

            this.spawnEnemies();
            this.changeBackground();
            this.audio.startBGM('battle'); // 戦闘曲に復帰
        };

        if (shopTeamBtn) {
            shopTeamBtn.onclick = () => {
                this.openTeamSelect(true); // Open from shop
            };
        }
    }

    showShop(hasGacha = false) {
        this.audio.startBGM('peace');
        this.shopOverlay.classList.remove('hidden');
        this.shopItemsEl.innerHTML = '';

        const scoreInfo = document.createElement('div');
        scoreInfo.className = 'shop-score-info';
        scoreInfo.textContent = `所持金: ${this.score} G`;
        this.shopItemsEl.appendChild(scoreInfo);

        // Gacha (10 floors)
        if (hasGacha) {
            // Cost scale: 5000, 10000, 20000...
            // 1st time (gachaCount 0) -> 5000.
            const cost = 5000 * Math.pow(2, this.gachaCount);

            const gachaDiv = document.createElement('div');
            gachaDiv.className = 'shop-item';
            gachaDiv.style.background = 'linear-gradient(45deg, #333, #444)';
            gachaDiv.style.border = '2px solid #ffd700';
            gachaDiv.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="color:#ffd700">★ モンスターガチャ (5連)</div>
                    <div class="item-desc">新たな仲間を召喚する！</div>
                    <div class="item-price">${cost.toLocaleString()} G</div>
                </div>
                <button class="buy-btn" ${this.score < cost ? 'disabled' : ''}>回す</button>
            `;
            const gachaBtn = gachaDiv.querySelector('.buy-btn');
            gachaBtn.onclick = () => {
                if (this.score >= cost) {
                    this.score -= cost;
                    this.scoreEl.textContent = this.score;
                    scoreInfo.textContent = `所持金: ${this.score} G`;
                    this.shopOverlay.classList.add('hidden');
                    this.drawGacha(5, false);
                }
            };
            this.shopItemsEl.appendChild(gachaDiv);

            // FUSION Option (Only when merchant appears - same timing as Gacha)
            const fusionDiv = document.createElement('div');
            fusionDiv.className = 'shop-item';
            fusionDiv.style.border = '2px solid #ff44ff';
            fusionDiv.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="color:#ff44ff">◆ モンスター合体</div>
                    <div class="item-desc">同じモンスターを合体して強化</div>
                    <div class="item-price">500 G / 回</div>
                </div>
                <button class="buy-btn">合体へ</button>
            `;
            const fusionBtn = fusionDiv.querySelector('.buy-btn');
            fusionBtn.onclick = () => {
                this.showFusionMenu();
            };
            this.shopItemsEl.appendChild(fusionDiv);
        }

        // Standard Items (Persist if same floor)
        if (this.shopFloor !== this.floor || !this.shopItemsCache || this.shopItemsCache.length === 0) {
            // Generate new items
            this.shopFloor = this.floor;
            this.shopItemsCache = [];
            const itemIds = Object.keys(ITEMS);
            // Allow duplicates logic preserved
            for (let i = 0; i < 3; i++) {
                const id = itemIds[Math.floor(Math.random() * itemIds.length)];
                this.shopItemsCache.push({ id: id, bought: false });
            }
        }

        // Render Cached Items
        this.shopItemsCache.forEach((cacheItem, index) => {
            const item = ITEMS[cacheItem.id];
            const div = document.createElement('div');
            div.className = 'shop-item';

            let btnHtml = `<button class="buy-btn" ${this.score < item.price ? 'disabled' : ''}>購入</button>`;
            if (cacheItem.bought) {
                btnHtml = `<button class="buy-btn" disabled>済</button>`;
            }

            div.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-desc">${item.desc}</div>
                    <div class="item-price">${item.price} G</div>
                </div>
                ${btnHtml}
             `;

            const buyBtn = div.querySelector('.buy-btn');
            if (!cacheItem.bought) {
                buyBtn.onclick = () => {
                    if (this.score >= item.price) {
                        this.score -= item.price;
                        this.scoreEl.textContent = this.score;
                        scoreInfo.textContent = `所持金: ${this.score} G`;

                        this.inventory[cacheItem.id] = (this.inventory[cacheItem.id] || 0) + 1;

                        cacheItem.bought = true; // Update cache
                        buyBtn.disabled = true;
                        buyBtn.textContent = '済';
                        this.showDamageText('まいどあり', '#ffd700', buyBtn);
                    }
                };
            }
            this.shopItemsEl.appendChild(div);
        });
    }

    showFusionMenu() {
        // Find fusible monsters
        // Group by name
        const groups = {};
        this.ownedMonsters.forEach(m => {
            if (!groups[m.name]) groups[m.name] = [];
            groups[m.name].push(m);
        });

        const fusibleNames = Object.keys(groups).filter(name => groups[name].length >= 2);

        this.shopItemsEl.innerHTML = '';

        // Re-add Score Info
        const scoreInfo = document.createElement('div');
        scoreInfo.className = 'shop-score-info';
        scoreInfo.textContent = `所持金: ${this.score} G`;
        this.shopItemsEl.appendChild(scoreInfo);

        const header = document.createElement('h3');
        header.textContent = '合体させるモンスターを選択 (500G)';
        header.style.textAlign = 'center';
        this.shopItemsEl.appendChild(header);

        const backBtn = document.createElement('button');
        backBtn.textContent = '戻る';
        backBtn.style.marginBottom = '10px';
        backBtn.onclick = () => {
            this.showShop((this.floor - 1) % 10 === 0); // Re-render Shop
        };
        this.shopItemsEl.appendChild(backBtn);

        if (fusibleNames.length === 0) {
            const msg = document.createElement('p');
            msg.textContent = '合体できるモンスターがいません (同じモンスターが2体必要)';
            msg.style.textAlign = 'center';
            this.shopItemsEl.appendChild(msg);
            return;
        }

        fusibleNames.forEach(name => {
            const list = groups[name];
            // Sort by rarity desc
            list.sort((a, b) => b.rarity - a.rarity);

            const base = list[0];
            const material = list[1]; // Next highest

            const div = document.createElement('div');
            div.className = 'shop-item fusion-item';
            div.innerHTML = `
                <div class="fusion-monster-img">
                    <img src="${IMAGE_PATH + base.img}" alt="${name}">
                </div>
                <div class="item-info">
                    <div class="item-name">${name}</div>
                    <div class="item-desc">ベース: ★${base.rarity} + 素材: ★${material.rarity} -> ★${base.rarity + material.rarity}</div>
                </div>
                <button class="buy-btn" ${this.score < 500 ? 'disabled' : ''}>あわせる</button>
            `;

            const btn = div.querySelector('.buy-btn');
            btn.onclick = () => {
                if (this.score >= 500) {
                    // Fuse
                    if (base.rarity >= 10) {
                        alert("これ以上強化できません");
                        return;
                    }

                    this.score -= 500;
                    // Update LOCAL scoreInfo
                    scoreInfo.textContent = `所持金: ${this.score} G`;

                    // Logic: sum rarities
                    base.rarity += material.rarity;
                    if (base.rarity > 10) base.rarity = 10;

                    // Update stats
                    const baseStats = RARITY_STATS[base.rarity] || { hp: base.maxHp + (material.rarity * 150), atk: base.atk + (material.rarity * 50) };
                    base.maxHp = baseStats.hp;
                    base.atk = baseStats.atk;
                    base.currentHp = base.maxHp;

                    // Remove material
                    const idx = this.ownedMonsters.indexOf(material);
                    if (idx > -1) this.ownedMonsters.splice(idx, 1);

                    // Remove from party if material was in party
                    const partyIdx = this.party.indexOf(material);
                    if (partyIdx > -1) this.party[partyIdx] = null; // Clear slot

                    this.showDamageText('合体成功!', '#ff44ff', btn);

                    // Refresh Fusion Menu
                    this.showFusionMenu();
                } else {
                    alert("お金が足りません");
                }
            };
            this.shopItemsEl.appendChild(div);
        });
    }

    showBag() {
        this.bagOverlay.classList.remove('hidden');
        this.bagItemsEl.innerHTML = '';

        const ownedItems = Object.keys(this.inventory).filter(id => this.inventory[id] > 0);

        if (ownedItems.length === 0) {
            this.bagItemsEl.innerHTML = '<p style="text-align:center; padding:20px;">空っぽだ...</p>';
            return;
        }

        ownedItems.forEach(id => {
            const item = ITEMS[id];
            const count = this.inventory[id];

            const div = document.createElement('div');
            div.className = 'bag-item';
            div.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${item.name} (x${count})</div>
                    <div class="item-desc">${item.desc}</div>
                </div>
                <button class="use-btn">使用</button>
            `;

            div.querySelector('.use-btn').onclick = () => {
                this.useItem(id);
                this.bagOverlay.classList.add('hidden');
            };
            this.bagItemsEl.appendChild(div);
        });
    }

    useItem(id) {
        if (!this.inventory[id] || this.inventory[id] <= 0) return;

        this.inventory[id]--;
        const item = ITEMS[id];

        switch (id) {
            case 'hourglass':
                this.board.moveTimeBonus = 3;
                this.updateTimerIcon();
                this.showDamageText('操作時間2倍(3T)!', '#fff', this.partyContainer);
                break;
            case 'oil':
                const heal = Math.floor(this.playerMaxHp * 0.5);
                this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
                this.updateHpUI();
                this.showDamageText(`+${heal} 回復!`, '#0f0', this.partyContainer);
                break;
            default:
                if (id.includes('crystal')) {
                    const el = item.element;
                    this.party.forEach(m => {
                        if (m.element === el) {
                            m.addGuts(20);
                            this.showDamageText('+20 Guts!', this.getElementColor(el), m.el);
                        }
                    });
                    this.updateGutsUI(); // 即時反映
                }
                break;
        }
    }
}

// Start Game
window.onload = () => {
    const game = new Game();
};
