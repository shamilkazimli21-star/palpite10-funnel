/* =========================================================
   PALPITE10
   api/track.js

   GET:
     Returns browser-safe public configuration.

   POST:
     Sends Meta Conversions API events.

   IMPORTANT:
     META_ACCESS_TOKEN NEVER reaches the browser.
   ========================================================= */

"use strict";


/* =========================================================
   CONSTANTS
   ========================================================= */

const DEFAULT_GRAPH_VERSION =
  "v24.0";


/* =========================================================
   HELPERS
   ========================================================= */

function getHeader(
  req,
  name
) {
  const value =
    req.headers?.[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value || null;
}


function getCookie(
  cookieHeader,
  name
) {
  if (!cookieHeader) {
    return null;
  }

  const parts =
    cookieHeader.split(";");

  for (const part of parts) {
    const index =
      part.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key =
      part.slice(0, index).trim();

    if (key !== name) {
      continue;
    }

    return decodeURIComponent(
      part.slice(index + 1).trim()
    );
  }

  return null;
}


function setCorsHeaders(res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
}


function json(
  res,
  status,
  payload
) {
  setCorsHeaders(res);

  res.status(status).json(payload);
}


/* =========================================================
   HANDLER
   ========================================================= */

export default async function handler(
  req,
  res
) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }


  /* =======================================================
     GET
     Public browser-safe configuration only.
     ======================================================= */

  if (req.method === "GET") {
    return json(
      res,
      200,
      {
        pixelId:
          process.env.META_PIXEL_ID || "",

        ga4Id:
          process.env.GA4_ID || "",

        telegramFreeUrl:
          process.env.TELEGRAM_FREE_URL ||
          "https://t.me/palpite10gratis",

        telegramVipUrl:
          process.env.TELEGRAM_VIP_URL ||
          "https://t.me/palpite10vipbot",

        telegramIosUrl:
          process.env.TELEGRAM_IOS_URL ||
          "https://apps.apple.com/app/telegram-messenger/id686449807",

        telegramAndroidUrl:
          process.env.TELEGRAM_ANDROID_URL ||
          "https://play.google.com/store/apps/details?id=org.telegram.messenger"
      }
    );
  }


  /* =======================================================
     POST
     Meta Conversions API
     ======================================================= */

  if (req.method !== "POST") {
    return json(
      res,
      405,
      {
        error: "Method not allowed"
      }
    );
  }


  const pixelId =
    process.env.META_PIXEL_ID;

  const accessToken =
    process.env.META_ACCESS_TOKEN;

  const testEventCode =
    process.env.META_TEST_EVENT_CODE;

  const graphVersion =
    process.env.META_GRAPH_API_VERSION ||
    DEFAULT_GRAPH_VERSION;


  if (!pixelId || !accessToken) {
    console.error(
      "Meta CAPI environment variables are missing."
    );

    return json(
      res,
      500,
      {
        error:
          "Meta CAPI is not configured."
      }
    );
  }


  let body;

  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;
  } catch {
    return json(
      res,
      400,
      {
        error: "Invalid JSON body."
      }
    );
  }


  if (!body) {
    return json(
      res,
      400,
      {
        error: "Request body is required."
      }
    );
  }


  const eventName =
    String(
      body.event_name || ""
    ).trim();

  const eventId =
    String(
      body.event_id || ""
    ).trim();

  if (!eventName || !eventId) {
    return json(
      res,
      400,
      {
        error:
          "event_name and event_id are required."
      }
    );
  }


  /* =======================================================
     Client information
     ======================================================= */

  const userAgent =
    getHeader(
      req,
      "user-agent"
    );

  const cookieHeader =
    getHeader(
      req,
      "cookie"
    );

  const fbp =
    getCookie(
      cookieHeader,
      "_fbp"
    );

  const fbc =
    getCookie(
      cookieHeader,
      "_fbc"
    );


  /* =======================================================
     Build CAPI event
     ======================================================= */

  const event = {
    event_name: eventName,

    event_time:
      Number(body.event_time) ||
      Math.floor(Date.now() / 1000),

    event_id: eventId,

    event_source_url:
      body.event_source_url ||
      "",

    action_source:
      body.action_source ||
      "website",

    user_data: {
      client_user_agent:
        userAgent || undefined,

      fbp:
        fbp || undefined,

      fbc:
        fbc || undefined
    },

    custom_data:
      body.custom_data || {}
  };


  /* =======================================================
     Remove undefined fields
     ======================================================= */

  if (!event.user_data.client_user_agent) {
    delete event.user_data.client_user_agent;
  }

  if (!event.user_data.fbp) {
    delete event.user_data.fbp;
  }

  if (!event.user_data.fbc) {
    delete event.user_data.fbc;
  }


  /* =======================================================
     Meta Graph API
     ======================================================= */

  const endpoint =
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events`;


  const payload = {
    data: [event]
  };

  if (testEventCode) {
    payload.test_event_code =
      testEventCode;
  }


  try {
    const response =
      await fetch(
        endpoint +
          `?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(payload)
        }
      );


    const responseText =
      await response.text();

    let responseData;

    try {
      responseData =
        JSON.parse(responseText);
    } catch {
      responseData = {
        raw: responseText
      };
    }


    if (!response.ok) {
      console.error(
        "Meta CAPI error:",
        response.status,
        responseData
      );

      return json(
        res,
        502,
        {
          error:
            "Meta CAPI request failed."
        }
      );
    }


    return json(
      res,
      200,
      {
        success: true,
        meta: responseData
      }
    );

  } catch (error) {
    console.error(
      "Meta CAPI network error:",
      error
    );

    return json(
      res,
      500,
      {
        error:
          "Unable to contact Meta."
      }
    );
  }
}
