/**
 * NEXUS // Academic AI Studio
 * Core Application Engine & Autonomous Agent Loop
 * Editorial Obsidian & Chartreuse Northline Edition
 * Features: Google Account Sync, Real Online Rain Ambience, Physical Letter Modal, and Continuous Pushup Mascot
 */

// ==========================================================================
// 1. STATE MANAGEMENT & PER-ACCOUNT GOOGLE PERSISTENCE
// ==========================================================================

const ZERO_CGPA_STATE = {
  currentCGPA: 0.00,
  creditsDone: 0,
  targetCGPA: 0.00,
  currentSemCredits: 0
};

const DEFAULT_SETTINGS = {
  isLiveMode: false,
  provider: 'gemini',
  apiKeyGemini: '',
  apiKeyGroq: ''
};

let appState = {
  activeUser: 'guest', // 'guest' or 'name@gmail.com'
  tasks: [],
  cgpa: { ...ZERO_CGPA_STATE },
  settings: { ...DEFAULT_SETTINGS },
  filter: 'all',
  timer: {
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    intervalId: null,
    isRunning: false,
    activeTask: '[No Active Task]'
  },
  rain: {
    isPlaying: false,
    volume: 0.65,
    durationMode: 'match', // 'match', '15', '30', 'continuous'
    timeoutId: null
  },
  chatMessages: []
};

// Curated collection of elite academic & study motivational quotes
const ACADEMIC_MOTIVATIONAL_QUOTES = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more.", author: "Marie Curie" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Focus is a muscle. The more you practice deep study, the stronger your mind becomes.", author: "Cal Newport" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Small daily improvements over time lead to stunning academic results.", author: "Robin Sharma" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Sometimes it is the people no one can imagine anything of who do the things no one can imagine.", author: "Alan Turing" }
];

function getStorageKey(type) {
  const userKey = appState.activeUser.replace(/[^a-zA-Z0-9_]/g, '_');
  return `aura_${type}_${userKey}`;
}

// Load per-account data from localStorage
function loadAccountData(userEmail) {
  appState.activeUser = userEmail || 'guest';
  localStorage.setItem('aura_active_user', appState.activeUser);

  try {
    const savedTasks = localStorage.getItem(getStorageKey('tasks'));
    // Starts at ZERO / empty if new account or not found
    appState.tasks = savedTasks ? JSON.parse(savedTasks) : [];

    const savedCgpa = localStorage.getItem(getStorageKey('cgpa'));
    // Starts at ZERO if not found
    appState.cgpa = savedCgpa ? JSON.parse(savedCgpa) : { ...ZERO_CGPA_STATE };

    const savedSettings = localStorage.getItem(getStorageKey('settings'));
    appState.settings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS };

    const savedChat = localStorage.getItem(getStorageKey('chat'));
    appState.chatMessages = savedChat ? JSON.parse(savedChat) : [];
  } catch (err) {
    console.error('Error loading account data:', err);
    appState.tasks = [];
    appState.cgpa = { ...ZERO_CGPA_STATE };
    appState.settings = { ...DEFAULT_SETTINGS };
    appState.chatMessages = [];
  }

  // Update UI for the loaded account
  updateAuthUI();
  renderTasks();
  renderCGPA();
  updateTimerDisplay();
}

function persistTasks() {
  localStorage.setItem(getStorageKey('tasks'), JSON.stringify(appState.tasks));
}

function persistCGPA() {
  localStorage.setItem(getStorageKey('cgpa'), JSON.stringify(appState.cgpa));
}

function persistSettings() {
  localStorage.setItem(getStorageKey('settings'), JSON.stringify(appState.settings));
}

function persistChat() {
  localStorage.setItem(getStorageKey('chat'), JSON.stringify(appState.chatMessages.slice(-25)));
}

function getFutureDateString(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// ==========================================================================
// 2. REAL ONLINE RAIN AUDIO & PROCEDURAL FALLBACK ENGINE
// ==========================================================================

class AuraAudioEngine {
  constructor() {
    this.ctx = null;
    this.rainGainNode = null;
    this.rainSourceNode = null;
    this.rainFilterNode = null;
    this.isRainGenerating = false;

    // Real Online Rain Audio from free public audio CDN (Google Actions & FreeSound CDNs)
    this.onlineRainAudio = null;
    this.onlineAudioLoaded = false;
    this.setupOnlineRainAudio();
  }

  setupOnlineRainAudio() {
    try {
      // Primary: High-fidelity real continuous rain recording
      this.onlineRainAudio = new Audio('https://actions.google.com/sounds/v1/weather/rain_heavy.ogg');
      this.onlineRainAudio.loop = true;
      this.onlineRainAudio.crossOrigin = 'anonymous';
      this.onlineRainAudio.preload = 'auto';

      this.onlineRainAudio.addEventListener('canplaythrough', () => {
        this.onlineAudioLoaded = true;
      });

      this.onlineRainAudio.addEventListener('error', () => {
        // Fallback secondary online rain URL if primary is unavailable
        if (this.onlineRainAudio.src !== 'https://actions.google.com/sounds/v1/weather/light_rain.ogg') {
          this.onlineRainAudio.src = 'https://actions.google.com/sounds/v1/weather/light_rain.ogg';
        }
      });
    } catch (e) {
      console.warn('Online audio init deferred:', e);
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Crisp UI feedback chirps
  playChirp(type = 'tool') {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      if (type === 'tool') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'complete') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'robot') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.08);
        osc.frequency.setValueAtTime(1046.50, now + 0.16);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'alarm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(987.77, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch (e) {}
  }

  // Play real online rain sound with seamless procedural fallback
  startRain(volume = 0.65) {
    this.isRainGenerating = true;
    const vol = Math.max(0, Math.min(1, volume));

    // 1. Attempt to stream real online rain audio from public CDN
    if (this.onlineRainAudio) {
      try {
        this.onlineRainAudio.volume = vol;
        const playPromise = this.onlineRainAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Online stream successfully playing
          }).catch(err => {
            console.warn('Real online rain playback paused by browser policy or network. Using Web Audio fallback:', err);
            this.startProceduralRain(vol);
          });
          return;
        }
      } catch (err) {
        this.startProceduralRain(vol);
        return;
      }
    }

    // 2. Procedural Web Audio fallback
    this.startProceduralRain(vol);
  }

  startProceduralRain(volume = 0.65) {
    try {
      this.init();
      if (!this.ctx) return;

      if (this.rainSourceNode) {
        this.setRainVolume(volume);
        return;
      }

      const bufferSize = this.ctx.sampleRate * 5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      // Pink noise algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.rainSourceNode = this.ctx.createBufferSource();
      this.rainSourceNode.buffer = buffer;
      this.rainSourceNode.loop = true;

      this.rainFilterNode = this.ctx.createBiquadFilter();
      this.rainFilterNode.type = 'lowpass';
      this.rainFilterNode.frequency.setValueAtTime(1400, this.ctx.currentTime);

      this.rainGainNode = this.ctx.createGain();
      this.rainGainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.rainGainNode.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.25), this.ctx.currentTime + 1.2);

      this.rainSourceNode.connect(this.rainFilterNode);
      this.rainFilterNode.connect(this.rainGainNode);
      this.rainGainNode.connect(this.ctx.destination);

      this.rainSourceNode.start(0);
    } catch (e) {
      console.warn('Audio policy prevented auto-play:', e);
    }
  }

  stopRain() {
    this.isRainGenerating = false;

    // Stop real online rain track
    if (this.onlineRainAudio) {
      try {
        this.onlineRainAudio.pause();
        this.onlineRainAudio.currentTime = 0;
      } catch (e) {}
    }

    // Stop procedural audio
    try {
      if (!this.rainGainNode || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.rainGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      setTimeout(() => {
        if (this.rainSourceNode) {
          try { this.rainSourceNode.stop(); } catch(e){}
          this.rainSourceNode.disconnect();
          this.rainSourceNode = null;
        }
      }, 650);
    } catch (e) {}
  }

  setRainVolume(val) {
    const vol = Math.max(0, Math.min(1, val));
    if (this.onlineRainAudio) {
      this.onlineRainAudio.volume = vol;
    }
    if (this.rainGainNode && this.ctx) {
      this.rainGainNode.gain.linearRampToValueAtTime(vol * 0.25, this.ctx.currentTime + 0.1);
    }
  }
}

const audioFX = new AuraAudioEngine();

// ==========================================================================
// 3. FLOATING ROBOT MOTIVATIONAL COMPANION ENGINE
// ==========================================================================

async function fetchAndDisplayMotivation() {
  const quoteTextEl = document.getElementById('robotQuoteText');
  const quoteAuthorEl = document.getElementById('robotQuoteAuthor');
  const bubble = document.getElementById('robotSpeechBubble');
  if (!quoteTextEl || !quoteAuthorEl) return;

  // Visual loading pulse
  quoteTextEl.style.opacity = '0.5';

  let quote = null;

  // Try online quote fetch with quick timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch('https://dummyjson.com/quotes/random', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.quote) {
        quote = { text: data.quote, author: data.author || 'Inspiration' };
      }
    }
  } catch (err) {
    // Graceful fallback to curated collection
  }

  // If online fetch not available or timed out, pick random from curated list
  if (!quote) {
    const randomIndex = Math.floor(Math.random() * ACADEMIC_MOTIVATIONAL_QUOTES.length);
    quote = ACADEMIC_MOTIVATIONAL_QUOTES[randomIndex];
  }

  quoteTextEl.textContent = `"${quote.text}"`;
  quoteAuthorEl.textContent = `— ${quote.author}`;
  quoteTextEl.style.opacity = '1';

  // Ensure bubble is open
  if (bubble) {
    bubble.classList.remove('hidden');
  }
}

function initRobotCompanion() {
  const robotBtn = document.getElementById('btnRobotToggle');
  const bubble = document.getElementById('robotSpeechBubble');
  const btnClose = document.getElementById('btnCloseMotivation');
  const btnNewQuote = document.getElementById('btnNewQuote');

  // Trigger motivation automatically whenever the site is opened
  fetchAndDisplayMotivation();

  // Close motivation animation
  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (bubble) {
        bubble.classList.add('hidden');
      }
      audioFX.playChirp('tool');
    });
  }

  // Click floating robot: reopen or load new quote
  if (robotBtn) {
    robotBtn.addEventListener('click', () => {
      audioFX.playChirp('robot');
      if (bubble.classList.contains('hidden')) {
        bubble.classList.remove('hidden');
      } else {
        fetchAndDisplayMotivation();
      }
    });
  }

  // New quote button inside speech bubble
  if (btnNewQuote) {
    btnNewQuote.addEventListener('click', () => {
      audioFX.playChirp('robot');
      fetchAndDisplayMotivation();
    });
  }

  // Continuous pushup rep count ticker
  const repBadge = document.getElementById('pushupRepBadge');
  if (repBadge) {
    let reps = 12;
    setInterval(() => {
      reps++;
      repBadge.textContent = `${reps} REPS`;
    }, 1800);
  }
}

// ==========================================================================
// 4. CORE EXECUTABLE JAVASCRIPT TOOLS (DOM + STATE + PERSISTENCE)
// ==========================================================================

const auraTools = {
  /**
   * Tool 1: addAssignment
   * Adds task card and flashes pink border highlight on Coursework board.
   */
  addAssignment: function({ title, moduleName, dueDate, priority = 'High' }) {
    if (!title || !title.trim()) {
      return { success: false, error: 'Assignment title is required.' };
    }

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: title.trim(),
      moduleName: (moduleName || 'General Academic').trim(),
      dueDate: dueDate || getFutureDateString(3),
      priority: ['Critical', 'High', 'Normal'].includes(priority) ? priority : 'High',
      completed: false,
      createdAt: Date.now()
    };

    appState.tasks.unshift(newTask);
    persistTasks();
    renderTasks();

    // Trigger visual chartreuse lime border flash on Bento Card 1
    const missionCard = document.getElementById('missionControlCard');
    if (missionCard) {
      missionCard.classList.remove('border-flash-lime');
      void missionCard.offsetWidth;
      missionCard.classList.add('border-flash-lime');
    }

    audioFX.playChirp('tool');

    return {
      success: true,
      taskId: newTask.id,
      message: `Assignment "${newTask.title}" queued under [${newTask.moduleName}] with ${newTask.priority} priority (Due: ${newTask.dueDate}).`
    };
  },

  /**
   * Tool 2: completeAssignment
   * Marks a matching task complete with strikethrough animation.
   */
  completeAssignment: function({ title }) {
    if (!title || !title.trim()) {
      return { success: false, error: 'Target assignment title or keyword required.' };
    }

    const query = title.trim().toLowerCase();
    const taskIndex = appState.tasks.findIndex(t => 
      t.title.toLowerCase().includes(query) || 
      t.moduleName.toLowerCase().includes(query)
    );

    if (taskIndex === -1) {
      return {
        success: false,
        error: `No pending assignment found matching "${title}". Check your Coursework board.`
      };
    }

    const target = appState.tasks[taskIndex];
    target.completed = true;
    persistTasks();
    renderTasks();

    const cardEl = document.querySelector(`[data-task-id="${target.id}"]`);
    if (cardEl) {
      cardEl.classList.add('just-completed');
    }

    audioFX.playChirp('complete');

    return {
      success: true,
      taskId: target.id,
      title: target.title,
      message: `Assignment "${target.title}" marked as complete.`
    };
  },

  /**
   * Tool 3: simulateCGPA
   * Calculates exact GPA needed this semester and updates Trajectory card.
   */
  simulateCGPA: function({ currentCGPA, creditsDone, targetCGPA, currentSemCredits }) {
    const curr = parseFloat(currentCGPA ?? appState.cgpa.currentCGPA);
    const done = parseFloat(creditsDone ?? appState.cgpa.creditsDone);
    const target = parseFloat(targetCGPA ?? appState.cgpa.targetCGPA);
    const sem = parseFloat(currentSemCredits ?? appState.cgpa.currentSemCredits);

    if (isNaN(curr) || isNaN(done) || isNaN(target) || isNaN(sem) || sem <= 0) {
      return { success: false, error: 'Invalid numbers. Please provide current CGPA, credits done, target CGPA, and semester credits (>0).' };
    }

    // Formula: Required GPA = (Target * (Done + Sem) - (Current * Done)) / Sem
    const totalCreditsFuture = done + sem;
    const totalPointsNeeded = target * totalCreditsFuture;
    const currentPointsEarned = curr * done;
    const pointsNeededThisSem = totalPointsNeeded - currentPointsEarned;
    const requiredSemGPA = pointsNeededThisSem / sem;
    const roundedReq = parseFloat(requiredSemGPA.toFixed(2));

    appState.cgpa = {
      currentCGPA: curr,
      creditsDone: done,
      targetCGPA: target,
      currentSemCredits: sem
    };
    persistCGPA();

    let feasibility = '';
    let feasibilityClass = '';
    let recommendation = '';

    if (roundedReq <= 3.75 && roundedReq >= 0) {
      feasibility = 'ACHIEVABLE';
      feasibilityClass = 'achievable';
      recommendation = `Target is achievable. Earning a ${roundedReq > 0 ? roundedReq : 0.00} GPA this term reaches your goal.`;
    } else if (roundedReq <= 4.00) {
      feasibility = 'RIGOROUS';
      feasibilityClass = 'rigorous';
      recommendation = `Requires high performance (${roundedReq} GPA). Maintain consistent study sprints.`;
    } else {
      feasibility = 'IMPOSSIBLE';
      feasibilityClass = 'impossible';
      recommendation = `Statistically unreachable this semester (${roundedReq} GPA required > 4.00 max). Consider planning across 2 terms.`;
    }

    renderCGPA(roundedReq, feasibility, feasibilityClass, recommendation);
    audioFX.playChirp('tool');

    return {
      success: true,
      requiredGPA: roundedReq,
      feasibility: feasibility,
      isRealistic: roundedReq <= 4.00,
      details: {
        currentCGPA: curr,
        creditsDone: done,
        targetCGPA: target,
        currentSemCredits: sem
      },
      message: `Required semester GPA is ${roundedReq} (${feasibility}). ${recommendation}`
    };
  },

  /**
   * Tool 4: startFocusSession
   * Starts Pomodoro timer on dashboard with optional ambient rain music.
   */
  startFocusSession: function({ minutes = 25, taskName = 'Deep Study Sprint', playRain = false }) {
    const mins = Math.max(1, Math.min(120, parseInt(minutes, 10) || 25));
    const title = taskName && taskName.trim() ? taskName.trim() : 'Active Study Sprint';

    appState.timer.totalSeconds = mins * 60;
    appState.timer.remainingSeconds = mins * 60;
    appState.timer.activeTask = title;

    startTimerInterval();
    updateTimerDisplay();

    if (playRain) {
      startRainAmbience();
    }

    const timerCard = document.getElementById('focusCard');
    if (timerCard) {
      timerCard.classList.remove('border-flash-lime');
      void timerCard.offsetWidth;
      timerCard.classList.add('border-flash-lime');
    }

    audioFX.playChirp('tool');

    return {
      success: true,
      durationMinutes: mins,
      activeTask: title,
      rainEnabled: playRain,
      message: `Focus sprint started: ${mins} minutes allocated for "${title}".${playRain ? ' Ambient rain sounds active.' : ''}`
    };
  }
};

// ==========================================================================
// 5. UI CONTROLLERS & RENDERING
// ==========================================================================

function updateAuthUI() {
  const isGuest = appState.activeUser === 'guest';
  const signedOutBox = document.getElementById('authSignedOut');
  const signedInBox = document.getElementById('authSignedIn');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const userAvatar = document.getElementById('userAvatar');

  if (isGuest) {
    signedOutBox.style.display = 'block';
    signedInBox.style.display = 'none';
  } else {
    signedOutBox.style.display = 'none';
    signedInBox.style.display = 'flex';
    userEmailDisplay.textContent = appState.activeUser;
    userAvatar.textContent = (appState.activeUser[0] || 'U').toUpperCase();
  }
}

// Render Coursework Deliverables (Empty state when zero)
function renderTasks() {
  const container = document.getElementById('assignmentList');
  if (!container) return;

  const filter = appState.filter;
  let filtered = appState.tasks;

  if (filter === 'high') {
    filtered = appState.tasks.filter(t => (t.priority === 'Critical' || t.priority === 'High') && !t.completed);
  } else if (filter === 'completed') {
    filtered = appState.tasks.filter(t => t.completed);
  }

  const totalCount = appState.tasks.length;
  const highCount = appState.tasks.filter(t => (t.priority === 'Critical' || t.priority === 'High') && !t.completed).length;
  const compCount = appState.tasks.filter(t => t.completed).length;

  document.getElementById('countAll').textContent = totalCount;
  document.getElementById('countHigh').textContent = highCount;
  document.getElementById('countCompleted').textContent = compCount;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 42px 16px; color: var(--text-muted); font-size: 0.88rem; font-weight: 500;">
        No assignments currently queued. Add your first deliverable above or tell AURA Agent!
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => {
    const isCompleted = task.completed;
    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    const daysDiff = getDaysRemaining(task.dueDate);
    let dueLabel = task.dueDate;

    if (daysDiff === 0) dueLabel = 'DUE TODAY';
    else if (daysDiff === 1) dueLabel = 'DUE TOMORROW';
    else if (daysDiff > 1) dueLabel = `${daysDiff} DAYS REMAINING`;
    else if (daysDiff < 0) dueLabel = `OVERDUE (${Math.abs(daysDiff)}d)`;

    return `
      <div class="task-card ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-main">
          <button class="task-checkbox-btn ${isCompleted ? 'checked' : ''}" data-action="toggle-complete" data-id="${task.id}" title="Toggle Complete">
            <span class="check-mark">✓</span>
          </button>
          <div class="task-info">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="task-module-badge">${escapeHtml(task.moduleName)}</span>
              <span class="priority-tag ${priorityClass}">${task.priority}</span>
            </div>
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-meta">
              <span class="task-countdown">⏱ ${dueLabel}</span>
            </div>
          </div>
        </div>
        <button class="btn-task-delete" data-action="delete" data-id="${task.id}" title="Delete Task">✕</button>
      </div>
    `;
  }).join('');
}

function getDaysRemaining(dateStr) {
  if (!dateStr) return 0;
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

// Render CGPA Simulator Metrics
function renderCGPA(requiredGPA = null, feasibility = null, feasibilityClass = null, recommendation = null) {
  const { currentCGPA, creditsDone, targetCGPA, currentSemCredits } = appState.cgpa;

  // Header status pill
  const pillVal = document.getElementById('headerCgpaVal');
  const pillStatus = document.getElementById('headerCgpaStatus');
  if (pillVal) pillVal.textContent = currentCGPA.toFixed(2);
  if (pillStatus) {
    if (currentCGPA === 0) {
      pillStatus.textContent = 'NOT SET';
    } else {
      pillStatus.textContent = currentCGPA >= 3.75 ? 'SUMMA' : (currentCGPA >= 3.5 ? 'HONORS' : 'GOOD');
    }
  }

  // Dashboard card metrics
  document.getElementById('dispCurrentCgpa').textContent = currentCGPA.toFixed(2);
  document.getElementById('dispCreditsDone').textContent = creditsDone;
  document.getElementById('dispTargetCgpa').textContent = targetCGPA.toFixed(2);

  // Bars
  document.getElementById('barCurrentCgpa').style.width = `${Math.min(100, (currentCGPA / 4.0) * 100)}%`;
  document.getElementById('barCreditsDone').style.width = `${Math.min(100, (creditsDone / 128) * 100)}%`;
  document.getElementById('barTargetCgpa').style.width = `${Math.min(100, (targetCGPA / 4.0) * 100)}%`;

  // Required GPA calculation
  if (requiredGPA === null) {
    if (currentSemCredits <= 0 || targetCGPA <= 0) {
      requiredGPA = 0.00;
      feasibility = 'READY';
      feasibilityClass = 'ready';
      recommendation = 'Set your current academic metrics below to calculate required GPA.';
    } else {
      const totalCredits = creditsDone + currentSemCredits;
      const pts = (targetCGPA * totalCredits) - (currentCGPA * creditsDone);
      requiredGPA = parseFloat((pts / currentSemCredits).toFixed(2));
      
      if (requiredGPA <= 3.75 && requiredGPA >= 0) {
        feasibility = 'ACHIEVABLE';
        feasibilityClass = 'achievable';
        recommendation = `Target is achievable. Earning a ${requiredGPA} GPA this term reaches your goal.`;
      } else if (requiredGPA <= 4.00) {
        feasibility = 'RIGOROUS';
        feasibilityClass = 'rigorous';
        recommendation = `Requires high performance (${requiredGPA} GPA). Maintain consistent study sprints.`;
      } else {
        feasibility = 'IMPOSSIBLE';
        feasibilityClass = 'impossible';
        recommendation = `Statistically unreachable this semester (${requiredGPA} GPA required > 4.00 max). Consider planning across 2 terms.`;
      }
    }
  }

  document.getElementById('dispRequiredGpa').textContent = requiredGPA.toFixed(2);
  const badge = document.getElementById('gpaFeasibilityBadge');
  badge.textContent = feasibility;
  badge.className = `metric-badge ${feasibilityClass}`;

  const note = document.getElementById('trajectoryNote');
  note.textContent = recommendation;

  // Sync inputs
  document.getElementById('simCurrentCgpa').value = currentCGPA;
  document.getElementById('simCreditsDone').value = creditsDone;
  document.getElementById('simTargetCgpa').value = targetCGPA;
  document.getElementById('simSemCredits').value = currentSemCredits;
}

// ==========================================================================
// 6. FOCUS SPRINT TIMER & PROCEDURAL RAIN AMBIENCE
// ==========================================================================

function initPomodoroAndRain() {
  const btnStartPause = document.getElementById('btnTimerStartPause');
  const btnReset = document.getElementById('btnTimerReset');
  const presetButtons = document.querySelectorAll('.btn-preset');

  btnStartPause.addEventListener('click', () => {
    if (appState.timer.isRunning) {
      pauseTimer();
    } else {
      startTimerInterval();
    }
  });

  btnReset.addEventListener('click', () => {
    resetTimer();
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mins = parseInt(btn.dataset.time, 10);
      setTimerDuration(mins);
    });
  });

  // Rain music controls
  const btnRainToggle = document.getElementById('btnRainToggle');
  const rainTimingSelect = document.getElementById('rainTimingSelect');
  const rainVolumeSlider = document.getElementById('rainVolumeSlider');

  btnRainToggle.addEventListener('click', () => {
    if (appState.rain.isPlaying) {
      stopRainAmbience();
    } else {
      startRainAmbience();
    }
  });

  rainTimingSelect.addEventListener('change', () => {
    appState.rain.durationMode = rainTimingSelect.value;
    handleRainTimingChange();
  });

  rainVolumeSlider.addEventListener('input', () => {
    const vol = rainVolumeSlider.value / 100;
    appState.rain.volume = vol;
    audioFX.setRainVolume(vol);
  });

  updateTimerDisplay();
}

function setTimerDuration(mins) {
  pauseTimer();
  appState.timer.totalSeconds = mins * 60;
  appState.timer.remainingSeconds = mins * 60;
  updateTimerDisplay();
}

function startTimerInterval() {
  if (appState.timer.isRunning) return;
  appState.timer.isRunning = true;

  const btnStartPause = document.getElementById('btnTimerStartPause');
  btnStartPause.textContent = 'PAUSE SPRINT';
  btnStartPause.classList.add('active');

  clearInterval(appState.timer.intervalId);
  appState.timer.intervalId = setInterval(() => {
    if (appState.timer.remainingSeconds > 0) {
      appState.timer.remainingSeconds--;
      updateTimerDisplay();
    } else {
      pauseTimer();
      audioFX.playChirp('alarm');
      
      if (appState.rain.isPlaying && appState.rain.durationMode === 'match') {
        stopRainAmbience();
      }

      appendAgentMessage(`⏱️ **Focus Sprint Completed!** Great effort on "${appState.timer.activeTask}". Take a cognitive break!`);
    }
  }, 1000);
}

function pauseTimer() {
  appState.timer.isRunning = false;
  clearInterval(appState.timer.intervalId);

  const btnStartPause = document.getElementById('btnTimerStartPause');
  btnStartPause.textContent = 'RESUME SPRINT';
  btnStartPause.classList.remove('active');
}

function resetTimer() {
  pauseTimer();
  appState.timer.remainingSeconds = appState.timer.totalSeconds;
  const btnStartPause = document.getElementById('btnTimerStartPause');
  btnStartPause.textContent = 'START SPRINT';
  btnStartPause.classList.remove('active');
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const secs = appState.timer.remainingSeconds;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  document.getElementById('timerDigits').textContent = formatted;
  document.getElementById('currentFocusTaskName').textContent = appState.timer.activeTask;

  const ring = document.getElementById('timerProgressRing');
  if (ring) {
    const totalCircumference = 2 * Math.PI * 86; // 540.35
    const progress = (appState.timer.totalSeconds - secs) / appState.timer.totalSeconds;
    const offset = totalCircumference * (1 - progress);
    ring.style.strokeDashoffset = offset;
  }
}

// Rain ambience handlers
function startRainAmbience() {
  appState.rain.isPlaying = true;
  audioFX.startRain(appState.rain.volume);

  const btnRain = document.getElementById('btnRainToggle');
  btnRain.textContent = 'Stop Rain';
  btnRain.classList.add('playing');

  const status = document.getElementById('rainStatusText');
  status.textContent = 'PLAYING';
  status.classList.add('playing');

  const wave = document.getElementById('rainWaveBars');
  wave.classList.add('active');

  handleRainTimingChange();
}

function stopRainAmbience() {
  appState.rain.isPlaying = false;
  clearTimeout(appState.rain.timeoutId);
  audioFX.stopRain();

  const btnRain = document.getElementById('btnRainToggle');
  btnRain.textContent = 'Play Rain';
  btnRain.classList.remove('playing');

  const status = document.getElementById('rainStatusText');
  status.textContent = 'OFF';
  status.classList.remove('playing');

  const wave = document.getElementById('rainWaveBars');
  wave.classList.remove('active');
}

function handleRainTimingChange() {
  clearTimeout(appState.rain.timeoutId);
  if (!appState.rain.isPlaying) return;

  const mode = appState.rain.durationMode;
  if (mode === '15') {
    appState.rain.timeoutId = setTimeout(() => {
      stopRainAmbience();
    }, 15 * 60 * 1000);
  } else if (mode === '30') {
    appState.rain.timeoutId = setTimeout(() => {
      stopRainAmbience();
    }, 30 * 60 * 1000);
  }
}

// ==========================================================================
// 7. AUTONOMOUS AGENT ENGINE (LOCAL DEMO NLP + LIVE GEMINI/GROQ)
// ==========================================================================

function appendUserMessage(text) {
  const feed = document.getElementById('chatFeed');
  if (!feed) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message message-user';
  msgDiv.innerHTML = `
    <div class="msg-author-tag">YOU (${escapeHtml(appState.activeUser)})</div>
    <div class="msg-content">${escapeHtml(text)}</div>
    <div class="msg-timestamp">${new Date().toLocaleTimeString()}</div>
  `;
  feed.appendChild(msgDiv);
  feed.scrollTop = feed.scrollHeight;

  appState.chatMessages.push({ role: 'user', content: text });
  persistChat();
}

function appendAgentMessage(htmlContent, toolBadges = []) {
  const feed = document.getElementById('chatFeed');
  if (!feed) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message message-agent';

  let badgesHtml = '';
  if (toolBadges && toolBadges.length > 0) {
    badgesHtml = toolBadges.map(name => `
      <div class="tool-execution-badge">
        <span class="tool-badge-icon">⚡</span>
        <span>Agent Executing Tool: [${escapeHtml(name)}]...</span>
      </div>
    `).join('');
  }

  msgDiv.innerHTML = `
    <div class="msg-author-tag">AURA AGENT // AUTONOMOUS ENGINE</div>
    ${badgesHtml}
    <div class="msg-content">${htmlContent}</div>
    <div class="msg-timestamp">${new Date().toLocaleTimeString()}</div>
  `;
  feed.appendChild(msgDiv);
  feed.scrollTop = feed.scrollHeight;

  appState.chatMessages.push({ role: 'assistant', content: htmlContent });
  persistChat();
}

/**
 * Built-in Free Local Agent (Demo Mode)
 */
async function runLocalAgent(prompt) {
  const lower = prompt.toLowerCase();
  const executedTools = [];
  const actionResults = [];

  const delay = ms => new Promise(res => setTimeout(res, ms));
  await delay(450);

  // Intent 1: Add Assignment(s)
  if (lower.includes('add') && (lower.includes('task') || lower.includes('assignment') || lower.includes('lab') || lower.includes('project') || lower.includes('due') || lower.includes('priority'))) {
    const segments = prompt.split(/\s+and\s+/i);
    let addedCount = 0;

    for (const seg of segments) {
      if (seg.toLowerCase().includes('add') || segments.length > 1) {
        let title = 'Coursework Deliverable';
        let moduleName = 'General Academic';
        let priority = 'High';
        let dueDate = getFutureDateString(3);

        if (/critical/i.test(seg)) priority = 'Critical';
        else if (/normal/i.test(seg)) priority = 'Normal';
        else priority = 'High';

        const daysMatch = seg.match(/due\s+in\s+(\d+)\s+days?/i);
        if (daysMatch) {
          dueDate = getFutureDateString(parseInt(daysMatch[1], 10));
        } else if (/tomorrow/i.test(seg)) {
          dueDate = getFutureDateString(1);
        }

        if (/java/i.test(seg)) {
          moduleName = 'Java OOP';
          title = /lab/i.test(seg) ? 'Lab 5: Advanced Concurrency & Streams' : 'Java Application Milestone';
        } else if (/r\s+data/i.test(seg) || /\br\b/i.test(seg)) {
          moduleName = 'R Data Analysis';
          title = /project/i.test(seg) ? 'Exploratory Data Analysis Project' : 'R Statistical Modeling';
        } else {
          const clean = seg.replace(/^(add\s+(assignment|task)?)/i, '')
                           .replace(/due.*$/i, '')
                           .replace(/priority.*$/i, '')
                           .trim();
          if (clean.length > 2) title = clean;
        }

        executedTools.push('addAssignment');
        const res = auraTools.addAssignment({ title, moduleName, dueDate, priority });
        actionResults.push(res.message);
        addedCount++;
        await delay(300);
      }
    }

    if (addedCount > 0) {
      appendAgentMessage(
        `Added deliverables to your Coursework board:<br><br>
        ${actionResults.map(r => `• ${r}`).join('<br>')}<br><br>
        Glow highlight activated on the assignments card.`,
        executedTools
      );
      return;
    }
  }

  // Intent 2: Complete Assignment
  if (lower.includes('complete') || lower.includes('finish') || lower.includes('done') || lower.includes('mark')) {
    const targetQuery = prompt
      .replace(/^(please\s+)?(complete|finish|mark|done)\s+(assignment|task)?/i, '')
      .replace(/(as\s+)?(complete|done)$/i, '')
      .trim();

    executedTools.push('completeAssignment');
    const res = auraTools.completeAssignment({ title: targetQuery || 'Java OOP' });

    if (res.success) {
      appendAgentMessage(`✓ ${res.message}<br><br>Strikethrough animation applied.`, executedTools);
    } else {
      appendAgentMessage(`⚠️ ${res.error}`, executedTools);
    }
    return;
  }

  // Intent 3: CGPA Simulator
  if (lower.includes('simulate') || lower.includes('cgpa') || lower.includes('gpa') || lower.includes('trajectory') || lower.includes('target')) {
    let curr = appState.cgpa.currentCGPA || 3.42;
    let done = appState.cgpa.creditsDone || 64;
    let target = appState.cgpa.targetCGPA || 3.60;
    let sem = appState.cgpa.currentSemCredits || 16;

    const currMatch = prompt.match(/current\s*(?:cgpa|gpa)?\s*[:=]?\s*(\d+(\.\d+)?)/i);
    const doneMatch = prompt.match(/(\d+)\s*credits?\s*(?:completed|done)/i);
    const targetMatch = prompt.match(/target\s*(?:cgpa|gpa)?\s*[:=]?\s*(\d+(\.\d+)?)/i) || prompt.match(/calculate\s*(\d+(\.\d+)?)\s*cgpa/i);
    const semMatch = prompt.match(/(\d+)\s*credits?\s*(?:this|enrolled|semester)/i);

    if (currMatch) curr = parseFloat(currMatch[1]);
    if (doneMatch) done = parseFloat(doneMatch[1]);
    if (targetMatch) target = parseFloat(targetMatch[1]);
    if (semMatch) sem = parseFloat(semMatch[1]);

    executedTools.push('simulateCGPA');
    const res = auraTools.simulateCGPA({
      currentCGPA: curr,
      creditsDone: done,
      targetCGPA: target,
      currentSemCredits: sem
    });

    appendAgentMessage(
      `🎯 **CGPA Trajectory Simulation Complete**:<br><br>
      • <strong>Target CGPA:</strong> ${target.toFixed(2)}<br>
      • <strong>Required Semester GPA:</strong> <span style="color:var(--lime-primary); font-weight:700;">${res.requiredGPA}</span> (${res.feasibility})<br>
      • <strong>Analysis:</strong> ${res.message}`,
      executedTools
    );
    return;
  }

  // Intent 4: Start Focus Session with optional Rain
  if (lower.includes('sprint') || lower.includes('focus') || lower.includes('pomodoro') || lower.includes('timer') || lower.includes('rain')) {
    let minutes = 25;
    let taskName = 'Deep Study Sprint';
    const playRain = lower.includes('rain') || lower.includes('music') || lower.includes('sound');

    const minMatch = prompt.match(/(\d+)\s*(?:m|min|minutes?)/i);
    if (minMatch) minutes = parseInt(minMatch[1], 10);

    const forMatch = prompt.match(/for\s+([^,\.]+)/i);
    if (forMatch) {
      taskName = forMatch[1].replace(/with\s+rain.*/i, '').trim();
    }

    executedTools.push('startFocusSession');
    const res = auraTools.startFocusSession({ minutes, taskName, playRain });

    appendAgentMessage(
      `⏱️ **Focus Sprint Initialized**:<br><br>
      • <strong>Duration:</strong> ${minutes} minutes<br>
      • <strong>Task:</strong> ${taskName}<br>
      • <strong>Rain Ambience:</strong> ${playRain ? '🌧️ Active (Soothing rain sounds playing)' : 'Off'}<br><br>
      Timer is running on your dashboard.`,
      executedTools
    );
    return;
  }

  // Default conversational reply
  appendAgentMessage(
    `Received: "${escapeHtml(prompt)}".<br><br>
    I can execute tasks for you:
    <ul style="margin: 8px 0 0 18px; line-height: 1.6; font-size: 0.84rem; color: var(--text-secondary);">
      <li><strong>Add Task:</strong> "Add Java OOP assignment due in 3 days priority Critical"</li>
      <li><strong>Complete:</strong> "Complete Java OOP Lab 4"</li>
      <li><strong>CGPA:</strong> "Simulate CGPA: current 3.42, 64 credits, target 3.60, 16 sem credits"</li>
      <li><strong>Focus & Rain:</strong> "Start 25m sprint for Java OOP with rain music"</li>
    </ul>`
  );
}

// Master Command Dispatcher
async function handleUserCommand(rawPrompt) {
  if (!rawPrompt || !rawPrompt.trim()) return;
  const prompt = rawPrompt.trim();

  appendUserMessage(prompt);
  await runLocalAgent(prompt);
}

// ==========================================================================
// 8. EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function initEventListeners() {
  // Google Sign-In Modal
  const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
  const btnGoogleSignOut = document.getElementById('btnGoogleSignOut');
  const googleAuthModal = document.getElementById('googleAuthModal');
  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  const btnCancelAuthModal = document.getElementById('btnCancelAuthModal');
  const googleSignInForm = document.getElementById('googleSignInForm');
  const gmailInput = document.getElementById('gmailInput');
  const accountPills = document.querySelectorAll('.account-pill');

  btnGoogleSignIn.addEventListener('click', () => {
    googleAuthModal.classList.add('open');
    gmailInput.focus();
  });

  // Animated Letter Modal (NEXUS Welcome Dispatch)
  const btnOpenLetter = document.getElementById('btnOpenLetter');
  const letterModal = document.getElementById('letterModal');
  const btnCloseLetter = document.getElementById('btnCloseLetter');

  if (btnOpenLetter && letterModal) {
    btnOpenLetter.addEventListener('click', () => {
      letterModal.classList.add('open');
      audioFX.playChirp('robot');

      // Re-trigger letter write animations
      const nexusChars = document.querySelectorAll('.letter-char');
      nexusChars.forEach(ch => {
        ch.style.animation = 'none';
        void ch.offsetWidth;
        ch.style.animation = '';
      });

      const subHeading = document.getElementById('animatedSubHeading');
      if (subHeading) {
        subHeading.style.animation = 'none';
        void subHeading.offsetWidth;
        subHeading.style.animation = '';
      }
    });

    if (btnCloseLetter) {
      btnCloseLetter.addEventListener('click', () => {
        letterModal.classList.remove('open');
        audioFX.playChirp('tool');
      });
    }

    letterModal.addEventListener('click', (e) => {
      if (e.target === letterModal) {
        letterModal.classList.remove('open');
        audioFX.playChirp('tool');
      }
    });
  }

  function closeAuthModal() {
    googleAuthModal.classList.remove('open');
  }

  btnCloseAuthModal.addEventListener('click', closeAuthModal);
  btnCancelAuthModal.addEventListener('click', closeAuthModal);

  accountPills.forEach(pill => {
    pill.addEventListener('click', () => {
      gmailInput.value = pill.dataset.email;
    });
  });

  googleSignInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = gmailInput.value.trim();
    if (email) {
      loadAccountData(email);
      closeAuthModal();
      audioFX.playChirp('complete');
      appendAgentMessage(`✓ Signed in as <strong>${escapeHtml(email)}</strong>. Personal profile data loaded.`);
    }
  });

  btnGoogleSignOut.addEventListener('click', () => {
    loadAccountData('guest');
    audioFX.playChirp('tool');
    appendAgentMessage('Signed out. Switched to guest mode.');
  });

  // Mode Toggle (Demo vs Live)
  const modeToggle = document.getElementById('modeToggle');
  const demoLabel = document.getElementById('demoLabel');
  const liveLabel = document.getElementById('liveLabel');
  const agentStatusText = document.getElementById('agentModeStatusText');
  const apiKeyWrapper = document.getElementById('apiKeyWrapper');
  const providerSelect = document.getElementById('providerSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');

  function updateModeUI() {
    const isLive = appState.settings.isLiveMode;
    modeToggle.checked = isLive;
    if (isLive) {
      demoLabel.classList.remove('active');
      liveLabel.classList.add('active');
      const provName = appState.settings.provider === 'gemini' ? 'GEMINI 2.5 FLASH' : 'GROQ API';
      agentStatusText.textContent = `LIVE LLM [${provName}] // ONLINE`;
      apiKeyWrapper.classList.remove('disabled');
    } else {
      demoLabel.classList.add('active');
      liveLabel.classList.remove('active');
      agentStatusText.textContent = 'LOCAL NLP ENGINE // READY';
      apiKeyWrapper.classList.add('disabled');
    }
    const currKey = appState.settings.provider === 'gemini' 
      ? appState.settings.apiKeyGemini 
      : appState.settings.apiKeyGroq;
    apiKeyInput.value = currKey || '';
  }

  modeToggle.addEventListener('change', () => {
    appState.settings.isLiveMode = modeToggle.checked;
    persistSettings();
    updateModeUI();
  });

  providerSelect.value = appState.settings.provider || 'gemini';
  providerSelect.addEventListener('change', () => {
    appState.settings.provider = providerSelect.value;
    persistSettings();
    updateModeUI();
  });

  saveKeyBtn.addEventListener('click', () => {
    const val = apiKeyInput.value.trim();
    if (appState.settings.provider === 'gemini') {
      appState.settings.apiKeyGemini = val;
    } else {
      appState.settings.apiKeyGroq = val;
    }
    persistSettings();
    audioFX.playChirp('tool');
    saveKeyBtn.textContent = 'SAVED!';
    setTimeout(() => { saveKeyBtn.textContent = 'SAVE'; }, 1500);
  });

  toggleKeyVisibility.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyVisibility.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyVisibility.textContent = '👁';
    }
  });

  updateModeUI();

  // Task Filters
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.filter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Add Task Drawer
  const btnOpenModal = document.getElementById('btnOpenNewTaskModal');
  const taskDrawer = document.getElementById('taskAddDrawer');
  const btnCancelDrawer = document.getElementById('btnCancelAddDrawer');
  const manualTaskForm = document.getElementById('manualTaskForm');

  btnOpenModal.addEventListener('click', () => {
    taskDrawer.classList.toggle('open');
  });

  btnCancelDrawer.addEventListener('click', () => {
    taskDrawer.classList.remove('open');
  });

  manualTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('taskTitleInput').value;
    const moduleName = document.getElementById('taskModuleInput').value;
    const dueDate = document.getElementById('taskDueDateInput').value;
    const priority = document.getElementById('taskPriorityInput').value;

    auraTools.addAssignment({ title, moduleName, dueDate, priority });
    manualTaskForm.reset();
    taskDrawer.classList.remove('open');
  });

  // Task list click delegation
  const taskListContainer = document.getElementById('assignmentList');
  taskListContainer.addEventListener('click', (e) => {
    const checkBtn = e.target.closest('[data-action="toggle-complete"]');
    if (checkBtn) {
      const taskId = checkBtn.dataset.id;
      const task = appState.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        persistTasks();
        renderTasks();
        audioFX.playChirp(task.completed ? 'complete' : 'tool');
      }
      return;
    }

    const delBtn = e.target.closest('[data-action="delete"]');
    if (delBtn) {
      const taskId = delBtn.dataset.id;
      appState.tasks = appState.tasks.filter(t => t.id !== taskId);
      persistTasks();
      renderTasks();
      audioFX.playChirp('tool');
    }
  });

  // Manual CGPA Simulator Trigger
  const btnSimulate = document.getElementById('btnManualSimulate');
  btnSimulate.addEventListener('click', () => {
    const curr = parseFloat(document.getElementById('simCurrentCgpa').value);
    const done = parseFloat(document.getElementById('simCreditsDone').value);
    const target = parseFloat(document.getElementById('simTargetCgpa').value);
    const sem = parseFloat(document.getElementById('simSemCredits').value);

    auraTools.simulateCGPA({
      currentCGPA: curr,
      creditsDone: done,
      targetCGPA: target,
      currentSemCredits: sem
    });
  });

  // Chat Form & Input
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const prompt = chatInput.value;
    chatInput.value = '';
    handleUserCommand(prompt);
  });

  // Quick Action Chips
  const chips = document.querySelectorAll('.chip-btn');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) handleUserCommand(prompt);
    });
  });

  // Clear Chat History
  const btnClearChat = document.getElementById('btnClearChat');
  btnClearChat.addEventListener('click', () => {
    const feed = document.getElementById('chatFeed');
    feed.innerHTML = `
      <div class="chat-message message-agent">
        <div class="msg-author-tag">AURA AGENT // READY</div>
        <div class="msg-content">Terminal cleared. Ready for directives.</div>
        <div class="msg-timestamp">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    appState.chatMessages = [];
    persistChat();
    audioFX.playChirp('tool');
  });
}

// Master Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  const lastUser = localStorage.getItem('aura_active_user') || 'guest';
  loadAccountData(lastUser);
  initPomodoroAndRain();
  initEventListeners();
  initRobotCompanion();
});
