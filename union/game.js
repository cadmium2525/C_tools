const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

// モンスター定義（さらに一回り縮小）
const MONSTERS = [
    { name: 'ピクシー', img: 'images/ピクシー.png', size: 12, score: 2 },
    { name: 'ハム', img: 'images/ハム.png', size: 17, score: 4 },
    { name: 'ゲル', img: 'images/ゲル.png', size: 24, score: 8 },
    { name: 'スエゾー', img: 'images/スエゾー.png', size: 31, score: 16 },
    { name: 'モッチー', img: 'images/モッチー.png', size: 40, score: 32 },
    { name: 'ライガー', img: 'images/ライガー.png', size: 50, score: 64 },
    { name: 'ディノ', img: 'images/ディノ.png', size: 62, score: 128 },
    { name: 'ゴーレム', img: 'images/ゴーレム.png', size: 75, score: 256 },
    { name: 'ドラゴン', img: 'images/ドラゴン.png', size: 88, score: 512 },
    { name: 'シンリュウ', img: 'images/シンリュウ.png', size: 105, score: 1024 },
    { name: 'ヒノトリ', img: 'images/ヒノトリ.png', size: 122, score: 2048 }
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
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

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
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // レンダリングサイズの更新
        this.render.canvas.width = this.width;
        this.render.canvas.height = this.height;
        this.render.options.width = this.width;
        this.render.options.height = this.height;

        // 壁の再配置
        const wallThickness = 50;
        Body.setPosition(this.ground, { x: this.width / 2, y: this.height + wallThickness / 2 });
        Body.setPosition(this.leftWall, { x: -wallThickness / 2, y: this.height / 2 });
        Body.setPosition(this.rightWall, { x: this.width + wallThickness / 2, y: this.height / 2 });
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
                width: this.width,
                height: this.height,
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

        // 底面（コンテナの高さちょうどに配置。厚みの半分を外側へシフト）
        this.ground = Bodies.rectangle(this.width / 2, this.height + wallThickness / 2, this.width, wallThickness, wallOptions);
        // 左壁（x=0に配置。厚みの半分を外側へシフト）
        this.leftWall = Bodies.rectangle(-wallThickness / 2, this.height / 2, wallThickness, this.height, wallOptions);
        // 右壁（x=widthに配置。厚みの半分を外側へシフト）
        this.rightWall = Bodies.rectangle(this.width + wallThickness / 2, this.height / 2, wallThickness, this.height, wallOptions);

        this.deadLine = 70;

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
        preview.innerHTML = `<img src="${monster.img}" style="width: ${monster.size * 2}px; height: ${monster.size * 2}px;">`;
        preview.style.width = `${monster.size * 2}px`;
        preview.style.height = `${monster.size * 2}px`;
        preview.style.display = 'block';
    }

    setupEvents() {
        const wrapper = this.container;
        const preview = document.getElementById('current-monster-preview');
        const guide = document.getElementById('guide-line');

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

            const rect = wrapper.getBoundingClientRect();
            let x = clientX - rect.left;

            const monster = MONSTERS[this.currentMonsterIndex];
            const minX = monster.size;
            const maxX = this.width - monster.size;
            x = Math.max(minX, Math.min(x, maxX));

            preview.style.left = `${x}px`;
            guide.style.left = `${x}px`;
            guide.style.display = 'block';
        };

        const releaseHandler = (e) => {
            if (this.gameOver || this.isDropping) return;

            const rect = wrapper.getBoundingClientRect();
            let clientX;
            if (e.changedTouches) {
                clientX = e.changedTouches[0].clientX;
            } else {
                clientX = e.clientX;
            }

            let x = clientX - rect.left;
            const monster = MONSTERS[this.currentMonsterIndex];
            x = Math.max(monster.size, Math.min(x, this.width - monster.size));

            this.dropMonster(x);
        };

        wrapper.addEventListener('mousemove', moveHandler);
        wrapper.addEventListener('touchstart', (e) => {
            e.preventDefault();
            moveHandler(e);
        }, { passive: false });
        wrapper.addEventListener('touchmove', (e) => {
            e.preventDefault();
            moveHandler(e);
        }, { passive: false });
        wrapper.addEventListener('mouseup', releaseHandler);
        wrapper.addEventListener('touchend', (e) => {
            e.preventDefault();
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

        const body = Bodies.circle(x, this.deadLine - 50, monster.size, {
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
        this.audio.playMerge();

        if (index >= MONSTERS.length - 1) {
            World.remove(this.world, [bodyA, bodyB]);
            this.score += MONSTERS[index].score * 2;
            this.updateScoreUI();
            return;
        }

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
