class AudioController {
    constructor() {
        this.ctx = null;
        this.bgmOscillators = [];
        this.isMuted = false;
        this.isBGMMuted = false;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.isInitialized = true;
            console.log("AudioContext initialized");
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    // Play a short sound effect
    playTone(freq, type, duration, vol = 0.1) {
        if (!this.ctx || this.isMuted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playSwapSE() {
        // High pitched click
        this.playTone(880, 'sine', 0.05, 0.05);
    }

    playMatchSE(comboCount) {
        // Ascending tones for combos
        const baseFreq = 440;
        const note = baseFreq * Math.pow(1.05946, comboCount * 2); // Semitones up
        this.playTone(note, 'triangle', 0.15, 0.2);
    }

    playDamageSE() {
        // Lower noise/square for impact
        this.playTone(150, 'square', 0.1, 0.2);
    }

    playClearSE() {
        // Victory jingle-ish
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.2, 0.2), i * 100);
        });
    }

    playAttackSE() {
        // Sharp, high-pitched impact
        this.playTone(660, 'square', 0.1, 0.1);
    }

    playSkillSE() {
        // Rapid frequency slide/sweep
        const duration = 0.5;
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    startBGM(type = 'battle') {
        if (!this.ctx || this.isMuted || this.isBGMMuted) return;
        this.stopBGM();

        // 曲調の設定
        const isBattle = type === 'battle';
        const isGacha = type === 'gacha';
        const tempo = isGacha ? 0.1 : (isBattle ? 0.15 : 0.4);

        // メロディ定義
        const peaceSequence = [110, 110, 146.83, 146.83, 164.81, 164.81, 146.83, 110];
        const battleSequence = [55, 55, 55, 82.41, 55, 55, 73.42, 65.41];
        const gachaSequence = [220, 277.18, 329.63, 440, 415.30, 329.63, 277.18, 220]; // A Major Arpeggio-ish
        const melodySequence = isBattle ? [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440] : [];

        let noteIndex = 0;

        const playNextNote = () => {
            if (!this.isInitialized || this.isBGMMuted) return;

            const now = this.ctx.currentTime;

            // ベース・リズム音
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = isBattle ? 'sawtooth' : (isGacha ? 'square' : 'triangle');

            let freq = peaceSequence[noteIndex % 8];
            if (isBattle) freq = battleSequence[noteIndex % 8];
            if (isGacha) freq = gachaSequence[noteIndex % 8];

            bassOsc.frequency.setValueAtTime(freq, now);
            bassGain.gain.setValueAtTime(isBattle ? 0.04 : (isGacha ? 0.03 : 0.05), now);
            bassGain.gain.linearRampToValueAtTime(0, now + tempo);
            bassOsc.connect(bassGain);
            bassGain.connect(this.ctx.destination);
            bassOsc.start();
            bassOsc.stop(now + tempo);
            this.bgmOscillators.push(bassOsc);

            // 戦闘時のみ速いメロディを追加
            if (isBattle && noteIndex % 2 === 0) {
                const melOsc = this.ctx.createOscillator();
                const melGain = this.ctx.createGain();
                melOsc.type = 'square';
                melOsc.frequency.setValueAtTime(melodySequence[Math.floor(noteIndex / 2) % 8], now);
                melGain.gain.setValueAtTime(0.02, now);
                melGain.gain.linearRampToValueAtTime(0, now + tempo * 2);
                melOsc.connect(melGain);
                melGain.connect(this.ctx.destination);
                melOsc.start();
                melOsc.stop(now + tempo * 2);
                this.bgmOscillators.push(melOsc);
            }

            noteIndex++;
            this.bgmTimer = setTimeout(playNextNote, tempo * 1000);
        };

        playNextNote();
    }

    playGachaShakeSE() {
        this.playTone(220, 'triangle', 0.1, 0.1);
        setTimeout(() => this.playTone(330, 'triangle', 0.1, 0.1), 50);
    }

    playGachaBreakSE() {
        // Impact + Shine
        this.playTone(110, 'square', 0.3, 0.3);
        [880, 1320, 1760].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.4, 0.1), i * 50);
        });
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
        });
        this.bgmOscillators = [];
    }

    toggleBGM() {
        this.isBGMMuted = !this.isBGMMuted;
        if (this.isBGMMuted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return !this.isBGMMuted;
    }
}

