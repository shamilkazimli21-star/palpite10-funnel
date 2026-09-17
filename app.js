/* ============================================
   PALPITE10 FUNNEL LOGIC
   ============================================ */

const TELEGRAM_FREE = 'https://t.me/palpite10gratis';
const TELEGRAM_VIP  = 'https://t.me/palpite10vipbot';
const COUNTDOWN_START = 8;
const FALLBACK_AT = 6;

/* ---------- QUIZ DATA ---------- */
const QUESTIONS = {
  1: {
    text: 'Com que frequência você acompanha futebol?',
    answers: [
      { id: 'q1_a1', text: 'Todo dia' },
      { id: 'q1_a2', text: 'Algumas vezes por semana' },
      { id: 'q1_a3', text: 'Só nos fins de semana' },
      { id: 'q1_a4', text: 'Quase nunca, mas quero começar' }
    ]
  },
  2: {
    text: 'O que mais importa para você em uma análise?',
    answers: [
      { id: 'q2_a1', text: 'Resultados verificados' },
      { id: 'q2_a2', text: 'Análises honestas' },
      { id: 'q2_a3', text: 'Grandes acertos, não pequenos' },
      { id: 'q2_a4', text: 'Uma comunidade real' }
    ]
  },
  3: {
    text: 'Se você pudesse ter um mês excepcional, o que faria?',
    answers: [
      { id: 'q3_a1', text: 'Pagar dívidas' },
      { id: 'q3_a2', text: 'Investir ou guardar' },
      { id: 'q3_a3', text: 'Viajar' },
      { id: 'q3_a4', text: 'Cuidar da família' }
    ]
  },
  4: {
    text: 'Você usa o Telegram no dia a dia?',
    answers: [
      { id: 'q4_a1', text: 'Sim, uso todos os dias', route: 'qualified' },
      { id: 'q4_a2', text: 'Sim, mas uso de vez em quando', route: 'qualified' },
      { id: 'q4_a3', text: 'Tenho conta mas quase não abro', route: 'borderline' },
      { id: 'q4_a4', text: 'Não tenho Telegram', route: 'disqualified' }
    ]
  }
};

/* ---------- HAPTIC ---------- */
function haptic() {
  if ('vibrate' in navigator) navigator.vibrate(10);
}

/* ---------- TRACKING ---------- */
function trackCustom(event, payload) {
  if (typeof fbq !== 'undefined') fbq('trackCustom', event, payload);
  if (typeof gtag !== 'undefined') gtag('event', event, payload);
}
function trackLead(value, label) {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', { content_name: label, value, currency: 'BRL' });
  }
  if (typeof gtag !== 'undefined') {
    gtag('event', 'generate_lead', { value, label });
  }
}

/* ---------- ROUTER ---------- */
function navigate(path, replace = false) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  render(path);
}

function render(path) {
  const [urlPath, query] = path.split('?');
  const params = new URLSearchParams(query || '');
  const e = params.get('e');
  const a = params.get('a');
  const q = params.get('q');

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Route
  if (urlPath === '/' || urlPath === '') {
    showScreen('screen-landing');
    trackCustom('lp_view');
  } else if (urlPath.startsWith('/quiz/')) {
    const num = parseInt(urlPath.split('/')[2]);
    showScreen('screen-quiz');
    renderQuiz(num, e, a);
  } else if (urlPath === '/obrigado') {
    showScreen('screen-thankyou');
    runThankYou(q, e);
  } else if (urlPath === '/desqualificado') {
    showScreen('screen-disqualified');
    trackCustom('disqualified_view');
    trackLead(1.0, 'Palpite10 Free Access (Disqualified)');
  } else {
    showScreen('screen-landing');
  }

  window.scrollTo(0, 0);
}

function showScreen(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ---------- QUIZ RENDER ---------- */
let currentQ = 1;

function renderQuiz(num, lastEvent, lastAnswer) {
  currentQ = num;
  const q = QUESTIONS[num];
  if (!q) return;

  // Progress
  document.getElementById('step-text').textContent = `Etapa ${num} de 4`;
  document.getElementById('progress-fill').style.width = `${num * 25}%`;

  // Question
  document.getElementById('question-text').textContent = q.text;

  // Answers
  const list = document.getElementById('answers-list');
  list.innerHTML = '';
  q.answers.forEach(ans => {
    const btn = document.createElement('button');
    btn.className = 'answer-card';
    btn.innerHTML = `<span>${ans.text}</span><span class="chev">›</span>`;
    btn.addEventListener('click', () => handleAnswer(num, ans));
    list.appendChild(btn);
  });
}

function handleAnswer(num, ans) {
  haptic();
  // Visual feedback
  event.currentTarget.classList.add('selected');

  // Track custom event
  trackCustom(`q${num}_answered`, { answer: ans.id });

  // Special tracking on Q4
  if (num === 4) {
    if (ans.route === 'qualified') trackCustom('qualified_lead');
    else if (ans.route === 'borderline') trackCustom('borderline_lead');
    else if (ans.route === 'disqualified') trackCustom('disqualified_lead');
  }

  // Route
  setTimeout(() => {
    if (num < 4) {
      navigate(`/quiz/${num + 1}?e=q${num}_answered&a=${ans.id}`);
    } else {
      if (ans.route === 'qualified') {
        navigate(`/obrigado?e=q4_answered&a=${ans.id}&q=qualified`);
      } else if (ans.route === 'borderline') {
        navigate(`/obrigado?e=q4_answered&a=${ans.id}&q=borderline`);
      } else {
        navigate(`/desqualificado?e=q4_answered&a=${ans.id}&q=disqualified`);
      }
    }
  }, 150);
}

/* ---------- THANK YOU ---------- */
let countdownTimer = null;

function runThankYou(q, lastEvent) {
  const isBorderline = q === 'borderline';
  const value = isBorderline ? 3.0 : 5.0;
  const label = isBorderline ? 'Palpite10 Free Access (Borderline)' : 'Palpite10 Free Access (Qualified)';

  // Customise subheadline for borderline
  if (isBorderline) {
    document.getElementById('thankyou-sub').textContent =
      'Sabemos que você usa o Telegram de vez em quando. Depois de entrar, você vai querer abrir todos os dias. Os palpites chegam em tempo real.';
  } else {
    document.getElementById('thankyou-sub').textContent =
      'Preparando seu acesso ao canal gratuito...';
  }

  // Fire Lead with callback
  trackLead(value, label);
  trackCustom('thankyou_view');

  // Reset countdown
  if (countdownTimer) clearInterval(countdownTimer);
  let seconds = COUNTDOWN_START;
  const countEl = document.getElementById('countdown');
  const ringEl = document.getElementById('ring-progress');
  const btn = document.getElementById('telegram-btn');
  btn.style.display = 'none';
  countEl.textContent = seconds;
  ringEl.style.strokeDashoffset = '0';

  countdownTimer = setInterval(() => {
    seconds--;
    countEl.textContent = seconds;

    // Animate ring
    const progress = (COUNTDOWN_START - seconds) / COUNTDOWN_START;
    ringEl.style.strokeDashoffset = `${289 * progress}`;

    // Show fallback
    if (seconds === FALLBACK_AT) btn.style.display = 'block';

    // Redirect
    if (seconds <= 0) {
      clearInterval(countdownTimer);
      trackCustom('telegram_redirect');
      setTimeout(() => { window.location.href = TELEGRAM_FREE; }, 300);
    }
  }, 1000);
}

/* ---------- GLOBAL EVENT LISTENERS ---------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-nav]');
  if (btn) {
    e.preventDefault();
    haptic();
    const path = btn.getAttribute('data-nav');
    const evt = btn.getAttribute('data-event');
    if (evt) trackCustom(evt);
    navigate(path);
  }
});

document.getElementById('telegram-btn').addEventListener('click', () => {
  haptic();
  trackCustom('telegram_click');
  window.open(TELEGRAM_FREE, '_blank');
});

document.getElementById('vip-link').addEventListener('click', () => {
  trackCustom('vip_click');
});
document.getElementById('vip-link-2').addEventListener('click', () => {
  trackCustom('vip_click');
});

document.getElementById('download-telegram').addEventListener('click', () => {
  haptic();
  trackCustom('telegram_download_click');
  const ua = navigator.userAgent;
  let url = 'https://telegram.org/dl';
  if (/iPad|iPhone|iPod/.test(ua)) url = 'https://apps.apple.com/app/telegram-messenger/id686449807';
  else if (/android/i.test(ua)) url = 'https://play.google.com/store/apps/details?id=org.telegram.messenger';
  window.open(url, '_blank');
});

document.querySelector('.back-btn').addEventListener('click', () => {
  haptic();
  history.back();
});

/* ---------- BOOT ---------- */
window.addEventListener('popstate', () => render(window.location.pathname + window.location.search));
window.addEventListener('load', () => {
  render(window.location.pathname + window.location.search);
});
