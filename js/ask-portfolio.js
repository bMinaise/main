(function () {
  "use strict";

  var LS_COUNT = "badoui_portfolio_chat_success_count";
  var SS_MSGS = "badoui_portfolio_chat_messages";
  var MAX = 3;

  var STARTER_CHIPS = [
    "Summarize Badoui’s experience",
    "Tell me about Wells Fargo Vantage",
    "What’s his design system experience?",
    "Has he worked on developer-facing products?",
    "What roles is he best fit for?",
    "Is he a fit for fintech?",
    "Which case study should I read first?",
    "How should I contact him?",
  ];

  var ERROR_COPY =
    "Something went wrong. Please try again, or email me directly at bminaise@gmail.com.";

  function getSuccessCount() {
    var n = parseInt(localStorage.getItem(LS_COUNT) || "0", 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > MAX) {
      localStorage.setItem(LS_COUNT, String(MAX));
      return MAX;
    }
    return n;
  }

  function setSuccessCount(n) {
    localStorage.setItem(LS_COUNT, String(n));
  }

  function loadMessages() {
    try {
      var raw = sessionStorage.getItem(SS_MSGS);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveMessages(msgs) {
    sessionStorage.setItem(SS_MSGS, JSON.stringify(msgs));
  }

  function counterLabel(usedSuccess) {
    var left = MAX - usedSuccess;
    if (left <= 0) return "Question limit reached";
    return left + " question" + (left === 1 ? "" : "s") + " left";
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getFocusable(panel) {
    var sel =
      'a[href]:not([tabindex="-1"]),button:not([disabled]):not([tabindex="-1"]),textarea:not([disabled]):not([tabindex="-1"]),input:not([disabled]):not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(panel.querySelectorAll(sel)).filter(function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }

  function init() {
    var openBtn = document.getElementById("ask-portfolio-open");
    var root = document.getElementById("ask-portfolio-root");
    if (!openBtn || !root) return;

    var backdrop = qs(".ask-portfolio-backdrop", root);
    var panel = qs(".ask-portfolio-panel", root);
    var closeBtn = qs(".ask-portfolio-close", root);
    var counterEl = qs("[data-ask-portfolio-counter]", root);
    var chipsWrap = qs(".ask-portfolio-chips", root);
    var messagesEl = qs(".ask-portfolio-messages", root);
    var form = qs(".ask-portfolio-form", root);
    var input = qs(".ask-portfolio-input", root);
    var submitBtn = qs(".ask-portfolio-submit", root);
    var thinkingEl = qs(".ask-portfolio-thinking", root);
    var lockedEl = qs(".ask-portfolio-locked", root);
    var composerEl = qs(".ask-portfolio-composer", root);

    var messages = loadMessages();
    var successCount = getSuccessCount();
    var lastOpenFocus = null;
    var inFlight = false;
    var trapHandler = null;

    function isLocked() {
      return successCount >= MAX;
    }

    function setOpen(open) {
      root.dataset.state = open ? "open" : "closed";
      root.setAttribute("aria-hidden", open ? "false" : "true");
      openBtn.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("ask-portfolio-scroll-lock", open);
      if (open) {
        lastOpenFocus = document.activeElement;
        panel.focus();
        document.addEventListener("keydown", onDocKeydown);
        trapHandler = function (e) {
          if (e.key !== "Tab" || root.dataset.state !== "open") return;
          var list = getFocusable(panel);
          if (!list.length) return;
          var first = list[0];
          var last = list[list.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        };
        panel.addEventListener("keydown", trapHandler);
      } else {
        document.removeEventListener("keydown", onDocKeydown);
        if (trapHandler) panel.removeEventListener("keydown", trapHandler);
        trapHandler = null;
        if (lastOpenFocus && typeof lastOpenFocus.focus === "function") {
          lastOpenFocus.focus();
        } else {
          openBtn.focus();
        }
      }
    }

    function onDocKeydown(e) {
      if (e.key === "Escape" && root.dataset.state === "open") {
        e.preventDefault();
        setOpen(false);
      }
    }

    function renderMessages() {
      messagesEl.innerHTML = "";
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        var div = document.createElement("div");
        div.className =
          "ask-portfolio-msg ask-portfolio-msg--" +
          (m.role === "user" ? "user" : "assistant");
        div.textContent = m.content;
        messagesEl.appendChild(div);
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function updateCounter() {
      counterEl.textContent = counterLabel(successCount);
    }

    function updateLockedUI() {
      var locked = isLocked();
      lockedEl.hidden = !locked;
      composerEl.hidden = locked;
      chipsWrap.querySelectorAll(".ask-portfolio-chip").forEach(function (b) {
        b.disabled = locked;
      });
      input.disabled = locked || inFlight;
      submitBtn.disabled = locked || inFlight;
      if (locked) input.value = "";
    }

    function showThinking(show) {
      thinkingEl.hidden = !show;
    }

    async function streamAssistant() {
      var res = await fetch("/api/portfolio-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: messages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("bad_response");
      }

      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var acc = "";
      var bubble = document.createElement("div");
      bubble.className = "ask-portfolio-msg ask-portfolio-msg--assistant";
      bubble.textContent = "";
      messagesEl.appendChild(bubble);

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        acc += dec.decode(chunk.value, { stream: true });
        bubble.textContent = acc;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      var finalText = acc.trim();
      bubble.remove();
      if (!finalText) {
        throw new Error("empty_reply");
      }

      messages.push({ role: "assistant", content: finalText });
      saveMessages(messages);
      renderMessages();
    }

    async function onSubmit(e) {
      if (e) e.preventDefault();
      if (inFlight || isLocked()) return;

      var text = (input.value || "").trim();
      if (!text) return;

      inFlight = true;
      input.disabled = true;
      submitBtn.disabled = true;
      showThinking(true);

      messages.push({ role: "user", content: text });
      saveMessages(messages);
      input.value = "";
      renderMessages();

      try {
        await streamAssistant();
        successCount += 1;
        setSuccessCount(successCount);
        updateCounter();
        updateLockedUI();
      } catch {
        messages.pop();
        saveMessages(messages);
        renderMessages();
        var err = document.createElement("div");
        err.className = "ask-portfolio-msg ask-portfolio-msg--error";
        err.textContent = ERROR_COPY;
        messagesEl.appendChild(err);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      } finally {
        inFlight = false;
        showThinking(false);
        if (!isLocked()) {
          input.disabled = false;
          submitBtn.disabled = false;
          input.focus();
        } else {
          input.disabled = true;
          submitBtn.disabled = true;
        }
      }
    }

    function wireChips() {
      STARTER_CHIPS.forEach(function (label) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "ask-portfolio-chip";
        b.textContent = label;
        b.addEventListener("click", function () {
          if (isLocked() || inFlight) return;
          input.value = label;
          onSubmit();
        });
        chipsWrap.appendChild(b);
      });
    }

    openBtn.setAttribute("aria-expanded", "false");

    openBtn.addEventListener("click", function () {
      setOpen(true);
    });
    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });
    backdrop.addEventListener("click", function () {
      setOpen(false);
    });
    form.addEventListener("submit", onSubmit);

    wireChips();
    renderMessages();
    updateCounter();
    updateLockedUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
