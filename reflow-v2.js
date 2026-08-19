(function () {
  "use strict";
  if (window.__OKMOENERGY_REFLOW_LOADED__) return;
  window.__OKMOENERGY_REFLOW_LOADED__ = true;

  var CONFIG_ENDPOINT = "https://reflow.quickerchat.com/api/config";
  var CONFIG_CACHE_KEY = "okmoenergy_rf_config_v2";
  var CONFIG = {
    siteId: "okmoenergy-review-b",
    creativeId: "okmo-200ah-featured-v1",
    brand: "OKMO",
    offer: "Featured recommendation",
    headline: "Power Your Next Adventure",
    description: "Explore the featured OKMO 12V 200Ah LiFePO4 battery on the official store.",
    ctaText: "View OKMOTech official store",
    ctaUrl: "https://okmotech.com/products/okmo-12v-200ah-mini-lifepo4-battery-for-rv-solar-marine-off-grid-power",
    mediaType: "image",
    mediaUrls: [],
    eventEndpoint: "https://reflow.quickerchat.com/api/events"
  };
  var params = new URLSearchParams(window.location.search);
  CONFIG_CACHE_KEY += "_" + (params.get("utm_content") || "default").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  var ua = navigator.userAgent || "";
  var isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) return;

  var STAGE_PARAM = "rf_nav";
  var SEEN_KEY = "okmoenergy_rf_seen_v8";
  var ARMED_KEY = "okmoenergy_rf_armed_v8";
  var READY_KEY = "okmoenergy_rf_ready_v8";
  var SESSION_KEY = "okmoenergy_rf_session_v8";
  var VISITOR_KEY = "okmoenergy_rf_visitor_v8";
  var isStage = params.get(STAGE_PARAM) === "1";
  var overlayOpen = false;
  var overlay = null;

  function applyRemoteConfig(row) {
    if (!row || !row.active) return;
    var urls = [];
    try {
      var parsed = typeof row.media_urls === "string" ? JSON.parse(row.media_urls) : row.media_urls;
      if (Array.isArray(parsed)) urls = parsed;
    } catch (_) {}
    urls = urls.map(function (value) {
      try { return new URL(String(value), CONFIG_ENDPOINT).href; } catch (_) { return ""; }
    }).filter(function (value) { return /^https:\/\//i.test(value); });
    if (!urls.length) return;
    CONFIG.creativeId = String(row.creative_id || CONFIG.creativeId);
    CONFIG.brand = String(row.brand || CONFIG.brand);
    CONFIG.offer = String(row.offer || CONFIG.offer);
    CONFIG.headline = String(row.headline || CONFIG.headline);
    CONFIG.description = String(row.description || CONFIG.description);
    CONFIG.ctaText = String(row.cta_text || CONFIG.ctaText);
    CONFIG.ctaUrl = String(row.cta_url || CONFIG.ctaUrl);
    CONFIG.mediaType = /^(image|video|carousel)$/.test(String(row.media_type)) ? String(row.media_type) : "image";
    CONFIG.mediaUrls = urls.slice(0, CONFIG.mediaType === "carousel" ? 10 : 1);
  }

  try { applyRemoteConfig(JSON.parse(get(sessionStorage, CONFIG_CACHE_KEY) || "null")); } catch (_) {}
  var configUrl = new URL(CONFIG_ENDPOINT);
  configUrl.searchParams.set("site", CONFIG.siteId);
  configUrl.searchParams.set("content", params.get("utm_content") || "");
  var configReady = fetch(configUrl.href, { mode: "cors", credentials: "omit", cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (data) {
      if (!data || !data.config) return;
      applyRemoteConfig(data.config);
      set(sessionStorage, CONFIG_CACHE_KEY, JSON.stringify(data.config));
    })
    .catch(function () {});

  function randomId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : "rf-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }
  function get(storage, key) { try { return storage.getItem(key); } catch (_) { return null; } }
  function set(storage, key, value) { try { storage.setItem(key, value); } catch (_) {} }
  var visitorId = get(localStorage, VISITOR_KEY) || randomId();
  var sessionId = get(sessionStorage, SESSION_KEY) || randomId();
  set(localStorage, VISITOR_KEY, visitorId);
  set(sessionStorage, SESSION_KEY, sessionId);

  function track(eventName, metadata) {
    var body = JSON.stringify({
      siteId: CONFIG.siteId,
      eventName: eventName,
      visitorId: visitorId,
      sessionId: sessionId,
      creativeId: CONFIG.creativeId,
      source: params.get("utm_source") || "direct",
      campaign: params.get("utm_campaign") || "unknown",
      content: params.get("utm_content") || "unknown",
      os: /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : "Test",
      browser: /FBAN|FBAV|FB_IAB/i.test(ua) ? "Facebook WebView" : /CriOS|Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "WebView",
      inApp: /FBAN|FBAV|FB_IAB/i.test(ua) ? "Facebook" : "Other",
      metadata: metadata || {}
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(CONFIG.eventEndpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
      fetch(CONFIG.eventEndpoint, { method: "POST", mode: "no-cors", credentials: "omit", keepalive: true, body: body }).catch(function () {});
    } catch (_) {}
  }

  function escapeHtml(value) {
    var element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
  }
  function destinationUrl() {
    var url = new URL(CONFIG.ctaUrl, window.location.origin);
    url.searchParams.set("rf_source", "okmoenergy_review");
    url.searchParams.set("rf_creative", CONFIG.creativeId);
    url.searchParams.set("rf_click_id", randomId());
    return url.href;
  }
  function removeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
    overlayOpen = false;
    document.documentElement.style.overflow = "";
  }
  function exitToPreviousPage(method) {
    track("reflow_dismissed", { method: method });
    removeOverlay();
    window.history.back();
  }
  function showRecommendation() {
    if (overlayOpen || get(sessionStorage, SEEN_KEY)) return;
    set(sessionStorage, SEEN_KEY, "1");
    overlayOpen = true;
    track("return_triggered");
    overlay = document.createElement("section");
    overlay.id = "okmoenergy-reflow-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Featured product recommendation");
    var mediaHtml = "";
    if (CONFIG.mediaType === "video" && CONFIG.mediaUrls[0]) {
      mediaHtml = '<div class="rf-media rf-video"><video src="' + escapeHtml(CONFIG.mediaUrls[0]) + '" autoplay muted loop playsinline webkit-playsinline preload="auto"></video><button class="rf-video-play" type="button" aria-label="Play video">&#9654; Play video</button></div>';
    } else if (CONFIG.mediaType === "carousel" && CONFIG.mediaUrls.length) {
      mediaHtml = '<div class="rf-media rf-carousel"><img class="rf-backdrop" src="' + escapeHtml(CONFIG.mediaUrls[0]) + '" alt="" aria-hidden="true"><div class="rf-slides">' + CONFIG.mediaUrls.map(function (url, index) {
        return '<img src="' + escapeHtml(url) + '" alt="Recommended product ' + (index + 1) + '" class="' + (index === 0 ? "active" : "") + '">';
      }).join("") + '</div><div class="rf-dots">' + CONFIG.mediaUrls.map(function (_, index) {
        return '<i class="' + (index === 0 ? "active" : "") + '"></i>';
      }).join("") + '</div></div>';
    } else if (CONFIG.mediaUrls[0]) {
      mediaHtml = '<div class="rf-media rf-image"><img class="rf-backdrop" src="' + escapeHtml(CONFIG.mediaUrls[0]) + '" alt="" aria-hidden="true"><img class="rf-main-media" src="' + escapeHtml(CONFIG.mediaUrls[0]) + '" alt="Featured OKMO product recommendation"></div>';
    }
    var actionUrl = destinationUrl();
    var actionLabel = CONFIG.headline || "Power Your Next Adventure";
    var isVideoCreative = CONFIG.mediaType === "video";
    var mediaActionHtml = (isVideoCreative ? "" : '<a class="rf-media-link" href="' + actionUrl + '" aria-label="Shop Now"></a>') +
      '<strong class="rf-marketing-copy">' + escapeHtml(actionLabel) + '</strong>' +
      '<a class="rf-shop-button" href="' + actionUrl + '">Shop Now</a>';
    overlay.innerHTML =
      '<style>' +
      '#okmoenergy-reflow-overlay{position:fixed;z-index:2147483647;inset:0;display:block;background:#173d2b;font-family:Arial,sans-serif}' +
      '#okmoenergy-reflow-overlay *{box-sizing:border-box}' +
      '#okmoenergy-reflow-overlay .rf-panel{position:relative;width:100%;height:100vh;height:100svh;max-height:none;overflow:hidden;background:#173d2b;border-radius:0}' +
      '#okmoenergy-reflow-overlay .rf-close{position:absolute;z-index:8;right:16px;top:max(16px,env(safe-area-inset-top));width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.9);color:#33443a;font:27px/36px Arial;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.18)}' +
      '#okmoenergy-reflow-overlay .rf-media{position:absolute;inset:0;overflow:hidden;background:#173d2b}' +
      '#okmoenergy-reflow-overlay .rf-media img,#okmoenergy-reflow-overlay .rf-media video{display:block;width:100%;height:100%;object-position:center}' +
      '#okmoenergy-reflow-overlay .rf-backdrop{position:absolute;z-index:0;inset:-6%;width:112%;height:112%;object-fit:cover;filter:blur(20px);transform:scale(1.08);opacity:.58}' +
      '#okmoenergy-reflow-overlay .rf-main-media{position:absolute;z-index:1;inset:0;object-fit:contain}' +
      '#okmoenergy-reflow-overlay .rf-video video{object-fit:cover}' +
      '#okmoenergy-reflow-overlay .rf-video-play{display:none;position:absolute;z-index:4;left:50%;top:38%;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.7);border-radius:99px;background:rgba(8,20,12,.76);color:#fff;padding:12px 18px;font-size:14px;font-weight:700;backdrop-filter:blur(6px)}' +
      '#okmoenergy-reflow-overlay .rf-video.needs-play .rf-video-play{display:block}' +
      '#okmoenergy-reflow-overlay .rf-slides{position:relative;z-index:1;height:100%}' +
      '#okmoenergy-reflow-overlay .rf-slides img{position:absolute;inset:0;object-fit:contain;opacity:0;transition:opacity .35s ease}' +
      '#okmoenergy-reflow-overlay .rf-slides img.active{opacity:1}' +
      '#okmoenergy-reflow-overlay .rf-dots{position:absolute;z-index:4;left:0;right:0;top:51%;display:flex;justify-content:center;gap:6px;pointer-events:none}' +
      '#okmoenergy-reflow-overlay .rf-dots i{width:7px;height:7px;border-radius:99px;background:rgba(255,255,255,.58)}' +
      '#okmoenergy-reflow-overlay .rf-dots i.active{width:20px;background:#fff}' +
      '#okmoenergy-reflow-overlay .rf-veil{position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(5,12,8,.03) 25%,rgba(5,12,8,.14) 54%,rgba(5,12,8,.84) 100%)}' +
      '#okmoenergy-reflow-overlay .rf-media-link{position:absolute;z-index:3;inset:0;display:block;cursor:pointer}' +
      '#okmoenergy-reflow-overlay .rf-marketing-copy{position:absolute;z-index:5;left:24px;right:24px;bottom:calc(132px + env(safe-area-inset-bottom));display:block;color:#fff;font-size:clamp(28px,8vw,42px);font-weight:800;line-height:1.08;letter-spacing:-.025em;text-align:left;text-shadow:0 2px 16px rgba(0,0,0,.42);pointer-events:none}' +
      '#okmoenergy-reflow-overlay .rf-shop-button{position:absolute;z-index:6;left:24px;bottom:calc(72px + env(safe-area-inset-bottom));display:block;min-width:124px;border-radius:5px;background:#fff;color:#15221b;padding:14px 23px;text-align:center;text-decoration:none;font-size:15px;font-weight:800;line-height:1.1;box-shadow:0 8px 24px rgba(0,0,0,.2)}' +
      '#okmoenergy-reflow-overlay .rf-return{position:absolute;z-index:7;left:22px;right:22px;bottom:max(16px,env(safe-area-inset-bottom));display:block;width:calc(100% - 44px);border:0;background:transparent;color:rgba(255,255,255,.72);padding:8px;font-size:12px;text-align:center;text-decoration:underline;cursor:pointer}' +
      '</style>' +
      '<div class="rf-panel">' +
      '<button class="rf-close" type="button" aria-label="Continue reading">&times;</button>' +
      mediaHtml +
      '<div class="rf-veil"></div>' +
      mediaActionHtml +
      '<button class="rf-return" type="button">Return to previous page</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    var impressionTracked = false;
    function trackImpression() {
      if (impressionTracked) return;
      impressionTracked = true;
      track("reflow_impression", { mediaType: CONFIG.mediaType });
    }
    var firstMedia = overlay.querySelector(".rf-video video, .rf-main-media, .rf-slides img.active");
    if (!firstMedia) trackImpression();
    else if (firstMedia.tagName === "VIDEO") {
      var videoBox = firstMedia.closest(".rf-video");
      var videoPlayButton = overlay.querySelector(".rf-video-play");
      firstMedia.muted = true;
      firstMedia.defaultMuted = true;
      firstMedia.playsInline = true;
      firstMedia.setAttribute("muted", "");
      firstMedia.setAttribute("playsinline", "");
      function attemptVideoPlay() {
        var playback;
        try { playback = firstMedia.play(); } catch (_) { if (videoBox) videoBox.classList.add("needs-play"); return; }
        if (playback && typeof playback.catch === "function") {
          playback.catch(function () { if (videoBox) videoBox.classList.add("needs-play"); });
        }
      }
      firstMedia.addEventListener("canplay", trackImpression, { once: true });
      firstMedia.addEventListener("loadeddata", attemptVideoPlay, { once: true });
      firstMedia.addEventListener("playing", function () { if (videoBox) videoBox.classList.remove("needs-play"); }, { once: true });
      firstMedia.addEventListener("play", function () { track("creative_play"); }, { once: true });
      firstMedia.addEventListener("ended", function () { track("creative_complete"); }, { once: true });
      if (videoPlayButton) videoPlayButton.addEventListener("click", attemptVideoPlay);
      attemptVideoPlay();
      if (firstMedia.readyState >= 2) trackImpression();
    } else {
      firstMedia.addEventListener("load", trackImpression, { once: true });
      firstMedia.addEventListener("error", trackImpression, { once: true });
      if (firstMedia.complete && firstMedia.naturalWidth > 0) trackImpression();
    }
    if (CONFIG.mediaType === "carousel" && CONFIG.mediaUrls.length > 1) {
      var slideIndex = 0;
      var slides = overlay.querySelectorAll(".rf-slides img");
      var dots = overlay.querySelectorAll(".rf-dots i");
      window.setInterval(function () {
        if (!overlayOpen) return;
        slides[slideIndex].classList.remove("active");
        dots[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
        dots[slideIndex].classList.add("active");
      }, 3500);
    }
    var materialAction = overlay.querySelector(".rf-media-link");
    var offerAction = overlay.querySelector(".rf-shop-button");
    if (materialAction) materialAction.addEventListener("click", function () { track("reflow_cta_click", { destination: CONFIG.ctaUrl, clickArea: "material" }); });
    if (offerAction) offerAction.addEventListener("click", function () { track("reflow_cta_click", { destination: CONFIG.ctaUrl, clickArea: "shop_button" }); });
    overlay.querySelector(".rf-close").addEventListener("click", function () { track("reflow_dismissed", { method: "close" }); removeOverlay(); });
    overlay.querySelector(".rf-return").addEventListener("click", function () { exitToPreviousPage("return_button"); });
  }

  function returnedToArticle() {
    return !isStage && get(sessionStorage, ARMED_KEY) === "1" && get(sessionStorage, READY_KEY) === "1";
  }
  function showOnReturn() {
    if (!returnedToArticle()) return;
    set(sessionStorage, READY_KEY, "0");
    configReady.then(showRecommendation);
  }
  window.addEventListener("pageshow", showOnReturn);
  // Safari may restore a same-origin history entry with popstate before pageshow.
  window.addEventListener("popstate", function () {
    if (!isStage && get(sessionStorage, ARMED_KEY) === "1" && !get(sessionStorage, SEEN_KEY)) {
      showOnReturn();
    }
  });
  window.addEventListener("pagehide", function () {
    if (overlayOpen) track("reflow_dismissed", { method: "browser_back" });
  });

  if (!get(sessionStorage, "okmoenergy_rf_landing_v8")) {
    set(sessionStorage, "okmoenergy_rf_landing_v8", "1");
    track("landing_view");
  }
  if (isStage) {
    set(sessionStorage, ARMED_KEY, "1");
    set(sessionStorage, READY_KEY, "1");
    return;
  }
  if (get(sessionStorage, SEEN_KEY)) return;
  if (returnedToArticle()) { showOnReturn(); return; }

  set(sessionStorage, ARMED_KEY, "1");
  set(sessionStorage, READY_KEY, "0");
  var navigationScheduled = false;
  function createRealHistoryEntry() {
    if (navigationScheduled) return;
    navigationScheduled = true;
    window.setTimeout(function () {
      var stageUrl = new URL(window.location.href);
      stageUrl.searchParams.set(STAGE_PARAM, "1");
      window.location.assign(stageUrl.href);
    }, 400);
  }
  // Wait until this document is established; Facebook can coalesce startup navigation as a redirect.
  if (document.readyState === "complete") {
    createRealHistoryEntry();
  } else {
    window.addEventListener("pageshow", createRealHistoryEntry, { once: true });
  }
})();
