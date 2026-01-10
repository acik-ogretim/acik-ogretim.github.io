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

    this.init();
    this.updateReaderUI();
  }

  loadSettings(): QuizSettings {
    const saved = localStorage.getItem('quiz-settings');
    const defaultSettings: QuizSettings = {
      shuffleQuestions: false,
      filterUnite: 'all',
      filterIncorrect: false,
      filterUnanswered: false,
      showAnswers: true,
      showExplanations: true,
      hideIncorrectOptions: false,
      playbackRate: 1.2,
      readerMode: false,
      voiceURI: ''
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
    const questionEls = document.querySelectorAll('[id^="question-"]');
    questionEls.forEach((el) => {
      const id = el.id;
      // The question text is in a <p> tag that is a sibling of the header and before the <ul> options
      const textEl = el.querySelector('.prose p:first-child') || el.querySelector('.prose p') || el.querySelector('.text-base.md\\:text-lg');
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
        const contentSpan = (expDiv.querySelector('span[set\\:html]') || expDiv.querySelector('span')) as HTMLElement;
        explanation = contentSpan ? contentSpan.innerText : expDiv.innerText.replace('AÇIKLAMA:', '').trim();
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
    if (this.ui.btnTestVoiceSettings) this.ui.btnTestVoiceSettings.onclick = () => this.testVoiceSettings();

    // Stop speech when leaving the page
    const stopSpeech = () => this.synth.cancel();
    window.addEventListener('beforeunload', stopSpeech);

    // Ensure voices are loaded
    this.populateVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.populateVoices();
    }
    window.addEventListener('pagehide', stopSpeech);

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

    // Shuffle
    if (this.settings.shuffleQuestions) {
      filtered = filtered.sort(() => Math.random() - 0.5);
    }

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

    bindToggle('setting-shuffle', 'shuffleQuestions');
    bindToggle('setting-incorrect', 'filterIncorrect');
    bindToggle('setting-unanswered', 'filterUnanswered');
    bindToggle('setting-show-answers', 'showAnswers');
    bindToggle('setting-show-explanations', 'showExplanations');
    bindToggle('setting-hide-incorrect-options', 'hideIncorrectOptions');

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
    this.updateUIState();
    if (this.synth.paused) {
      this.synth.resume();
    } else {
      this.speakCurrent();
    }
  }

  pause(): void {
    this.isPlaying = false;
    this.updateUIState();
    this.synth.cancel();
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
    // Legacy method, icons handled by dedicated updateReaderUI or similar
  }

  cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return String(text).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
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
      if (trVoice) utter.voice = trVoice;
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
    if (activeSession !== this.currentSessionId) return;

    if (this.speechQueue.length === 0) {
      this.isSpeakingQueue = false;
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

      console.error('Speech chunk error', e);
      // For other errors, skip this chunk to avoid infinite loop
      if (this.speechQueue.length > 0) this.speechQueue.shift();
      setTimeout(() => this.processQueue(activeSession), 10);
    };

    this.synth.speak(utter);

    // Start keep-alive timer to prevent 15s timeout
    const keepAlive = () => {
      if (!this.synth.speaking) return;
      this.synth.pause();
      this.synth.resume();
      this.speechTimeout = setTimeout(keepAlive, 10000);
    };
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(keepAlive, 10000);
  }

  speakCurrent(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) return;

    this.startNewSpeechSession();
    if (this.synth.paused) this.synth.resume();

    const q = this.questions[this.currentIndex];

    // Chunk 1: Question
    const qText = `Soru ${this.currentIndex + 1}. ${this.cleanText(q.text)}.`;
    this.speechQueue.push(qText);

    // Chunk 2: Options (Skip if hiding incorrect options to avoid redundancy)
    if (!this.settings.hideIncorrectOptions) {
      const optText = "Seçenekler: " + q.options.map(opt => `${opt.key} şıkkı, ${this.cleanText(opt.text)}`).join('. ') + ".";
      this.speechQueue.push(optText);
    }

    // Chunk 3: Answer/Explanation (if not interactive)
    if (!this.isInteractive) {
      let ansParts = [];

      // If we hid options, we start directly with the Answer
      if (this.settings.showAnswers) {
        ansParts.push(`Doğru Cevap: ${q.correctKey}, ${this.cleanText(q.correctAnswerText)}.`);
      }

      if (this.settings.showExplanations && q.explanation) {
        ansParts.push(`Açıklama: ${this.cleanText(q.explanation)}`);
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
    if (!q.explanation) return;

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

    const expText = `Açıklama: ${this.cleanText(q.explanation)}`;
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
}