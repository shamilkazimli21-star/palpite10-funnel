/* =========================================================
   PALPITE10 FUNNEL
   app.js
   ========================================================= */

"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
  pixelId: "",
  ga4Id: "",
  telegramFreeUrl: "https://t.me/palpite10gratis",
  telegramVipUrl: "https://t.me/palpite10vipbot",
  telegramIosUrl: "https://apps.apple.com/app/telegram-messenger/id686449807",
  telegramAndroidUrl: "https://play.google.com/store/apps/details?id=org.telegram.messenger"
};


/* =========================================================
   STATE
   ========================================================= */

const STORAGE_KEY = "palpite10_quiz";

const state = {
  answers: {},
  startedAt: null,
  completedAt: null,
  qualification: null
};

let previousRoute = "/";
let countdownTimer = null;
let countdownRedirectTimer = null;


/* =========================================================
   QUIZ DATA
   ========================================================= */

const quizQuestions = {
  1: {
    question: "Com que frequência você acompanha futebol?",
    answers: [
      {
        id: "q1_a1",
        text: "Todo dia"
      },
      {
        id: "q1_a2",
        text: "Algumas vezes por semana"
      },
      {
        id: "q1_a3",
        text: "Só nos fins de semana"
      },
      {
        id: "q1_a4",
        text: "Quase nunca, mas quero começar"
      }
    ]
  },

  2: {
    question: "O que mais importa para você em uma análise?",
    answers: [
      {
        id: "q2_a1",
        text: "Resultados verificados"
      },
      {
        id: "q2_a2",
        text: "Análises honestas"
      },
      {
        id: "q2_a3",
        text: "Grandes acertos, não pequenos"
      },
      {
        id: "q2_a4",
        text: "Uma comunidade real"
      }
    ]
  },

  3: {
    question: "Se você pudesse ter um mês excepcional, o que faria?",
    answers: [
      {
        id: "q3_a1",
        text: "Pagar dívidas"
      },
      {
        id: "q3_a2",
        text: "Investir ou guardar"
      },
      {
        id: "q3_a3",
        text: "Viajar"
      },
      {
        id: "q3_a4",
        text: "Cuidar da família"
      }
    ]
  },

  4: {
    question: "Você usa o Telegram no dia a dia?",
    answers: [
      {
        id: "q4_a1",
        text: "Sim, uso todos os dias"
      },
      {
        id: "q4_a2",
        text: "Sim, mas uso de vez em quando"
      },
      {
        id: "q4_a3",
        text: "Tenho conta mas quase não abro"
      },
      {
        id: "q4_a4",
        text: "Não tenho Telegram"
      }
    ]
  }
};


/* =========================================================
   DOM
   ========================================================= */

const app = document.getElementById("app");
const loading = document.getElementById("app-loading");


/* =========================================================
   UTILITIES
   ========================================================= */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function generateEventId() {
  return `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}


function getCookie(name) {
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
      name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") +
      "=([^;]*)"
    )
  );

  return match ? decodeURIComponent(match[1]) : null;
}


function haptic() {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore unsupported vibration implementations.
    }
  }
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getRoute() {
  return {
    path: window.location.pathname,
    params: new URLSearchParams(window.location.search)
  };
}


function isInternalPath(path) {
  return (
    path === "/" ||
    /^\/quiz\/[1-4]$/.test(path) ||
    path === "/obrigado" ||
    path === "/desqualificado"
  );
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    const parsed = JSON.parse(saved);

    if (parsed && typeof parsed === "object") {
      state.answers = parsed.answers || {};
      state.startedAt = parsed.startedAt || null;
      state.completedAt = parsed.completedAt || null;
      state.qualification = parsed.qualification || null;
    }
  } catch (error) {
    console.warn("Could not load quiz state.", error);
  }
}


function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.warn("Could not save quiz state.", error);
  }
}


function resetState() {
  state.answers = {};
  state.startedAt = null;
  state.completedAt = null;
  state.qualification = null;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}


/* =========================================================
   CONFIGURATION FROM VERCEL
   ========================================================= */

/*
  Public configuration is retrieved from /api/track.

  The endpoint returns:
    META_PIXEL_ID
    GA4_ID
    TELEGRAM_FREE_URL
    TELEGRAM_VIP_URL

  It NEVER returns META_ACCESS_TOKEN.
*/

async function loadPublicConfig() {
  try {
    const response = await fetch("/api/track", {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Config request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.pixelId) {
      CONFIG.pixelId = data.pixelId;
    }

    if (data.ga4Id) {
      CONFIG.ga4Id = data.ga4Id;
    }

    if (data.telegramFreeUrl) {
      CONFIG.telegramFreeUrl = data.telegramFreeUrl;
    }

    if (data.telegramVipUrl) {
      CONFIG.telegramVipUrl = data.telegramVipUrl;
    }

    if (data.telegramIosUrl) {
      CONFIG.telegramIosUrl = data.telegramIosUrl;
    }

    if (data.telegramAndroidUrl) {
      CONFIG.telegramAndroidUrl = data.telegramAndroidUrl;
    }
  } catch (error) {
    console.warn(
      "Public configuration could not be loaded. Defaults will be used.",
      error
    );
  }
}


/* =========================================================
   META PIXEL
   ========================================================= */

function initializePixel() {
  if (!CONFIG.pixelId) {
    console.warn("META_PIXEL_ID is not configured.");
    return;
  }

  if (typeof window.fbq === "function") {
    return;
  }

  !(function(f, b, e, v, n, t, s) {
    if (f.fbq) {
      return;
    }

    n = f.fbq = function() {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };

    if (!f._fbq) {
      f._fbq = n;
    }

    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    t = b.createElement(e);
    t.async = true;
    t.src = v;

    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  window.fbq("init", CONFIG.pixelId);

  window.fbq("track", "PageView");
}


/* =========================================================
   GA4
   ========================================================= */

function initializeGA4() {
  if (!CONFIG.ga4Id) {
    console.warn("GA4_ID is not configured.");
    return;
  }

  if (typeof window.gtag === "function") {
    return;
  }

  const script = document.createElement("script");

  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CONFIG.ga4Id)}`;

  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];

  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());

  window.gtag("config", CONFIG.ga4Id, {
    send_page_view: false
  });
}


/* =========================================================
   PIXEL EVENT
   ========================================================= */

function firePixel(
  eventName,
  params = {},
  isCustom = false
) {
  if (typeof window.fbq !== "function") {
    return;
  }

  const payload = {
    ...params,
    eventID: params.event_id
  };

  if (isCustom) {
    window.fbq(
      "trackCustom",
      eventName,
      payload
    );
  } else {
    window.fbq(
      "track",
      eventName,
      payload
    );
  }
}


/* =========================================================
   CAPI
   ========================================================= */

async function fireCAPI(
  eventName,
  params = {},
  isCustom = false
) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event_name: eventName,
        event_id: params.event_id,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: window.location.href,
        action_source: "website",
        is_custom: isCustom,

        custom_data: {
          ...params
        }
      }),

      keepalive: true
    });
  } catch (error) {
    console.warn(
      "CAPI event failed.",
      error
    );
  }
}


/* =========================================================
   GA4 EVENT
   ========================================================= */

function fireGA4(
  eventName,
  params = {}
) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag(
    "event",
    eventName,
    params
  );
}


/* =========================================================
   COMBINED TRACKING
   ========================================================= */

function track(
  eventName,
  params = {},
  isCustom = false
) {
  const event_id = generateEventId();

  const enriched = {
    ...params,
    event_id
  };

  firePixel(
    eventName,
    enriched,
    isCustom
  );

  fireCAPI(
    eventName,
    enriched,
    isCustom
  );

  fireGA4(
    eventName,
    enriched
  );

  return event_id;
}


/* =========================================================
   LEAD
   ========================================================= */

function fireLead(
  value,
  label
) {
  const event_id = generateEventId();

  const params = {
    content_name: label,
    content_category: "Football Predictions",
    value,
    currency: "BRL",
    event_id
  };

  if (typeof window.fbq === "function") {
    window.fbq(
      "track",
      "Lead",
      params,
      function() {
        console.log(
          "Lead pixel confirmed",
          event_id
        );
      }
    );
  }

  fireCAPI(
    "Lead",
    params,
    false
  );

  fireGA4(
    "generate_lead",
    {
      value,
      currency: "BRL",
      label
    }
  );
}


/* =========================================================
   ROUTING
   ========================================================= */

function navigate(
  path,
  options = {}
) {
  const {
    replace = false,
    direction = "forward"
  } = options;

  haptic();

  previousRoute = window.location.pathname;

  if (replace) {
    history.replaceState(
      {},
      "",
      path
    );
  } else {
    history.pushState(
      {},
      "",
      path
    );
  }

  renderRoute(direction);
}


function router() {
  renderRoute("forward");
}


function renderRoute(direction = "forward") {
  clearCountdown();

  const {
    path,
    params
  } = getRoute();

  if (path === "/") {
    renderLanding(direction);
    return;
  }

  if (/^\/quiz\/[1-4]$/.test(path)) {
    const questionNumber =
      Number(path.split("/")[2]);

    renderQuiz(
      questionNumber,
      direction
    );

    return;
  }

  if (path === "/obrigado") {
    renderThankYou(
      params.get("q"),
      direction
    );

    return;
  }

  if (path === "/desqualificado") {
    renderDisqualified(direction);
    return;
  }

  navigate("/", {
    replace: true,
    direction: "back"
  });
}


/* =========================================================
   PAGE WRAPPER
   ========================================================= */

function pageTemplate(
  content,
  classes = "",
  direction = "forward"
) {
  return `
    <section
      class="page ${classes}"
      data-direction="${escapeHTML(direction)}"
    >
      <div class="route-stage ${escapeHTML(direction)}">
        ${content}
      </div>
    </section>
  `;
}


function footerTemplate() {
  return `
    <footer class="page-footer">
      <p class="footer">
        Conteúdo informativo sobre futebol.
        Para maiores de 18 anos.
      </p>
    </footer>
  `;
}


/* =========================================================
   BRAND
   ========================================================= */

function brandTemplate() {
  return `
    <div class="brand">
      <span class="brand-mark">10</span>
      <span>PALPITE10</span>
    </div>
  `;
}


/* =========================================================
   LANDING
   ========================================================= */

function renderLanding(direction = "forward") {
  app.innerHTML = pageTemplate(
    `
      <div class="container landing-main">

        ${brandTemplate()}

        <main class="hero">

          <div class="badge">
            <span class="badge-dot"></span>
            Método com histórico comprovado
          </div>

          <h1 class="hero-title">
            3 Palpites de Futebol
            Grátis Toda Semana.
            <span class="hero-highlight">
              80% de Acerto.
            </span>
          </h1>

          <p class="hero-subtitle">
            Junte-se a mais de 2.000 torcedores brasileiros
            que recebem análises reais e documentadas toda semana.
            Sem prints falsos. Sem promessas vazias. Apenas método.
          </p>

          <div class="hero-actions">
            <button
              type="button"
              class="primary-button"
              id="start-quiz"
              aria-label="Começar meu acesso grátis"
            >
              Começar Meu Acesso Grátis →
            </button>

            <p class="microcopy hero-microcopy">
              Leva menos de 30 segundos. 100% grátis.
            </p>
          </div>

          <div class="trust-bar" aria-label="Indicadores do Palpite10">

            <div class="trust-item">
              <div class="trust-icon">✓</div>
              <div class="trust-value">80% de Acerto</div>
              <div class="trust-label">Histórico</div>
            </div>

            <div class="trust-item">
              <div class="trust-icon">+</div>
              <div class="trust-value">2.000 Membros</div>
              <div class="trust-label">Comunidade</div>
            </div>

            <div class="trust-item">
              <div class="trust-icon">4</div>
              <div class="trust-value">4 Anos</div>
              <div class="trust-label">Resultados</div>
            </div>

          </div>

        </main>

        ${footerTemplate()}

      </div>
    `,
    "landing-page",
    direction
  );

  const startButton =
    document.getElementById("start-quiz");

  if (startButton) {
    startButton.addEventListener(
      "touchstart",
      haptic,
      { passive: true }
    );

    startButton.addEventListener(
      "click",
      startQuiz
    );
  }

  if (!state.startedAt) {
    track(
      "ViewContent",
      {
        content_name: "Palpite10 Landing"
      },
      false
    );
  }
}


function startQuiz() {
  haptic();

  if (!state.startedAt) {
    state.startedAt = new Date().toISOString();
    saveState();
  }

  track(
    "InitiateCheckout",
    {
      content_name: "Quiz Start"
    },
    false
  );

  navigate("/quiz/1");
}


/* =========================================================
   QUIZ
   ========================================================= */

function renderQuiz(
  questionNumber,
  direction = "forward"
) {
  const question =
    quizQuestions[questionNumber];

  if (!question) {
    navigate("/");
    return;
  }

  const progress =
    (questionNumber / 4) * 100;

  const selectedAnswer =
    state.answers[questionNumber];

  app.innerHTML = pageTemplate(
    `
      <div class="container quiz-page">

        <header class="quiz-top">

          <div class="quiz-header">

            ${
              questionNumber > 1
                ? `
                  <button
                    type="button"
                    class="back-button"
                    id="quiz-back"
                    aria-label="Voltar para pergunta anterior"
                  >
                    ← Voltar
                  </button>
                `
                : `
                  <span></span>
                `
            }

            <span class="quiz-counter">
              Pergunta ${questionNumber} de 4
            </span>

          </div>

          <div
            class="quiz-progress"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${progress}"
            aria-label="Progresso do quiz"
          >
            <div
              class="quiz-progress-fill"
              style="width: ${progress}%"
            ></div>
          </div>

        </header>

        <main class="quiz-content">

          <h1 class="quiz-question">
            ${escapeHTML(question.question)}
          </h1>

          <p class="quiz-subtitle">
            Escolha uma opção para continuar.
          </p>

          <div
            class="answer-grid"
            role="group"
            aria-label="Opções de resposta"
          >

            ${question.answers.map(answer => `
              <button
                type="button"
                class="answer-card ${
                  selectedAnswer === answer.id
                    ? "selected"
                    : ""
                }"
                data-answer-id="${escapeHTML(answer.id)}"
                aria-label="${escapeHTML(answer.text)}"
              >
                ${escapeHTML(answer.text)}
              </button>
            `).join("")}

          </div>

        </main>

        ${footerTemplate()}

      </div>
    `,
    "quiz-page",
    direction
  );

  const backButton =
    document.getElementById("quiz-back");

  if (backButton) {
    backButton.addEventListener(
      "click",
      () => {
        haptic();

        navigate(
          `/quiz/${questionNumber - 1}`,
          {
            direction: "back"
          }
        );
      }
    );
  }

  document
    .querySelectorAll(".answer-card")
    .forEach(button => {

      button.addEventListener(
        "touchstart",
        haptic,
        { passive: true }
      );

      button.addEventListener(
        "click",
        () => {
          handleAnswer(
            questionNumber,
            button.dataset.answerId
          );
        }
      );
    });
}


/* =========================================================
   ANSWERS
   ========================================================= */

function handleAnswer(
  questionNumber,
  answerId
) {
  haptic();

  state.answers[questionNumber] =
    answerId;

  saveState();

  track(
    `Q${questionNumber}_Answered`,
    {
      answer: answerId
    },
    true
  );

  if (questionNumber < 4) {
    navigate(
      `/quiz/${questionNumber + 1}`,
      {
        direction: "forward"
      }
    );

    return;
  }

  handleQualification(answerId);
}


function handleQualification(answerId) {
  let qualification;

  switch (answerId) {
    case "q4_a1":
    case "q4_a2":
      qualification = "qualified";
      break;

    case "q4_a3":
      qualification = "borderline";
      break;

    case "q4_a4":
      qualification = "disqualified";
      break;

    default:
      qualification = "disqualified";
  }

  state.qualification =
    qualification;

  state.completedAt =
    new Date().toISOString();

  saveState();

  if (qualification === "qualified") {
    track(
      "Qualified_Lead",
      {},
      true
    );

    navigate(
      "/obrigado?q=qualified"
    );

    return;
  }

  if (qualification === "borderline") {
    track(
      "Borderline_Lead",
      {},
      true
    );

    navigate(
      "/obrigado?q=borderline"
    );

    return;
  }

  track(
    "Disqualified_Lead",
    {},
    true
  );

  navigate(
    "/desqualificado"
  );
}


/* =========================================================
   THANK YOU
   ========================================================= */

function renderThankYou(
  qualification,
  direction = "forward"
) {
  const type =
    qualification === "borderline"
      ? "borderline"
      : "qualified";

  const subtitle =
    type === "borderline"
      ? `
        Sabemos que você usa o Telegram de vez em quando.
        Depois de entrar, você vai querer abrir todos os dias.
        Os palpites chegam em tempo real e valem a pena.
      `
      : `
        Preparando seu acesso ao canal gratuito...
      `;

  app.innerHTML = pageTemplate(
    `
      <div class="container center-page">

        <main class="center-content">

          <div
            class="confirmation-icon"
            aria-label="Confirmado"
          >
            ✓
          </div>

          <h1 class="center-title">
            Você Está Dentro.
          </h1>

          <p class="center-subtitle">
            ${subtitle}
          </p>

          <div class="countdown-wrap">

            <div class="countdown-label">
              Abrindo Telegram em
            </div>

            <div
              class="countdown"
              aria-live="polite"
              aria-label="Contagem regressiva"
            >

              <svg
                class="countdown-ring"
                viewBox="0 0 152 152"
                aria-hidden="true"
              >
                <circle
                  class="countdown-track"
                  cx="76"
                  cy="76"
                  r="67"
                />

                <circle
                  class="countdown-progress"
                  id="countdown-progress"
                  cx="76"
                  cy="76"
                  r="67"
                />
              </svg>

              <span
                class="countdown-number"
                id="countdown"
              >
                8
              </span>

            </div>

            <p class="countdown-hint">
              Se não abrir automaticamente,
              use o botão abaixo.
            </p>

            <div class="telegram-button" id="telegram-button">
              <button
                type="button"
                class="primary-button"
                id="telegram-btn"
              >
                👉 Abrir Telegram Agora
              </button>
            </div>

          </div>

          ${vipCardTemplate()}

        </main>

        ${footerTemplate()}

      </div>
    `,
    "center-page",
    direction
  );

  const telegramButton =
    document.getElementById("telegram-btn");

  if (telegramButton) {
    telegramButton.addEventListener(
      "touchstart",
      haptic,
      { passive: true }
    );

    telegramButton.addEventListener(
      "click",
      () => {
        haptic();

        track(
          "Telegram_Click",
          {},
          true
        );

        openTelegram();
      }
    );
  }

  const vipLink =
    document.getElementById("vip-link");

  if (vipLink) {
    vipLink.addEventListener(
      "click",
      () => {
        track(
          "VIP_Click",
          {},
          true
        );
      }
    );
  }

  /*
    Lead fires immediately when the thank-you page
    is rendered.
  */
  fireLead(
    type === "qualified"
      ? 5
      : 3,
    "Palpite10 Free Access"
  );

  startCountdown();
}


/* =========================================================
   VIP CARD
   ========================================================= */

function vipCardTemplate() {
  return `
    <aside class="vip-card">

      <div class="vip-label">
        VIP
      </div>

      <h2 class="vip-title">
        Quer a experiência completa?
      </h2>

      <p class="vip-description">
        Membros VIP recebem palpites diários,
        análises completas e 80%+ de acerto.
      </p>

      <a
        href="${escapeHTML(CONFIG.telegramVipUrl)}"
        class="vip-link"
        id="vip-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        Entrar no VIP: @palpite10vipbot →
      </a>

    </aside>
  `;
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function startCountdown() {
  clearCountdown();

  let seconds = 8;

  const countdownEl =
    document.getElementById("countdown");

  const buttonEl =
    document.getElementById("telegram-button");

  const progressEl =
    document.getElementById("countdown-progress");

  if (!countdownEl) {
    return;
  }

  const radius = 67;
  const circumference =
    2 * Math.PI * radius;

  if (progressEl) {
    progressEl.style.strokeDasharray =
      `${circumference}`;

    progressEl.style.strokeDashoffset =
      "0";
  }

  countdownTimer = setInterval(() => {
    seconds--;

    countdownEl.textContent =
      String(seconds);

    if (progressEl) {
      const progress =
        seconds / 8;

      progressEl.style.strokeDashoffset =
        String(
          circumference * (1 - progress)
        );
    }

    if (seconds <= 2 && buttonEl) {
      buttonEl.classList.add(
        "is-visible"
      );
    }

    if (seconds <= 0) {
      clearCountdown();

      track(
        "Telegram_Redirect",
        {},
        true
      );

      countdownRedirectTimer =
        setTimeout(() => {
          openTelegram();
        }, 300);
    }
  }, 1000);

  /*
    Required fallback behavior:
    show the fallback at 6 seconds.
  */
  setTimeout(() => {
    if (buttonEl) {
      buttonEl.classList.add(
        "is-visible"
      );
    }
  }, 6000);
}


function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (countdownRedirectTimer) {
    clearTimeout(countdownRedirectTimer);
    countdownRedirectTimer = null;
  }
}


/* =========================================================
   TELEGRAM
   ========================================================= */

function openTelegram() {
  window.location.href =
    CONFIG.telegramFreeUrl;
}


/* =========================================================
   DEVICE DETECTION
   ========================================================= */

function getTelegramDownloadUrl() {
  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera ||
    "";

  if (/iPad|iPhone|iPod/i.test(ua)) {
    return CONFIG.telegramIosUrl;
  }

  if (/Android/i.test(ua)) {
    return CONFIG.telegramAndroidUrl;
  }

  return "https://telegram.org/dl";
}


/* =========================================================
   DISQUALIFIED
   ========================================================= */

function renderDisqualified(
  direction = "forward"
) {
  app.innerHTML = pageTemplate(
    `
      <div class="container center-page">

        <main class="center-content">

          <div
            class="neutral-icon"
            aria-hidden="true"
          >
            ✈
          </div>

          <h1 class="center-title">
            Tudo Bem.
            O Telegram é Necessário.
          </h1>

          <p class="center-subtitle">
            Nossos palpites diários são entregues via Telegram
            porque é a forma mais rápida e segura de receber
            o conteúdo em tempo real. Sem o aplicativo,
            não conseguimos te enviar os palpites.
          </p>

          <div class="steps">

            <section class="step-card">

              <div class="step-top">

                <div class="step-number">
                  1
                </div>

                <h2 class="step-title">
                  Baixe o Telegram.
                  É grátis e leva 30 segundos.
                </h2>

              </div>

              <p class="step-description">
                Instale o aplicativo oficial no seu celular
                e depois volte para esta página.
              </p>

              <a
                href="${escapeHTML(getTelegramDownloadUrl())}"
                class="secondary-button"
                id="telegram-download"
                target="_blank"
                rel="noopener noreferrer"
              >
                Baixar Telegram
              </a>

            </section>


            <section class="step-card">

              <div class="step-top">

                <div class="step-number">
                  2
                </div>

                <h2 class="step-title">
                  Depois de instalar,
                  volte aqui e clique abaixo.
                </h2>

              </div>

              <a
                href="/obrigado?e=retry&q=qualified"
                class="primary-button"
                id="retry-access"
              >
                Já Instalei. Quero Meu Acesso →
              </a>

            </section>

          </div>

          ${vipCardTemplate()}

        </main>

        ${footerTemplate()}

      </div>
    `,
    "center-page",
    direction
  );

  const download =
    document.getElementById(
      "telegram-download"
    );

  if (download) {
    download.addEventListener(
      "click",
      () => {
        haptic();

        track(
          "Telegram_Download_Click",
          {
            device: getDeviceType()
          },
          true
        );
      }
    );
  }

  const retry =
    document.getElementById(
      "retry-access"
    );

  if (retry) {
    retry.addEventListener(
      "click",
      event => {
        event.preventDefault();

        haptic();

        navigate(
          "/obrigado?e=retry&q=qualified"
        );
      }
    );
  }

  const vipLink =
    document.getElementById("vip-link");

  if (vipLink) {
    vipLink.addEventListener(
      "click",
      () => {
        track(
          "VIP_Click",
          {},
          true
        );
      }
    );
  }

  fireLead(
    1,
    "Palpite10 Free Access (Disqualified)"
  );
}


function getDeviceType() {
  const ua = navigator.userAgent || "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "ios";
  }

  if (/Android/i.test(ua)) {
    return "android";
  }

  return "desktop";
}


/* =========================================================
   POPSTATE
   ========================================================= */

window.addEventListener(
  "popstate",
  () => {
    renderRoute("back");
  }
);


/* =========================================================
   TOUCH FEEDBACK
   ========================================================= */

document.addEventListener(
  "touchstart",
  event => {
    const target =
      event.target.closest(
        "button, a"
      );

    if (target) {
      target.classList.add(
        "touch-active"
      );
    }
  },
  {
    passive: true
  }
);

document.addEventListener(
  "touchend",
  event => {
    const target =
      event.target.closest(
        "button, a"
      );

    if (target) {
      target.classList.remove(
        "touch-active"
      );
    }
  },
  {
    passive: true
  }
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initialize() {
  loadState();

  await loadPublicConfig();

  initializePixel();

  initializeGA4();

  if (loading) {
    loading.remove();
  }

  renderRoute("forward");
}


initialize();
