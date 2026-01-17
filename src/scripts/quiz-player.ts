import type { OptionKey, PlayerQuestion, PlayerUI, QuizSettings, Source } from "../lib/types";

export class QuizPlayer {
  questions: PlayerQuestion[];
  currentIndex: number;
  isPlaying: boolean;
  rate: number;
  synth: SpeechSynthesis;
  utterance: SpeechSynthesisUtterance | null;
  ui: PlayerUI;
  isInteractive: boolean;
  corrects: number;
  wrongs: number;
  answeredQuestions: Set<string>;
  settings: QuizSettings;
  progress: Record<string, boolean[]>; // questionId -> list of results (true=correct, false=incorrect)
  originalQuestions: PlayerQuestion[];
  courseSlug: string;
  speechQueue: string[] = [];
  isSpeakingQueue: boolean = false;
  currentSessionId: number = 0;
  speechTimeout: any = null;
  silentAudio: HTMLAudioElement;

  constructor() {
    this.questions = [];
    this.questions = [];
    this.originalQuestions = [];
    this.speechQueue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isInteractive = false;
    this.corrects = 0;
    this.wrongs = 0;
    this.answeredQuestions = new Set();
    this.courseSlug = window.location.pathname.split('/').pop() || 'default-course';

    this.settings = this.loadSettings();
    this.progress = this.loadProgress();
    this.rate = this.settings.playbackRate;
    this.synth = window.speechSynthesis;
    this.utterance = null;

    // Initialize silent audio for iOS background playback
    // Using a valid 10s silent WAV file to prevent tight-loop CPU issues
    // Using explicit path, Astro will resolve this if in public or handled via import
    this.silentAudio = new Audio("/silent.wav");
    this.silentAudio.loop = true;
    this.silentAudio.volume = 0.01; // Audible but quiet

    this.ui = {
      bar: document.getElementById('quiz-player-bar'),
      playBtn: document.getElementById('btn-play'),
      prevBtn: document.getElementById('btn-prev'),
      nextBtn: document.getElementById('btn-next'),
      speedBtn: document.getElementById('btn-speed'),
      statusText: document.getElementById('player-status-text'),
      iconPlay: document.getElementById('icon-play'),
      iconPause: document.getElementById('icon-pause'),
      progressBar: document.getElementById('player-progress'),
      captionText: document.getElementById('player-caption-text'),
      btnToggleAnswers: document.getElementById('btn-toggle-answers'),
      btnToggleExplanations: document.getElementById('btn-toggle-explanations'),
      btnToggleOptions: document.getElementById('btn-toggle-options'),
      btnToggleInteractive: document.getElementById('btn-toggle-interactive'),
      statsContainer: document.getElementById('stats-container'),
      correctCount: document.getElementById('correct-count'),
      wrongCount: document.getElementById('wrong-count'),
      btnOpenSettings: document.getElementById('btn-open-settings'),
      settingsDrawer: document.getElementById('settings-drawer') || document.getElementById('global-settings-modal'),
      successRate: document.getElementById('success-rate'),
      repeatBtn: document.getElementById('btn-repeat'),
      readQuestionBtn: document.getElementById('btn-read-question'),
      readExplanationBtn: document.getElementById('btn-read-explanation'),
      questionCount: document.getElementById('question-count'),
      btnToggleReader: document.getElementById('btn-toggle-reader'),
      btnStopSpeech: document.getElementById('btn-stop-speech'),
      btnTestVoiceSettings: document.getElementById('btn-test-voice-settings')
    };

    // iOS AudioSession handling (experimental/polyfill support)
    if ('audioSession' in navigator) {
      try {
        (navigator as any).audioSession.type = 'playback';
      } catch (e) {
        console.warn('[QuizPlayer] AudioSession API not supported:', e);
      }
    }

    this.init();
    this.updateReaderUI();
  }

  enableBackgroundAudio(): void {
    if (this.silentAudio.paused) {
      this.silentAudio.play().catch(e => console.warn("[QuizPlayer] Background audio blocked:", e));
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Soru ${(this.currentIndex + 1)}`,
        artist: 'Açık Öğretim Portal',
        album: 'Ders Çalışma Modu',
        artwork: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => { if (!this.isPlaying) this.play(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (this.isPlaying) this.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.prev());
      navigator.mediaSession.setActionHandler('seekforward', () => this.next());
    }
  }

  disableBackgroundAudio(): void {
    if (!this.silentAudio.paused) {
      this.silentAudio.pause();
    }
  }

  loadSettings(): QuizSettings {
    const saved = localStorage.getItem('quiz-settings');
    const defaultSettings: QuizSettings = {
      // Removed shuffleQuestions
      filterUnite: 'all',
      filterIncorrect: false,
      filterUnanswered: false,
      showAnswers: true,
      showExplanations: true,
      hideIncorrectOptions: false,
      playbackRate: 1.2,
      readerMode: false,
      voiceURI: '',
      autoAdvance: true
    };
    const loaded = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;

    return loaded;
  }

  saveSettings(): void {
    localStorage.setItem('quiz-settings', JSON.stringify(this.settings));
  }

  loadProgress(): Record<string, boolean[]> {
    const saved = localStorage.getItem(`quiz-progress-${this.courseSlug}`);
    return saved ? JSON.parse(saved) : {};
  }

  saveProgress(): void {
    localStorage.setItem(`quiz-progress-${this.courseSlug}`, JSON.stringify(this.progress));
  }

  init(): void {
    // Load AI explanations override store
    const aiStoreKey = `quiz-ai-explanations-${this.courseSlug}`;
    const aiStore = JSON.parse(localStorage.getItem(aiStoreKey) || '{}');

    const questionEls = document.querySelectorAll('[id^="question-"]');
    questionEls.forEach((el) => {
      const id = el.id;
      // The question text is in a <p> tag that is a sibling of the header and before the <ul> options
      const textEl = el.querySelector('.question-text') || el.querySelector('.prose p:first-child') || el.querySelector('.prose p');
      const text = textEl ? (textEl as HTMLElement).innerText : '';

      const correctOption = el.querySelector('.correct-option');
      const correctKeyText = (correctOption?.querySelector('.option-key') as HTMLElement)?.innerText;
      const rawKey = correctKeyText ? correctKeyText.replace('.', '').trim() : '';
      const normalizeKey = (k: string): OptionKey => {
        const up = k.toUpperCase();
        switch (up) {
          case '':
          case 'A':
          case 'B':
          case 'C':
          case 'D':
          case 'E':
            return up as OptionKey;
          default:
            return '' as OptionKey;
        }
      };
      const correctKey = normalizeKey(rawKey);
      const correctAnswerText = (correctOption?.querySelector('.option-text') as HTMLElement)?.innerText || '';

      const expDiv = el.querySelector('.explanation-box') as HTMLElement;
      let explanation = '';
      if (expDiv) {
        // Check for AI Override in loaded store
        const parts = id.split('-'); // question-1-5
        if (parts.length === 3) {
          const unitVal = parts[1];
          const qIdxVal = parts[2];
          const itemKey = `${unitVal}-${qIdxVal}`;

          if (aiStore[itemKey]) {
            const savedAI = aiStore[itemKey];
            console.log(`[QuizPlayer] Loaded AI override for ${id}`);
            const contentEl = document.getElementById(`content-${unitVal}-${qIdxVal}`);
            if (contentEl) {
              contentEl.innerHTML = savedAI;
            }
            explanation = savedAI; // Use AI content for player state (TTS)
          }
        }

        if (!explanation) {
          const contentSpan = (expDiv.querySelector('span[set\\:html]') || expDiv.querySelector('span')) as HTMLElement;
          explanation = contentSpan ? contentSpan.innerText : expDiv.innerText.replace('AÇIKLAMA:', '').trim();
        } else {
          // If explanation was set by AI above, we might want to strip HTML for clean text usage if needed elsewhere,
          // but PlayerQuestion.explanation usually keeps the raw text/html for display?
          // Actually looking at original logic, it takes .innerText.
          // If we want TTS to read it nicely, we might need a clean text version.
          // But existing code takes innerText.
          // Let's create a temp div to get clean innerText from the HTML if we loaded AI content.
          const temp = document.createElement('div');
          temp.innerHTML = explanation;
          explanation = temp.innerText;
        }
      }

      const unitText = el.getAttribute('data-unit') || '0';
      const unitNumber = parseInt(unitText);

      // Get options
      const options: { key: OptionKey; text: string }[] = [];
      el.querySelectorAll('.option-item').forEach(optNode => {
        const key = (optNode.querySelector('.option-key') as HTMLElement)?.innerText || '';
        const optText = (optNode.querySelector('.option-text') as HTMLElement)?.innerText || '';
        options.push({ key: normalizeKey(key.trim()), text: optText.trim() });
      });

      const q: PlayerQuestion = {
        id,
        text,
        correctKey,
        correctAnswerText,
        explanation,
        unitNumber,
        source: 'soru-bankasi' as Source,
        el: el as HTMLElement,
        options
      };

      this.originalQuestions.push(q);
    });

    this.questions = [...this.originalQuestions];

    // Bind UI Events
    if (this.ui.speedBtn) {
      this.ui.speedBtn.innerText = this.rate + 'x';
      this.ui.speedBtn.onclick = () => this.toggleSpeed();
    }
    if (this.ui.playBtn) this.ui.playBtn.onclick = () => this.togglePlay();
    if (this.ui.prevBtn) this.ui.prevBtn.onclick = () => this.prev();
    if (this.ui.nextBtn) this.ui.nextBtn.onclick = () => this.next();
    // this.ui.speedBtn listener handled above
    if (this.ui.btnToggleAnswers) this.ui.btnToggleAnswers.onclick = () => this.toggleAnswers();
    if (this.ui.btnToggleExplanations) this.ui.btnToggleExplanations.onclick = () => this.toggleExplanations();
    if (this.ui.btnToggleOptions) this.ui.btnToggleOptions.onclick = () => this.toggleOptions();
    if (this.ui.btnToggleInteractive) this.ui.btnToggleInteractive.onclick = () => this.toggleInteractive();
    if (this.ui.btnOpenSettings) this.ui.btnOpenSettings.onclick = () => this.toggleSettings();
    if (this.ui.settingsDrawer) {
      this.ui.settingsDrawer.onclick = (e) => {
        if (e.target === this.ui.settingsDrawer) this.toggleSettings();
      };
      // Match ID in Layout.astro
      const applyBtn = document.getElementById('btn-apply-filters') || document.getElementById('btn-apply-settings');
      if (applyBtn) applyBtn.onclick = () => this.toggleSettings();

      const closeBtn = document.getElementById('btn-close-settings');
      if (closeBtn) closeBtn.onclick = () => this.toggleSettings();
    }
    if (this.ui.repeatBtn) this.ui.repeatBtn.onclick = () => this.repeat();
    if (this.ui.readQuestionBtn) this.ui.readQuestionBtn.onclick = () => this.speakCurrent();
    if (this.ui.readExplanationBtn) this.ui.readExplanationBtn.onclick = () => this.speakExplanation();
    if (this.ui.btnToggleReader) this.ui.btnToggleReader.onclick = () => this.toggleReader();
    if (this.ui.btnStopSpeech) this.ui.btnStopSpeech.onclick = () => this.stopSpeech();

    // Stop speech when leaving the page
    // Stop speech when leaving the page
    const stopSpeech = () => this.stopSpeech();
    window.addEventListener('beforeunload', stopSpeech);

    // Ensure voices are loaded
    this.populateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.populateVoices();
    }
    //window.addEventListener('pagehide', stopSpeech);

    this.setupOptionListeners();
    this.setupSettingsListeners();
    this.setupScrollObserver(); // Initialize scroll observer

    this.applyFilters();
    this.show();
  }

  isProgrammaticScroll: boolean = false;

  setupScrollObserver(): void {
    const observer = new IntersectionObserver((entries) => {
      // If we are scrolling programmatically, do not update active index locally
      if (this.isProgrammaticScroll) return;

      const visibleEntry = entries.find(entry => entry.isIntersecting);
      if (visibleEntry) {
        const qId = visibleEntry.target.id;
        const index = this.questions.findIndex(q => q.id === qId);
        if (index !== -1 && index !== this.currentIndex && !this.isPlaying && !this.synth.speaking) {
          this.currentIndex = index;
          this.updateStatusText();

          if ('mediaSession' in navigator && !this.silentAudio.paused) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: `Soru ${(this.currentIndex + 1)}`,
              artist: 'Açık Öğretim Portal',
              album: 'Ders Çalışma Modu',
              artwork: [
                { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
              ]
            });
          }
        }
      }
    }, {
      root: null,
      // Trigger when element is in the top part of the screen (15% from top to 50% from top)
      // negative margins cut off the view area.
      // -15% top means we ignore top 15% (header area).
      // -50% bottom means we ignore bottom 50%.
      // So we look at the band from 15% to 50% down.
      rootMargin: '-15% 0px -50% 0px',
      threshold: 0
    });

    this.originalQuestions.forEach(q => {
      if (q.el) observer.observe(q.el);
    });
  }


  applyFilters(): void {
    let filtered = [...this.originalQuestions];

    // Unit Filter
    // Unit Filter
    if (this.settings.filterUnite !== 'all') {
      // Logic: Max unit (excluding 0) / 2
      const validUnits = this.originalQuestions.map(q => q.unitNumber).filter(u => u > 0);
      const maxUnit = validUnits.length > 0 ? Math.max(...validUnits) : 0;
      const mid = Math.ceil(maxUnit / 2);

      if (this.settings.filterUnite === 'first_half') {
        filtered = filtered.filter(q => q.unitNumber <= mid);
      } else if (this.settings.filterUnite === 'second_half') {
        filtered = filtered.filter(q => q.unitNumber > mid);
      } else {
        const targetUnit = parseInt(this.settings.filterUnite);
        filtered = filtered.filter(q => q.unitNumber === targetUnit);
      }
    }

    // Incorrect/Unanswered Progress Filters
    if (this.settings.filterIncorrect || this.settings.filterUnanswered) {
      filtered = filtered.filter(q => {
        const results = this.progress[q.id];
        const hasAttempts = results && results.length > 0;

        // Check if ANY of the recorded attempts (last 2) were incorrect
        const isIncorrect = hasAttempts && results.includes(false);
        const isUnanswered = !hasAttempts;

        if (this.settings.filterIncorrect && this.settings.filterUnanswered) {
          return isIncorrect || isUnanswered;
        } else if (this.settings.filterIncorrect) {
          return isIncorrect;
        } else {
          return isUnanswered;
        }
      });
    }

    // Shuffle logic removed as per user request
    // if (this.settings.shuffleQuestions) { ... }

    this.questions = filtered;
    this.currentIndex = this.questions.length > 0 ? 0 : -1;

    // Update visibility in DOM
    this.originalQuestions.forEach(q => {
      if (q.el) q.el.style.display = 'none';
    });
    this.questions.forEach(q => {
      if (q.el) q.el.style.display = 'block';
    });

    // Hide empty unit headers
    const visibleUnits = new Set(this.questions.map(q => q.unitNumber));
    document.querySelectorAll('.unit-separator').forEach(el => {
      const unit = parseInt((el as HTMLElement).dataset.unit || '0');
      (el as HTMLElement).style.display = visibleUnits.has(unit) ? 'block' : 'none';
    });

    // Update body classes for view settings
    document.body.classList.toggle('hide-answers', !this.settings.showAnswers);
    document.body.classList.toggle('hide-explanations', !this.settings.showExplanations);
    document.body.classList.toggle('hide-options', this.settings.hideIncorrectOptions);

    this.updateStatusText();
    this.updateStats();
  }

  setupSettingsListeners(): void {
    const bindToggle = (id: string, setting: keyof QuizSettings) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.checked = this.settings[setting] as boolean;
        el.onchange = (e) => {
          (this.settings as any)[setting] = (e.target as HTMLInputElement).checked;
          this.saveSettings();
          this.applyFilters();
        };
      }
    };

    // bindToggle('setting-shuffle', 'shuffleQuestions'); // Removed
    bindToggle('setting-incorrect', 'filterIncorrect');
    bindToggle('setting-unanswered', 'filterUnanswered');
    bindToggle('setting-show-answers', 'showAnswers');
    bindToggle('setting-show-explanations', 'showExplanations');
    bindToggle('setting-hide-incorrect-options', 'hideIncorrectOptions');
    bindToggle('setting-auto-advance', 'autoAdvance');

    const unitSelect = document.getElementById('setting-unit') as HTMLSelectElement;
    if (unitSelect) {
      const uniqueUnits = [...new Set(this.originalQuestions.map(q => q.unitNumber))].sort((a, b) => a - b);

      // Update First/Second Half texts dynamically
      const validUnits = uniqueUnits.filter(u => u > 0);
      const maxUnit = validUnits.length > 0 ? Math.max(...validUnits) : 0;
      const mid = Math.ceil(maxUnit / 2);

      // Check for Option 1 (First Half) and Option 2 (Second Half)
      if (unitSelect.options.length >= 3) {
        if (unitSelect.options[1].value === 'first_half') {
          unitSelect.options[1].text = `İlk Yarı (1-${mid})`;
        }
        if (unitSelect.options[2].value === 'second_half') {
          unitSelect.options[2].text = `İkinci Yarı (${mid + 1}-${maxUnit})`;
        }
      }

      if (uniqueUnits.length > 0) {
        // Keep only 'all', 'first_half', 'second_half'
        while (unitSelect.options.length > 3) unitSelect.remove(3);
        uniqueUnits.forEach(u => {
          if (u > 0) {
            const opt = document.createElement('option');
            opt.value = u.toString();
            opt.text = `Ünite ${u}`;
            unitSelect.add(opt);
          }
        });
      }

      // Check if saved filter is valid for this specific course content
      const validValues = Array.from(unitSelect.options).map(o => o.value);
      if (!validValues.includes(this.settings.filterUnite)) {
        // If saved unit (e.g. "14") doesn't exist in this course, reset to all
        this.settings.filterUnite = 'all';
        this.saveSettings();
      }

      unitSelect.value = this.settings.filterUnite;
      unitSelect.onchange = (e) => {
        this.settings.filterUnite = (e.target as HTMLSelectElement).value;
        this.saveSettings();
        this.applyFilters();
      };
    }

    const voiceSelect = document.getElementById('setting-voice') as HTMLSelectElement;
    if (voiceSelect) {
      voiceSelect.value = this.settings.voiceURI;
      voiceSelect.onchange = (e) => {
        this.settings.voiceURI = (e.target as HTMLSelectElement).value;
        this.saveSettings();
      };
    }

    const rateSelect = document.getElementById('setting-playback-rate') as HTMLSelectElement;
    if (rateSelect) {
      rateSelect.value = this.settings.playbackRate.toFixed(1);
      rateSelect.onchange = (e) => {
        const val = parseFloat((e.target as HTMLSelectElement).value);
        this.settings.playbackRate = val;
        this.rate = val;
        if (this.ui.speedBtn) this.ui.speedBtn.innerText = val + 'x';
        this.saveSettings();
      };
    }
  }

  toggleSpeed(): void {
    const rates = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5];

    // Find closest current rate to handle slight floating point diffs or custom values
    let currentIdx = rates.findIndex(r => Math.abs(r - this.rate) < 0.05);
    if (currentIdx === -1) currentIdx = 1; // default to 1.0 position

    this.rate = rates[(currentIdx + 1) % rates.length];

    if (this.ui.speedBtn) this.ui.speedBtn.innerText = this.rate + 'x';
    this.settings.playbackRate = this.rate;

    const rateSelect = document.getElementById('setting-playback-rate') as HTMLSelectElement;
    if (rateSelect) {
      // Use toFixed(1) to match "1.0", "2.0" option values
      rateSelect.value = this.rate.toFixed(1);
    }

    this.saveSettings();
  }

  populateVoices(): void {
    const voiceSelect = document.getElementById('setting-voice') as HTMLSelectElement;
    if (!voiceSelect) return;

    const voices = this.synth.getVoices();
    console.log('[QuizPlayer] populateVoices: Found voices:', voices.length);
    if (voices.length === 0) return;

    // Filter only Turkish voices or keep all if none found
    const trVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').includes('tr-tr'));

    // Clear and refill
    voiceSelect.innerHTML = '<option value="">Varsayılan Ses</option>';

    const voicesToShow = trVoices.length > 0 ? trVoices : voices;

    voicesToShow.forEach(voice => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      opt.text = `${voice.name} (${voice.lang})`;
      if (voice.voiceURI === this.settings.voiceURI) opt.selected = true;
      voiceSelect.add(opt);
    });
  }

  public syncSettings(): void {
    const saved = localStorage.getItem('quiz-settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }

    // Update UI based on new settings
    this.applyFilters();

    document.body.classList.toggle('hide-answers', !this.settings.showAnswers);
    document.body.classList.toggle('hide-explanations', !this.settings.showExplanations);
    document.body.classList.toggle('hide-options', this.settings.hideIncorrectOptions);

    this.updateStatusText();
    this.updateReaderUI();
  }

  toggleSettings(): void {
    if ((window as any).closeGlobalSettings && this.ui.settingsDrawer && (this.ui.settingsDrawer.style.display === 'flex' || this.ui.settingsDrawer.classList.contains('flex'))) {
      (window as any).closeGlobalSettings();
    } else if ((window as any).openQuizSettings) {
      (window as any).openQuizSettings();
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.show();
      this.play();
    }
  }

  toggleAnswers(): void {
    this.settings.showAnswers = !this.settings.showAnswers;
    document.body.classList.toggle('hide-answers', !this.settings.showAnswers);
    this.saveSettings();
    if (this.ui.btnToggleAnswers) {
      this.ui.btnToggleAnswers.classList.toggle('text-teal-400', this.settings.showAnswers);
      this.ui.btnToggleAnswers.classList.toggle('bg-teal-400/10', this.settings.showAnswers);
    }
  }

  toggleExplanations(): void {
    this.settings.showExplanations = !this.settings.showExplanations;
    document.body.classList.toggle('hide-explanations', !this.settings.showExplanations);
    this.saveSettings();
    if (this.ui.btnToggleExplanations) {
      this.ui.btnToggleExplanations.classList.toggle('text-teal-400', this.settings.showExplanations);
      this.ui.btnToggleExplanations.classList.toggle('bg-teal-400/10', this.settings.showExplanations);
    }
  }

  toggleOptions(): void {
    this.settings.hideIncorrectOptions = !this.settings.hideIncorrectOptions;
    document.body.classList.toggle('hide-options', this.settings.hideIncorrectOptions);
    this.saveSettings();
    if (this.ui.btnToggleOptions) {
      this.ui.btnToggleOptions.classList.toggle('text-teal-400', this.settings.hideIncorrectOptions);
      this.ui.btnToggleOptions.classList.toggle('bg-teal-400/10', this.settings.hideIncorrectOptions);
    }
  }

  toggleInteractive(): void {
    this.isInteractive = !this.isInteractive;

    if (this.isInteractive) {
      this.corrects = 0;
      this.wrongs = 0;
      this.answeredQuestions.clear();
      this.updateStats();

      document.body.classList.add('hide-answers');
      document.body.classList.add('hide-explanations');
      // Interactive mode requires seeing all options to make a choice
      document.body.classList.remove('hide-options');
      document.body.classList.add('is-interactive-mode');

      if (this.ui.btnToggleInteractive) {
        const btnText = this.ui.btnToggleInteractive.querySelector('.btn-text');
        const btnIcon = this.ui.btnToggleInteractive.querySelector('.btn-icon');
        if (btnText) btnText.innerHTML = 'Durdur';
        if (btnIcon) btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

        this.ui.btnToggleInteractive.classList.add('is-stopping');
      }

      if (this.ui.statsContainer) {
        this.ui.statsContainer.classList.remove('hidden');
        this.ui.statsContainer.classList.add('flex');
      }

      if (this.questions.length > 0) {
        this.currentIndex = 0;
        this.scrollToCurrent();
        this.updateStats(); // Ensure stats reflect question 1
      }
    } else {
      document.body.classList.remove('is-interactive-mode', 'hide-answers', 'hide-explanations');

      // Restore hide-options based on settings when exiting interactive mode
      document.body.classList.toggle('hide-options', this.settings.hideIncorrectOptions);

      if (this.ui.btnToggleInteractive) {
        const btnText = this.ui.btnToggleInteractive.querySelector('.btn-text');
        const btnIcon = this.ui.btnToggleInteractive.querySelector('.btn-icon');
        if (btnText) btnText.innerHTML = 'Çöz';
        if (btnIcon) btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>`;

        this.ui.btnToggleInteractive.classList.remove('is-stopping');
      }

      if (this.ui.statsContainer) {
        this.ui.statsContainer.classList.add('hidden');
        this.ui.statsContainer.classList.remove('flex');
      }

      document.querySelectorAll('.is-correct, .is-wrong, .was-revealed, .reveal').forEach(el => {
        el.classList.remove('is-correct', 'is-wrong', 'was-revealed', 'reveal');
      });

      this.pause();
    }
  }

  toggleReader(): void {
    this.settings.readerMode = !this.settings.readerMode;
    this.saveSettings();
    this.updateReaderUI();

    if (this.settings.readerMode) {
      this.show();
      this.speakCurrent();
    } else {
      this.stopSpeech();
    }
  }

  updateReaderUI(): void {
    if (this.ui.btnToggleReader) {
      this.ui.btnToggleReader.classList.toggle('active', this.settings.readerMode);
    }

    const speechControls = document.getElementById('speech-controls');
    if (speechControls) {
      speechControls.classList.toggle('border-teal-500/30', this.settings.readerMode);
    }
  }

  stopSpeech(): void {
    this.currentSessionId++; // Invalidate current session to stop retry loop
    this.speechQueue = [];
    this.isSpeakingQueue = false;
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    this.synth.cancel();
    this.isPlaying = false;
    this.disableBackgroundAudio();
    // Force reset audio state to clean slate
    this.silentAudio.currentTime = 0;
    this.updateUIState();
  }

  setupOptionListeners(): void {
    document.querySelectorAll('.option-item').forEach(el => {
      (el as HTMLElement).onclick = (e) => this.handleOptionClick(e);
    });
  }

  handleOptionClick(e: MouseEvent): void {
    // if (!this.isInteractive) return; // Allow interaction always

    const item = e.currentTarget as HTMLElement;
    const questionEl = item.closest('[id^="question-"]') as HTMLElement;

    if (!questionEl || this.answeredQuestions.has(questionEl.id)) return;

    const isCorrect = item.classList.contains('correct-option');
    this.answeredQuestions.add(questionEl.id);

    // Sync current index to the clicked question
    const qIndex = this.questions.findIndex(q => q.id === questionEl.id);
    if (qIndex !== -1) {
      this.currentIndex = qIndex;
      // Also ensure UI is updated to reflect this as the 'active' question if needed
      this.updateStatusText();
    }

    // Track progress
    if (!this.progress[questionEl.id]) this.progress[questionEl.id] = [];
    this.progress[questionEl.id].push(isCorrect);

    // Keep only last 2 results to manage memory and support "recent" logic
    if (this.progress[questionEl.id].length > 2) {
      this.progress[questionEl.id] = this.progress[questionEl.id].slice(-2);
    }

    this.saveProgress();

    // Stop current TTS if speaking
    this.currentSessionId++; // Invalidate any running queue
    if (this.synth.speaking) this.synth.cancel();

    // Reveal explanation and correct answer for both cases
    const expBox = questionEl.querySelector('.explanation-box') as HTMLElement;
    if (expBox) {
      expBox.classList.add('reveal');
      // Scroll to explanation if wrong answer
      if (!isCorrect) {
        this.isProgrammaticScroll = true;
        expBox.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setTimeout(() => { this.isProgrammaticScroll = false; }, 800);
      }
    }

    const correctItem = questionEl.querySelector('.correct-option') as HTMLElement;
    if (correctItem) correctItem.classList.add('was-revealed');

    if (isCorrect) {
      item.classList.add('is-correct');
      this.corrects++;
      this.updateStats();

      if (this.settings.readerMode) {
        const utter = this.createUtterance("Doğru!");
        utter.onend = () => {
          setTimeout(() => {
            if (this.isInteractive) this.next();
          }, 500);
        };
        this.synth.speak(utter);
      } else {
        setTimeout(() => {
          if (this.isInteractive) this.next();
        }, 5000);
      }
    } else {
      item.classList.add('is-wrong');
      this.wrongs++;
      this.updateStats();

      // Use the clicked question for feedback text, now guaranteed by index sync
      const q = this.questions[this.currentIndex];
      const ansText = `${q.correctKey}, ${this.cleanText(q.correctAnswerText)}`;
      const expText = q.explanation ? `Açıklama: ${this.cleanText(q.explanation)}` : '';

      if (this.settings.readerMode) {
        const utter = this.createUtterance(`Yanlış! Doğru cevap: ${ansText}. ${expText}`);
        utter.onend = () => {
          setTimeout(() => {
            if (this.isInteractive) this.next();
          }, 1000);
        };
        this.synth.speak(utter);
      } else {
        setTimeout(() => {
          if (this.isInteractive) this.next();
        }, 5000);
      }
    }
  }

  updateStats(): void {
    if (this.ui.correctCount) this.ui.correctCount.innerText = this.corrects.toString();
    if (this.ui.wrongCount) this.ui.wrongCount.innerText = this.wrongs.toString();
    if (this.ui.questionCount) {
      const current = this.currentIndex >= 0 ? this.currentIndex + 1 : 0;
      this.ui.questionCount.innerText = `${current}/${this.questions.length}`;
    }

    if (this.ui.successRate) {
      const total = this.corrects + this.wrongs;
      const rate = total > 0 ? Math.round((this.corrects / total) * 100) : 0;
      this.ui.successRate.innerText = rate.toString();
    }
  }

  show(): void {
    if (this.ui.bar) {
      this.ui.bar.classList.add('visible');
    }
  }

  hide(): void {
    this.pause();
    if (this.ui.bar) {
      this.ui.bar.classList.remove('visible');
    }
  }

  play(): void {
    this.isPlaying = true;
    this.enableBackgroundAudio();
    this.updateUIState();

    if (this.synth.paused) {
      this.synth.resume();
    } else if (this.speechQueue.length > 0) {
      // If we have items in queue but not paused (e.g. paused during gap), resume queue
      this.processQueue();
    } else {
      this.speakCurrent();
    }
  }

  pause(): void {
    this.isPlaying = false;
    this.disableBackgroundAudio();
    this.updateUIState();

    // Use pause() instead of cancel() to allow resuming
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  next(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.scrollToCurrent();
      if (this.settings.readerMode) {
        setTimeout(() => this.speakCurrent(), 300);
      }
      this.updateStats();
      this.updateStatusText();
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.scrollToCurrent();
      if (this.settings.readerMode) {
        setTimeout(() => this.speakCurrent(), 300);
      }
      this.updateStats();
      this.updateStatusText();
    }
  }

  scrollToCurrent(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) return;
    const q = this.questions[this.currentIndex];
    if (q && q.el) {
      // Calculate offset to account for sticky headers (approx 100px)
      // We use scroll-margin-top on the element itself for cleaner behavior with scrollIntoView if supported,
      // closely matching the manual calc logic but more robust.
      // However, sticking to the manual calc as requested for now, but ensuring observer doesn't fight it.

      const headerOffset = 20; // Reduced slighty for mobile
      const elementPosition = q.el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      // Temporarily simple disable observer updates to prevent jumping during scroll
      this.isProgrammaticScroll = true;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setTimeout(() => { this.isProgrammaticScroll = false; }, 800);

      document.querySelectorAll('.ring-2').forEach(el => el.classList.remove('ring-2', 'ring-teal-500'));
      q.el.classList.add('ring-2', 'ring-teal-500');
    }
    const pct = ((this.currentIndex + 1) / this.questions.length) * 100;
    if (this.ui.progressBar) this.ui.progressBar.style.width = pct + '%';
    this.updateStatusText();
  }

  updateStatusText(): void {
    if (this.ui.statusText) this.ui.statusText.innerText = `Soru ${this.currentIndex + 1} / ${this.questions.length}`;
  }

  updateUIState(): void {
    if (this.ui.iconPlay) this.ui.iconPlay.style.display = this.isPlaying ? 'none' : 'block';
    if (this.ui.iconPause) this.ui.iconPause.style.display = this.isPlaying ? 'block' : 'none';
    if (this.ui.playBtn) {
      if (this.isPlaying) {
        this.ui.playBtn.classList.add('is-playing', 'bg-teal-500/20', 'text-teal-400');
        this.ui.playBtn.title = 'Durdur';
      } else {
        this.ui.playBtn.classList.remove('is-playing', 'bg-teal-500/20', 'text-teal-400');
        this.ui.playBtn.title = 'Başlat';
        // Clear caption if stop/pause (optional, maybe keep last spoken?)
        // If fully stopped (not paused), clear.
        if (!this.isPlaying && this.ui.captionText) this.ui.captionText.innerText = '';
      }
    }
  }

  cleanText(text: string | null | undefined): string {
    if (!text) return '';
    // Use DOM parser to handle entities and spacing correctly
    const div = document.createElement('div');
    // Replace block tags with spaces to prevent word concatenation
    div.innerHTML = String(text)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<\/li>/gi, ' ');
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  createUtterance(text: string): SpeechSynthesisUtterance {
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = this.rate;
    utter.lang = 'tr-TR';

    // Apply selected voice
    if (this.settings.voiceURI) {
      const voices = this.synth.getVoices();
      const selected = voices.find(v => v.voiceURI === this.settings.voiceURI);
      if (selected) {
        utter.voice = selected;
      }
    } else {
      // Fallback to any Turkish voice if no specific selection
      const voices = this.synth.getVoices();
      const trVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').includes('tr-tr'));
      if (trVoice) {
        utter.voice = trVoice;
      }
    }

    return utter;
  }

  startNewSpeechSession(): void {
    this.currentSessionId++;
    this.synth.cancel();
    this.speechQueue = [];
    this.isSpeakingQueue = false;
  }

  processQueue(sessionId?: number): void {
    const activeSession = sessionId ?? this.currentSessionId;

    // Check if this session is still valid
    if (activeSession !== this.currentSessionId) {
      return;
    }

    // NEW: If user paused, stop processing queue.
    // The queue remains intact, so play() can resume it.
    if (!this.isPlaying) {
      this.isSpeakingQueue = false;
      return;
    }

    if (this.speechQueue.length === 0) {
      this.isSpeakingQueue = false;

      // CONTINUOUS READING: Auto-advance in Reader Mode
      // Only auto-advance if NOT in interactive mode AND auto-advance is enabled
      if (this.settings.readerMode && activeSession === this.currentSessionId && !this.isInteractive && this.settings.autoAdvance) {
        const hasNext = this.currentIndex < this.questions.length - 1;
        if (hasNext) {
          // Delay before next question depends on playback rate (shorter for faster rates)
          const nextDelay = this.rate > 1.5 ? 500 : 1500;
          setTimeout(() => {
            // Check session again to prevent race conditions
            if (activeSession === this.currentSessionId && this.settings.readerMode) {
              this.next();
            }
          }, nextDelay);
        } else {
          // End of all questions
          this.isPlaying = false;
          this.disableBackgroundAudio(); // Stop iOS background audio
          this.updateUIState();
        }
      } else {
        // Queue finished and no auto-advance
        this.isPlaying = false;
        this.disableBackgroundAudio(); // Stop iOS background audio
        this.updateUIState();
      }
      return;
    }

    this.isSpeakingQueue = true;

    // Peek current text (don't remove yet, in case we need to retry)
    const text = this.speechQueue[0];

    if (!text) {
      this.speechQueue.shift();
      this.processQueue(activeSession);
      return;
    }

    const utter = this.createUtterance(text);
    this.utterance = utter;

    // Caption Logic
    utter.onstart = () => {
      // Update Caption
      let displayText = text;
      if (displayText.startsWith('Soru')) displayText = displayText.substring(displayText.indexOf(':') + 1).trim();

      if (this.ui.captionText) {
        let caption = displayText;
        if (caption.length > 50) caption = caption.substring(0, 48) + '...';

        this.ui.captionText.innerText = caption;
        this.ui.captionText.title = text; // Full text on hover
      }

      // Update Media Center / Lock Screen
      // Update Media Center / Lock Screen
      if ('mediaSession' in navigator) {
        // Generate dynamic artwork
        const artworkBlob = this.generateArtwork(this.currentIndex + 1);

        const courseName = document.querySelector('h1')?.innerText || 'Açık Öğretim';

        navigator.mediaSession.metadata = new MediaMetadata({
          title: displayText.length > 60 ? displayText.substring(0, 60) + '...' : displayText,
          artist: courseName,
          album: `Soru ${this.currentIndex + 1}`,
          artwork: [
            { src: artworkBlob, sizes: '512x512', type: 'image/png' }
          ]
        });
      }
    }; // Removed console.log

    utter.onend = () => {
      // Clear keep-alive timer
      if (this.speechTimeout) {
        clearTimeout(this.speechTimeout);
        this.speechTimeout = null;
      }

      // Only shift on success
      if (this.speechQueue.length > 0) this.speechQueue.shift();

      // Reduce delay for faster rates to keep flow natural
      // 0ms for rates > 1.2 to eliminate gaps
      const delay = this.rate > 1.2 ? 0 : 50;
      setTimeout(() => this.processQueue(activeSession), delay);
    };

    utter.onerror = (e) => {
      // Clear timer
      if (this.speechTimeout) {
        clearTimeout(this.speechTimeout);
        this.speechTimeout = null;
      }

      // If manually interrupted/canceled or session changed, stop.
      if (activeSession !== this.currentSessionId) return;

      if (e.error === 'interrupted' || e.error === 'canceled') {
        // This is likely a browser flake if session ID is still valid.
        // Retry the SAME chunk.
        setTimeout(() => this.processQueue(activeSession), 10);
        return;
      }

      // For other errors, skip this chunk to avoid infinite loop
      if (this.speechQueue.length > 0) this.speechQueue.shift();
      setTimeout(() => this.processQueue(activeSession), 10);
    };

    this.synth.speak(utter);

    // Start keep-alive timer to prevent 15s timeout
    const keepAlive = () => {
      // Don't force resume if paused by user
      if (!this.isPlaying) return;
      if (!this.synth.speaking) return;

      this.synth.pause();
      this.synth.resume();
      this.speechTimeout = setTimeout(keepAlive, 10000);
    };
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(keepAlive, 10000);
  }

  speakCurrent(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) {
      return;
    }

    this.enableBackgroundAudio(); // Ensure activity for iOS

    // Ensure we mark as playing, otherwise processQueue will abort
    this.isPlaying = true;
    this.updateUIState();

    this.startNewSpeechSession();
    if (this.synth.paused) this.synth.resume();

    const q = this.questions[this.currentIndex];

    // Chunk 1: Question
    this.speechQueue.push(`Soru ${this.currentIndex + 1}.`);

    const rawText = this.cleanText(q.text);
    // Split by common sentence delimiters to keep chunks short
    const sentences = rawText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [rawText];
    sentences.forEach(s => {
      if (s.trim()) this.speechQueue.push(s.trim());
    });

    // Chunk 2: Options
    // If hiding incorrect options, we still want to read the correct one if it exists
    if (!this.settings.hideIncorrectOptions) {
      const optText = "Seçenekler: " + q.options.map(opt => `${opt.key} şıkkı, ${this.cleanText(opt.text)}`).join('. ') + ".";
      this.speechQueue.push(optText);
    } else {
      const correctOpt = q.options.find(opt => opt.key === q.correctKey);
      if (correctOpt) {
        // Read the single visible option with key
        this.speechQueue.push(`Cevap: ${correctOpt.key} şıkkı, ${this.cleanText(correctOpt.text)}.`);
      }
    }

    // Chunk 3: Answer/Explanation (if not interactive OR in reader mode)
    if (!this.isInteractive || this.settings.readerMode) {
      let ansParts = [];

      // Determine if we should reveal the answer
      // 1. Setting must be Enabled
      // 2. If Interactive, we must have answered it already
      const isAnswered = this.answeredQuestions.has(q.id);
      const shouldReveal = this.settings.showAnswers && (!this.isInteractive || isAnswered);

      // If we already showed/read the single option (hideIncorrectOptions), don't read "Doğru Cevap" again
      if (shouldReveal && !this.settings.hideIncorrectOptions) {
        ansParts.push(`Doğru Cevap: ${q.correctKey}, ${this.cleanText(q.correctAnswerText)}.`);
      }

      if (this.settings.showExplanations && (!this.isInteractive || isAnswered)) {
        const latestExp = this.getLatestExplanation(q);
        if (latestExp) {
          ansParts.push(`Açıklama: ${this.cleanText(latestExp)}`);
        }
      }

      if (ansParts.length > 0) {
        this.speechQueue.push(ansParts.join(' '));
      }
    }

    // Start
    const mySessionId = this.currentSessionId;
    setTimeout(() => this.processQueue(mySessionId), 10);
  }

  repeat(): void {
    this.speakCurrent();
  }

  speakExplanation(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) return;
    const q = this.questions[this.currentIndex];
    const latestExp = this.getLatestExplanation(q);
    if (!latestExp) return;

    this.enableBackgroundAudio();

    // Ensure we mark as playing
    this.isPlaying = true;
    this.updateUIState();

    // Visually reveal explanation and answer
    if (q.el) {
      const expBox = q.el.querySelector('.explanation-box') as HTMLElement;
      if (expBox) {
        expBox.classList.add('reveal');
        this.isProgrammaticScroll = true;
        expBox.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setTimeout(() => { this.isProgrammaticScroll = false; }, 800);
      }

      const correctItem = q.el.querySelector('.correct-option') as HTMLElement;
      if (correctItem) correctItem.classList.add('was-revealed');
    }

    this.startNewSpeechSession();

    const expText = `Açıklama: ${this.cleanText(latestExp)}`;
    this.speechQueue.push(expText);

    const mySessionId = this.currentSessionId;
    setTimeout(() => this.processQueue(mySessionId), 10);
  }

  testVoiceSettings(): void {
    this.synth.cancel();
    const text = "Bu bir ses denemesidir. Bir, iki, üç.";
    const utter = this.createUtterance(text);
    this.synth.speak(utter);
  }

  getLatestExplanation(q: PlayerQuestion): string {
    // Always consult the live store for latest override
    const aiStoreKey = `quiz-ai-explanations-${this.courseSlug}`;
    const aiStore = JSON.parse(localStorage.getItem(aiStoreKey) || '{}');
    const itemKey = `${q.unitNumber}-${q.id.split('-').pop()}`; // reconstruct short key or check how q.id is formed
    // q.id is "question-1-5", we need "1-5"
    // or easier: q.id "question-{unit}-{qIdx}" -> replace "question-" with ""
    const key = q.id.replace('question-', '');

    if (aiStore[key]) {
      // If HTML, we might need to strip it? cleanText handles stripping.
      // But wait, cleanText handles <br> etc.
      // If stored text is HTML, we return HTML here and let cleanText handle it later.
      return aiStore[key];
    }
    return q.explanation || '';
  }

  generateArtwork(questionNum: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '/android-chrome-512x512.png';

    // Background - Dark Blue like Theme
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Circle Outline - Teal
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.stroke();

    // Text - Question Number
    ctx.fillStyle = '#14b8a6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // "SORU" text
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText('SORU', 256, 180);

    // Number text
    ctx.font = 'bold 220px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(questionNum.toString(), 256, 340);

    return canvas.toDataURL('image/png');
  }
}