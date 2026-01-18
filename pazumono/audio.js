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

    startBGM() {
        if (!this.ctx || this.isMuted || this.isBGMMuted) return;
        this.stopBGM();

        // Simple loop: Bassline
        const bassNotes = [110, 110, 146.83, 146.83, 164.81, 164.81, 146.83, 110]; // A2, D3, E3, D3 sequence
        let noteIndex = 0;
        const tempo = 0.4; // seconds per note

        const playNextNote = () => {
            if (!this.isInitialized) return; // check again

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.setValueAtTime(bassNotes[noteIndex], this.ctx.currentTime);
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + tempo);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + tempo);

            this.bgmOscillators.push(osc);

            noteIndex = (noteIndex + 1) % bassNotes.length;
            this.bgmTimer = setTimeout(playNextNote, tempo * 1000);
        };

        playNextNote();
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

