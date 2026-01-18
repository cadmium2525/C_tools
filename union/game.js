const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

// モンスター定義（さらに一回り縮小）
const MONSTERS = [
    { name: 'ピクシー', img: 'images/ピクシー.png', size: 10, score: 2 },
    { name: 'ハム', img: 'images/ハム.png', size: 14, score: 4 },
    { name: 'ゲル', img: 'images/ゲル.png', size: 20, score: 8 },
    { name: 'スエゾー', img: 'images/スエゾー.png', size: 26, score: 16 },
    { name: 'モッチー', img: 'images/モッチー.png', size: 34, score: 32 },
    { name: 'ライガー', img: 'images/ライガー.png', size: 42, score: 64 },
    { name: 'ディノ', img: 'images/ディノ.png', size: 52, score: 128 },
    { name: 'ゴーレム', img: 'images/ゴーレム.png', size: 64, score: 256 },
    { name: 'ドラゴン', img: 'images/ドラゴン.png', size: 75, score: 512 },
    { name: 'シンリュウ', img: 'images/シンリュウ.png', size: 90, score: 1024 },
    { name: 'ヒノトリ', img: 'images/ヒノトリ.png', size: 105, score: 2048 }
];

class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.bgmEnabled = true;
        this.bgmInterval = null;
    }

    playDrop() {
        this.playTone(150, 0.1, 'sine');
    }

    playMerge() {
        this.playTone(300, 0.2, 'square');
        setTimeout(() => this.playTone(450, 0.2, 'square'), 100);
    }

    playGameOver() {
        this.playTone(200, 0.3, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 200);
        setTimeout(() => this.playTone(100, 0.5, 'sawtooth'), 400);
    }

    playFlashSound() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 派手な音にするためsawtoothを使用
        osc.type = 'sawtooth';

        const now = this.ctx.currentTime;
        const duration = 1.5;

        // 周波数: 高音から低音へグリスダウン ("プチューーーン")
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + duration);

        // 音量: フェードアウト
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + duration);
    }

    playTone(freq, duration, type = 'sine') {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    startBGM() {
        if (this.bgmInterval) return;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        let i = 0;
        this.bgmInterval = setInterval(() => {
            if (document.hidden || !this.bgmEnabled) return;
            this.playTone(notes[i], 1.0, 'sine');
            i = (i + 1) % notes.length;
        }, 1500);
    }

    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        return this.bgmEnabled;
    }
}

class Game {
    constructor() {
        this.container = document.getElementById('game-canvas-wrapper');
        // 固定の論理サイズ (User request: 400x700)
        this.logicalWidth = 400;
        this.logicalHeight = 700;
        this.scale = 1;

        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('monster_suika_best')) || 0;
        this.gameOver = false;

        this.nextMonsterIndex = this.getRandomMonsterIndex();
        this.currentMonsterIndex = this.getRandomMonsterIndex();
        this.isDropping = false;
        this.dropCooldown = 600; // ms

        this.audio = new AudioManager();
        this.hasStarted = false;

        this.initMatter();
        this.setupUI();
        this.initEvolutionChart();
        this.setupEvents();
        this.updatePreview();

        // リサイズ対応
        window.addEventListener('resize', () => this.onResize());
        this.onResize(); // 初期化時にも実行してサイズを同期

        this.startLoop();
    }

    onResize() {
        const parent = this.container.parentElement; // #game-container
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 利用可能な最大幅（左右のパディング考慮 - ほぼゼロに）
        const paddingX = 0;
        const availWidth = Math.min(parent.clientWidth, windowWidth) - paddingX;

        // 利用可能な最大高さ (ヘッダー80, フッター周り含めかなりタイトに)
        // uiHeightを少し削減して攻める
        const uiHeight = 80 + 10 + 80 + 10;

        // 安全マージンを最小限に
        const availHeight = windowHeight - uiHeight;

        // 縦横比を維持して最大スケールを計算
        const scaleW = availWidth / this.logicalWidth;
        const scaleH = Math.max(0.1, availHeight / this.logicalHeight);

        this.scale = Math.min(scaleW, scaleH);

        // 論理サイズではなく、計算した表示サイズをコンテナに適用
        // これによりレイアウト上のサイズも縮小され、隙間がなくなる
        const displayWidth = Math.floor(this.logicalWidth * this.scale);
        const displayHeight = Math.floor(this.logicalHeight * this.scale);

        this.container.style.width = `${displayWidth}px`;
        this.container.style.height = `${displayHeight}px`;
        this.container.style.transform = ''; // transformは解除

        // プレビューのサイズ・位置も更新が必要なので呼び出す
        if (this.currentMonsterIndex !== undefined) {
            this.updatePreview();
        }
    }

    getRandomMonsterIndex() {
        return Math.floor(Math.random() * 5);
    }

    initMatter() {
        this.engine = Engine.create();
        this.world = this.engine.world;

        this.render = Render.create({
            element: this.container,
            engine: this.engine,
            options: {
                width: this.logicalWidth,
                height: this.logicalHeight,
                wireframes: false,
                background: 'transparent'
            }
        });

        // カスタムレンダリング
        Events.on(this.render, 'afterRender', () => {
            const context = this.render.context;
            const bodies = Composite.allBodies(this.world);

            bodies.forEach(body => {
                if (body.monsterIndex !== undefined) {
                    const monster = MONSTERS[body.monsterIndex];
                    const { x, y } = body.position;
                    const radius = body.circleRadius;

                    context.save();
                    context.translate(x, y);
                    context.rotate(body.angle);

                    context.beginPath();
                    context.arc(0, 0, radius, 0, Math.PI * 2);
                    context.closePath();

                    context.fillStyle = 'rgba(30, 41, 59, 0.8)';
                    context.fill();
                    context.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                    context.lineWidth = 2;
                    context.stroke();

                    context.clip();

                    const img = body.render.sprite.imageElement;
                    if (img) {
                        context.drawImage(img, -radius, -radius, radius * 2, radius * 2);
                    }

                    context.restore();
                }
            });
        });

        // 壁（コンテナの境界線に正確に合わせる）
        const wallThickness = 50;
        const wallOptions = {
            isStatic: true,
            render: { visible: false },
            friction: 0.1,
            restitution: 0.3
        };

        // 底面
        this.ground = Bodies.rectangle(this.logicalWidth / 2, this.logicalHeight + wallThickness / 2, this.logicalWidth, wallThickness, wallOptions);
        // 左壁
        this.leftWall = Bodies.rectangle(-wallThickness / 2, this.logicalHeight / 2, wallThickness, this.logicalHeight, wallOptions);
        // 右壁
        this.rightWall = Bodies.rectangle(this.logicalWidth + wallThickness / 2, this.logicalHeight / 2, wallThickness, this.logicalHeight, wallOptions);

        this.deadLine = 150; // 少し下げる(調整)

        World.add(this.world, [this.ground, this.leftWall, this.rightWall]);

        Render.run(this.render);
        this.runner = Runner.create();
        Runner.run(this.runner, this.engine);
    }

    setupUI() {
        document.getElementById('best-score').textContent = this.bestScore;
        this.updateScoreUI();
        this.updateNextUI();
    }

    initEvolutionChart() {
        const track = document.querySelector('.evolution-track');
        track.innerHTML = '';
        MONSTERS.forEach((monster, i) => {
            const item = document.createElement('div');
            item.className = 'evolution-item';
            item.innerHTML = `<img src="${monster.img}" alt="${monster.name}">`;
            track.appendChild(item);

            if (i < MONSTERS.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'arrow';
                arrow.textContent = '→';
                track.appendChild(arrow);
            }
        });
    }

    updateScoreUI() {
        document.getElementById('score').textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            document.getElementById('best-score').textContent = this.bestScore;
            localStorage.setItem('monster_suika_best', this.bestScore);
        }
    }

    updateNextUI() {
        const nextImg = document.getElementById('next-img');
        nextImg.src = MONSTERS[this.nextMonsterIndex].img;
    }

    updatePreview() {
        const preview = document.getElementById('current-monster-preview');
        const monster = MONSTERS[this.currentMonsterIndex];

        // スケールを適用した表示サイズ
        const displaySize = monster.size * 2 * this.scale;

        // box-sizing: content-boxにして、border分を含まずにimage領域を確保する
        // これによりcanvasの描画サイズ(radius*2)とimgのサイズが一致する
        preview.style.boxSizing = 'content-box';

        // imgに display: block を指定してベースラインのズレを防ぐ
        preview.innerHTML = `<img src="${monster.img}" style="width: 100%; height: 100%; display: block; object-fit: fill;">`;
        preview.style.width = `${displaySize}px`;
        preview.style.height = `${displaySize}px`;
        preview.style.display = 'block';
    }

    setupEvents() {
        const wrapper = this.container;
        const preview = document.getElementById('current-monster-preview');
        const guide = document.getElementById('guide-line');

        // 座標変換ヘルパー
        const getLogicalX = (clientX) => {
            const rect = wrapper.getBoundingClientRect();
            // クライアント座標からコンテナ左端を引く
            const relativeX = clientX - rect.left;
            // スケールで割って論理座標に戻す
            return relativeX / this.scale;
        };

        const moveHandler = (e) => {
            if (!this.hasStarted) {
                this.hasStarted = true;
                this.audio.startBGM();
            }
            if (this.gameOver || this.isDropping) return;

            let clientX;
            if (e.touches) {
                clientX = e.touches[0].clientX;
            } else {
                clientX = e.clientX;
            }

            let x = getLogicalX(clientX);

            const monster = MONSTERS[this.currentMonsterIndex];
            const minX = monster.size;
            const maxX = this.logicalWidth - monster.size;
            // クランプ
            x = Math.max(minX, Math.min(x, maxX));

            // 表示位置はスケール済み座標を使う
            preview.style.left = `${x * this.scale}px`;
            guide.style.left = `${x * this.scale}px`;
            guide.style.display = 'block';
        };

        const releaseHandler = (e) => {
            if (this.gameOver || this.isDropping) return;

            let clientX;
            if (e.changedTouches) {
                clientX = e.changedTouches[0].clientX;
            } else {
                clientX = e.clientX;
            }

            let x = getLogicalX(clientX);

            const monster = MONSTERS[this.currentMonsterIndex];
            // クランプ
            x = Math.max(monster.size, Math.min(x, this.logicalWidth - monster.size));

            this.dropMonster(x);
        };

        wrapper.addEventListener('mousemove', moveHandler);
        wrapper.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            moveHandler(e);
        }, { passive: false });
        wrapper.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
            moveHandler(e);
        }, { passive: false });
        wrapper.addEventListener('mouseup', releaseHandler);
        wrapper.addEventListener('touchend', (e) => {
            if (e.cancelable) e.preventDefault();
            releaseHandler(e);
        }, { passive: false });

        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                if (bodyA.monsterIndex !== undefined && bodyA.monsterIndex === bodyB.monsterIndex) {
                    this.mergeMonsters(bodyA, bodyB);
                }
            });
        });

        document.getElementById('bgm-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            const enabled = this.audio.toggleBGM();
            document.getElementById('bgm-toggle').classList.toggle('off', !enabled);
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            location.reload();
        });
    }

    startLoop() {
        Events.on(this.engine, 'afterUpdate', () => {
            if (this.gameOver) return;

            const bodies = Composite.allBodies(this.world);
            let isOverLimit = false;
            let isWarning = false;

            for (let body of bodies) {
                if (body.isStatic || body.isNew) continue;

                if (body.position.y < this.deadLine) {
                    isWarning = true;
                    if (!body.stayStartTime) {
                        body.stayStartTime = Date.now();
                    } else if (Date.now() - body.stayStartTime > 1200) { // 1.2秒に短縮
                        isOverLimit = true;
                    }
                } else {
                    body.stayStartTime = null;
                }
            }

            // 警告の視覚効果
            if (isWarning) {
                this.container.classList.add('deadline-warning');
            } else {
                this.container.classList.remove('deadline-warning');
            }

            if (isOverLimit) {
                this.triggerGameOver();
            }
        });
    }

    dropMonster(x) {
        this.isDropping = true;
        this.audio.playDrop();
        document.getElementById('guide-line').style.display = 'none';
        document.getElementById('current-monster-preview').style.display = 'none';

        const index = this.currentMonsterIndex;
        const monster = MONSTERS[index];

        // 落下位置の調整 (deadLineより少し下から落とすと安全)
        const spawnY = this.deadLine;

        const body = Bodies.circle(x, spawnY, monster.size, {
            restitution: 0.3,
            friction: 0.1,
            label: monster.name,
            render: {
                sprite: {
                    texture: monster.img
                },
                visible: false
            }
        });

        body.isNew = true;
        setTimeout(() => body.isNew = false, 800);

        const img = new Image();
        img.src = monster.img;
        img.onload = () => {
            body.render.sprite.imageElement = img;
        };

        body.monsterIndex = index;
        World.add(this.world, body);

        setTimeout(() => {
            if (this.gameOver) return;
            this.currentMonsterIndex = this.nextMonsterIndex;
            this.nextMonsterIndex = this.getRandomMonsterIndex();
            this.updateNextUI();
            this.updatePreview();
            this.isDropping = false;
        }, this.dropCooldown);
    }

    mergeMonsters(bodyA, bodyB) {
        if (bodyA.isStatic || bodyB.isStatic) return;

        const index = bodyA.monsterIndex;

        // 最大レベル同士の合体 (ヒノトリ同士)
        if (index >= MONSTERS.length - 1) {
            this.audio.playFlashSound();
            // 特殊演出
            this.triggerFlashEffect();

            World.remove(this.world, [bodyA, bodyB]);
            this.score += MONSTERS[index].score * 2;
            this.updateScoreUI();
            return;
        }

        this.audio.playMerge();

        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;

        World.remove(this.world, [bodyA, bodyB]);

        this.score += MONSTERS[index].score;
        this.updateScoreUI();

        const nextIndex = index + 1;
        const monster = MONSTERS[nextIndex];

        const newBody = Bodies.circle(newX, newY, monster.size, {
            restitution: 0.3,
            friction: 0.1,
            label: monster.name,
            render: {
                sprite: {
                    texture: monster.img
                },
                visible: false
            }
        });

        const img = new Image();
        img.src = monster.img;
        img.onload = () => {
            newBody.render.sprite.imageElement = img;
        };

        newBody.monsterIndex = nextIndex;
        World.add(this.world, newBody);
    }

    triggerFlashEffect() {
        const flash = document.getElementById('flash-effect');
        if (flash) {
            flash.classList.add('active');
            setTimeout(() => {
                flash.classList.remove('active');
            }, 150); // 短いフラッシュ
        }
    }

    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.audio.playGameOver();
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
}

window.onload = () => {
    new Game();
};
