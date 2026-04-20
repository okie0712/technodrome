document.addEventListener("DOMContentLoaded", () => {
  const FORM_MIN_OPEN_MS = 4000;
  const FORM_COOLDOWN_MS = 120000;
  const LAST_SUBMIT_STORAGE_KEY = "okieDigitalLastSubmitAt";

  const loader = document.querySelector(".loader");
  const year = document.getElementById("year");
  const nav = document.getElementById("main-nav");
  const toggle = document.querySelector(".menu-toggle");
  const stickyCta = document.querySelector(".sticky-cta");
  const navLinks = document.querySelectorAll(".main-nav a");
  const sections = document.querySelectorAll("main section[id]");
  const revealItems = document.querySelectorAll(".reveal");
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const formMountedAt = Date.now();

  const trackEvent = (eventName, eventData = {}) => {
    const payload = {
      event: eventName,
      page_path: window.location.pathname,
      ...eventData,
    };

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, eventData);
    }

    document.dispatchEvent(new CustomEvent("okie-analytics", { detail: payload }));
  };

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  window.setTimeout(() => {
    if (loader) {
      loader.classList.add("is-hidden");
    }
  }, 450);

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  const updateScrollState = () => {
    let currentSectionId = "hero";

    sections.forEach((section) => {
      const top = section.offsetTop - 120;
      const bottom = top + section.offsetHeight;

      if (window.scrollY >= top && window.scrollY < bottom) {
        currentSectionId = section.id;
      }
    });

    navLinks.forEach((link) => {
      const targetId = link.getAttribute("href")?.slice(1);
      link.classList.toggle("active", targetId === currentSectionId);
    });

    if (stickyCta) {
      stickyCta.classList.toggle("is-visible", window.scrollY > 380);
    }
  };

  window.addEventListener("scroll", updateScrollState, { passive: true });
  updateScrollState();

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if (form && status) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      trackEvent("contact_form_attempt", { source: "website_contact_form" });

      const trapField = form.querySelector('input[name="_honey"]');
      const trapValue = String(trapField?.value ?? "").trim();
      if (trapValue.length > 0) {
        status.textContent = "Message blocked.";
        status.className = "form-status error";
        trackEvent("contact_form_blocked", { reason: "honeypot" });
        return;
      }

      if (Date.now() - formMountedAt < FORM_MIN_OPEN_MS) {
        status.textContent = "Please wait a few seconds, then submit again.";
        status.className = "form-status error";
        trackEvent("contact_form_blocked", { reason: "too_fast" });
        return;
      }

      const lastSubmitRaw = localStorage.getItem(LAST_SUBMIT_STORAGE_KEY);
      const lastSubmitAt = Number(lastSubmitRaw || 0);
      const elapsedSinceLast = Date.now() - lastSubmitAt;
      if (lastSubmitAt > 0 && elapsedSinceLast < FORM_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((FORM_COOLDOWN_MS - elapsedSinceLast) / 1000);
        status.textContent = `Please wait ${waitSeconds}s before sending another request.`;
        status.className = "form-status error";
        trackEvent("contact_form_blocked", { reason: "cooldown", wait_seconds: waitSeconds });
        return;
      }

      if (!form.checkValidity()) {
        status.textContent = "Please fill out all required fields.";
        status.className = "form-status error";
        trackEvent("contact_form_blocked", { reason: "validation" });
        form.reportValidity();
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.textContent ?? "Send Message";
        submitButton.textContent = "Sending...";
      }

      status.textContent = "Sending your request...";
      status.className = "form-status";

      try {
        const response = await fetch(form.action, {
          method: form.method,
          headers: {
            Accept: "application/json",
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const name = String(formData.get("name") ?? "").trim();
        status.textContent = `Thanks, ${name || "there"}. Your message was sent successfully. I will respond within hours.`;
        status.className = "form-status success";
        localStorage.setItem(LAST_SUBMIT_STORAGE_KEY, String(Date.now()));
        trackEvent("contact_form_success", {
          source: "website_contact_form",
          has_website: Boolean(String(formData.get("website") ?? "").trim()),
        });
        form.reset();

        const firstField = form.querySelector("input, textarea");
        if (firstField) {
          firstField.focus();
        }
      } catch (error) {
        console.error("Contact form send failed:", error);
        status.textContent = "Message failed to send. Please email me directly at tollettosuit@yahoo.com.";
        status.className = "form-status error";
        trackEvent("contact_form_error", { reason: "request_failed" });
      } finally {
        if (submitButton) {
          submitButton.textContent = submitButton.dataset.originalText ?? "Send Message";
          submitButton.disabled = false;
        }
      }
    });
  }
});
