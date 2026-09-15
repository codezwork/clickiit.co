/**
 * CLICKIIT.CO PHOTO BOOTH - INTERACTIVE CONTROLLER
 * Features:
 * - High-Fidelity Camera Shutter Audio Engine (Decoded Web Audio API Buffer + HTML5 Audio fallback)
 * - Automatic Browser Audio Unlocking on user interaction
 * - Photo Booth Machine Interactive Shutter Trigger + Subtle Studio Flash
 * - Mobile Navigation Menu Toggle & Smooth Scroll
 * - Lightbox Modal Inspection for Photo Strips
 * - Live Date Availability Verification via /api/availability
 * - Direct Event Booking Form Submission to Backend /api/bookings & WhatsApp
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const heroBoothMachine = document.getElementById('heroBoothMachine');
  const boothInteractiveBeacon = document.getElementById('boothInteractiveBeacon');
  const heroBoothWrapper = document.getElementById('heroBoothWrapper');
  const cameraFlashOverlay = document.getElementById('cameraFlashOverlay');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  const photoModal = document.getElementById('photoModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalShutterTrigger = document.getElementById('modalShutterTrigger');
  const galleryStrips = document.querySelectorAll('.hanging-strip-card');

  // Direct Cloud Google Sheet & Notification Configuration
  const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbw3AbMyZ90cQX5HTdw9n8ZoNIqjUAW6rTh5zrvce5wfW0koNlrEtWw97X_qsDCY4voBoQ/exec';
  const NOTIFICATION_EMAIL = 'madhurvibes@gmail.com';

  // Booking DOM Elements
  const publicBookingForm = document.getElementById('publicBookingForm');
  const eventDateInput = document.getElementById('eventDateInput');
  const eventTimeInput = document.getElementById('eventTimeInput');
  const availabilityBanner = document.getElementById('availabilityBanner');
  const submitBookingBtn = document.getElementById('submitBookingBtn');

  // Booking Success Modal
  const bookingSuccessModal = document.getElementById('bookingSuccessModal');
  const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');
  const closeSuccessModalTopBtn = document.getElementById('closeSuccessModalTopBtn');
  const bookingSuccessBackdrop = document.getElementById('bookingSuccessBackdrop');
  const receiptBookingId = document.getElementById('receiptBookingId');
  const receiptClientName = document.getElementById('receiptClientName');
  const receiptEventDateTime = document.getElementById('receiptEventDateTime');
  const receiptSessionPlan = document.getElementById('receiptSessionPlan');
  const receiptEventType = document.getElementById('receiptEventType');
  const receiptStatus = document.getElementById('receiptStatus');
  const receiptWhatsappLink = document.getElementById('receiptWhatsappLink');

  // Shutter Sound Mute State
  let isSoundMuted = false;

  // =========================================================================
  // 1. Universal Shutter Audio Engine (assets/shutter.wav)
  // =========================================================================
  let audioCtx = null;
  let shutterBuffer = null;
  let audioUnlocked = false;

  async function initAudioEngine() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();

      const response = await fetch('assets/shutter.wav');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        shutterBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      }
    } catch (e) {
      console.warn('Audio decoding fallback to synthesized shutter:', e);
    }
  }
  initAudioEngine();

  // Unlock AudioContext on earliest user interaction
  function unlockAudioEngine() {
    if (audioUnlocked) return;
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else {
      audioUnlocked = true;
    }
  }
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudioEngine, { once: true, passive: true });
  });

  // Synthesized camera lens focus + mechanical two-curtain shutter sound
  function playSynthesizedShutter() {
    if (isSoundMuted) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;

      // 1. Lens focus motor sound (0s to 0.85s)
      const motorOsc = audioCtx.createOscillator();
      const motorGain = audioCtx.createGain();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.setValueAtTime(140, now);
      motorOsc.frequency.linearRampToValueAtTime(190, now + 0.35);
      motorOsc.frequency.linearRampToValueAtTime(160, now + 0.7);
      motorOsc.frequency.linearRampToValueAtTime(120, now + 0.85);

      const motorFilter = audioCtx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(650, now);

      motorGain.gain.setValueAtTime(0.04, now);
      motorGain.gain.linearRampToValueAtTime(0.06, now + 0.35);
      motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);

      motorOsc.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(audioCtx.destination);
      motorOsc.start(now);
      motorOsc.stop(now + 0.88);

      // 2. Mechanical Shutter Snap at 0.95s
      const snapTime = now + 0.95;

      // Click 1 (First curtain release)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(340, snapTime);
      osc1.frequency.exponentialRampToValueAtTime(60, snapTime + 0.07);
      gain1.gain.setValueAtTime(0.9, snapTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.08);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(snapTime);
      osc1.stop(snapTime + 0.08);

      // Noise Burst (Focal plane curtain friction)
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.07);
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, snapTime + 0.02);
      filter.Q.setValueAtTime(2.5, snapTime + 0.02);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, snapTime);
      noiseGain.gain.setValueAtTime(0.55, snapTime + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.08);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      whiteNoise.start(snapTime + 0.02);
      whiteNoise.stop(snapTime + 0.08);

      // Click 2 (Second curtain closure)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(220, snapTime + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(40, snapTime + 0.16);
      gain2.gain.setValueAtTime(0.8, snapTime + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.17);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(snapTime + 0.09);
      osc2.stop(snapTime + 0.17);
    } catch (e) {
      console.warn('Synthesized shutter error:', e);
    }
  }

  function playShutterSound() {
    if (isSoundMuted) return;

    unlockAudioEngine();

    try {
      if (shutterBuffer && audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createBufferSource();
        source.buffer = shutterBuffer;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
      } else {
        const audio = new Audio('assets/shutter.wav');
        audio.volume = 0.95;
        audio.play().catch(() => {
          playSynthesizedShutter();
        });
      }
    } catch (e) {
      playSynthesizedShutter();
    }
  }

  // =========================================================================
  // 2. Camera Shutter Execution & Synced Lens / Shutter Flash Animation
  // =========================================================================
  let isShutterAnimating = false;

  function executeCameraShutter() {
    if (isShutterAnimating) return;
    isShutterAnimating = true;

    // 1. Play camera audio: starts with lens focusing whir, followed by shutter snap
    playShutterSound();

    // 2. While the lens sound comes in, open the inner circular shutter blades
    if (heroShutterDisplay) {
      setTimeout(() => {
        heroShutterDisplay.classList.add('shutter-open');
      }, 50);
    }

    // 3. When the actual mechanical shutter sound fires (~950ms), trigger the flash effect
    setTimeout(() => {
      if (cameraFlashOverlay) {
        cameraFlashOverlay.classList.add('flash-active');
      }
      if (heroShutterDisplay) {
        heroShutterDisplay.classList.add('flash-active');
      }

      // Flash fades away smoothly
      setTimeout(() => {
        if (cameraFlashOverlay) {
          cameraFlashOverlay.classList.remove('flash-active');
        }
        if (heroShutterDisplay) {
          heroShutterDisplay.classList.remove('flash-active');
        }
      }, 120);
    }, 950);

    // 4. Close the inner circular shutter blades right as the shutter click ends (~1120ms)
    setTimeout(() => {
      if (heroShutterDisplay) {
        heroShutterDisplay.classList.remove('shutter-open');
      }
    }, 1120);

    // 5. Reset shutter state
    setTimeout(() => {
      isShutterAnimating = false;
    }, 1300);
  }

  // Bind camera shutter display triggers
  if (heroShutterDisplay) {
    heroShutterDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      executeCameraShutter();
    });
    heroShutterDisplay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        executeCameraShutter();
      }
    });
  } else if (heroBoothMachine) {
    heroBoothMachine.addEventListener('click', (e) => {
      e.stopPropagation();
      executeCameraShutter();
    });
  }

  if (boothInteractiveBeacon) {
    boothInteractiveBeacon.addEventListener('click', (e) => {
      e.stopPropagation();
      executeCameraShutter();
    });
  }

  // Sound Toggle Button
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      isSoundMuted = !isSoundMuted;
      soundToggleBtn.classList.toggle('is-muted', isSoundMuted);
      soundToggleBtn.setAttribute('aria-pressed', isSoundMuted ? 'true' : 'false');
      soundToggleBtn.title = isSoundMuted ? 'Unmute shutter sound' : 'Mute shutter sound';
    });
  }

  // =========================================================================
  // 3. Mobile Navigation Menu Toggle
  // =========================================================================
  if (mobileNavToggle && mobileNavDrawer) {
    mobileNavToggle.addEventListener('click', () => {
      const isOpen = mobileNavDrawer.classList.toggle('is-open');
      mobileNavToggle.classList.toggle('is-open', isOpen);
      mobileNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    mobileNavLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileNavDrawer.classList.remove('is-open');
        mobileNavToggle.classList.remove('is-open');
      });
    });
  }

  // =========================================================================
  // 4. Lightbox Modal Inspection
  // =========================================================================
  function openModal(imageSrc, imageTitle) {
    if (photoModal) {
      const modalImg = photoModal.querySelector('.modal-strip-image');
      const modalTitleEl = photoModal.querySelector('.modal-title');
      if (modalImg && imageSrc) {
        modalImg.src = imageSrc;
        modalImg.alt = imageTitle || 'Photo strip';
      }
      if (modalTitleEl && imageTitle) {
        modalTitleEl.textContent = imageTitle;
      }
      photoModal.classList.add('is-open');
      photoModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (photoModal) {
      photoModal.classList.remove('is-open');
      photoModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && photoModal && photoModal.classList.contains('is-open')) {
      closeModal();
    }
  });

  if (modalShutterTrigger) {
    modalShutterTrigger.addEventListener('click', () => {
      executeCameraShutter();
    });
  }

  // Strip cards in the clothesline are NOT clickable — hover/hold pauses scroll only (handled in CSS + section below)

  // =========================================================================
  // 4b. Dynamic Scrapbook Gallery — Loaded from Admin CMS (/api/strips)
  // =========================================================================
  const TILT_CLASSES = ['tilt-n3', 'tilt-n2', 'tilt-n1', 'tilt-p1', 'tilt-p2', 'tilt-p3'];
  const stripGroupPrimary = document.getElementById('stripGroupPrimary');
  const stripGroupClone   = document.getElementById('stripGroupClone');
  const clotheslineRow    = document.getElementById('clotheslineRow');
  const marqueeTrack      = document.getElementById('marqueeScrollTrack');

  /** Build one hanging-strip-card element (not clickable, no popup). */
  function buildStripCard(strip, index) {
    const tilt = TILT_CLASSES[index % TILT_CLASSES.length];
    const card = document.createElement('div');
    card.className = `hanging-strip-card ${tilt}`;
    // No data-src / data-title needed — strips don't open a modal
    card.innerHTML = `
      <div class="wooden-clothespin"><div class="peg-clip"></div></div>
      <div class="mini-strip-surface">
        <img src="${strip.imageUrl || ''}" alt="Photo strip" class="mini-strip-img" loading="lazy" />
      </div>`;
    return card;
  }

  /**
   * Fill the clothesline with strips from the CMS.
   * - Always shows the rope (clotheslineRow always visible).
   * - Duplicates strips enough times so the track fills the viewport for smooth looping.
   * - Never shows an "empty state" text — just an empty rope if no strips yet.
   */
  function renderPublicStrips(strips) {
    if (!stripGroupPrimary) return;

    stripGroupPrimary.innerHTML = '';
    if (stripGroupClone) stripGroupClone.innerHTML = '';

    // Always keep the rope visible
    if (clotheslineRow) clotheslineRow.style.display = '';

    if (!strips || strips.length === 0) return; // Empty rope — no strips, just the rope

    // Add exactly the strips the admin published — no repetition, no duplication
    strips.forEach((strip, i) => {
      stripGroupPrimary.appendChild(buildStripCard(strip, i));
    });

    // Clone group: silent mirror for seamless infinite CSS scroll loop (not visible as duplicates)
    if (stripGroupClone) {
      stripGroupPrimary.querySelectorAll('.hanging-strip-card').forEach(card => {
        stripGroupClone.appendChild(card.cloneNode(true));
      });
    }
  }

  /** Fetch strips from backend; fall back to localStorage. */
  async function loadPublicStrips() {
    let strips = [];
    try {
      const res = await fetch('/api/strips');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          strips = data;
          localStorage.setItem('clickit_strips_local', JSON.stringify(strips));
        }
      } else { throw new Error(); }
    } catch {
      const cached = localStorage.getItem('clickit_strips_local');
      strips = cached ? JSON.parse(cached) : [];
    }
    renderPublicStrips(strips);
  }

  // Load strips on page load
  loadPublicStrips();

  // Pause marquee on mousedown / touchstart; resume on release
  if (marqueeTrack) {
    const pauseMarquee  = () => marqueeTrack.style.animationPlayState = 'paused';
    const resumeMarquee = () => marqueeTrack.style.animationPlayState = '';
    marqueeTrack.addEventListener('mousedown',   pauseMarquee);
    marqueeTrack.addEventListener('touchstart',  pauseMarquee, { passive: true });
    document.addEventListener('mouseup',   resumeMarquee);
    document.addEventListener('touchend',  resumeMarquee);
  }

  // =========================================================================
  // 5. Real-Time Date Availability Engine
  // =========================================================================
  let bookedDatesCache = [];

  async function fetchAvailabilityData() {
    try {
      if (GOOGLE_SHEET_URL) {
        const res = await fetch(GOOGLE_SHEET_URL);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.bookings)) {
            const booked = data.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'blocked');
            bookedDatesCache = [...new Set(booked.map(b => b.eventDate).filter(Boolean))];
            return;
          }
        }
      }

      const res = await fetch('/api/availability');
      if (res.ok) {
        const data = await res.json();
        bookedDatesCache = Array.isArray(data.bookedDates) ? data.bookedDates : [];
      }
    } catch (err) {
      console.warn('Could not fetch availability, using fallback:', err);
      bookedDatesCache = ['2026-09-15', '2026-09-18', '2026-09-22', '2026-10-02'];
    }
  }

  fetchAvailabilityData();

  if (eventDateInput) {
    const today = new Date().toISOString().split('T')[0];
    eventDateInput.min = today;

    eventDateInput.addEventListener('change', () => {
      const selected = eventDateInput.value;
      if (!selected) {
        resetAvailabilityBanner();
        return;
      }

      availabilityBanner.className = 'availability-banner status-checking';
      availabilityBanner.innerHTML = `
        <div class="avail-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="avail-text">
          <div class="avail-status-heading">Checking Availability for ${formatDatePretty(selected)}...</div>
          <p class="avail-status-sub">Consulting the Clickiit.co schedule calendar in real-time.</p>
        </div>
      `;

      setTimeout(() => {
        if (bookedDatesCache.includes(selected)) {
          availabilityBanner.className = 'availability-banner status-booked';
          availabilityBanner.innerHTML = `
            <div class="avail-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            </div>
            <div class="avail-text">
              <div class="avail-status-heading">Reserved / Fully Booked on ${formatDatePretty(selected)}</div>
              <p class="avail-status-sub">This date is reserved for another celebration. Please select an alternate date or WhatsApp us to check backup kiosk hardware.</p>
            </div>
          `;
        } else {
          availabilityBanner.className = 'availability-banner status-available';
          availabilityBanner.innerHTML = `
            <div class="avail-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="avail-text">
              <div class="avail-status-heading">Date Open &amp; Available on ${formatDatePretty(selected)}!</div>
              <p class="avail-status-sub">Studio team and photo booth kiosks are available for reservation on this date.</p>
            </div>
          `;
        }
      }, 350);
    });
  }

  function resetAvailabilityBanner() {
    if (!availabilityBanner) return;
    availabilityBanner.className = 'availability-banner status-prompt';
    availabilityBanner.innerHTML = `
      <div class="avail-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <div class="avail-text">
        <div class="avail-status-heading">Select an event date above</div>
        <p class="avail-status-sub">We'll instantly verify booth availability against our studio bookings calendar.</p>
      </div>
    `;
  }

  function formatDatePretty(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // =========================================================================
  // 5. Package Category Switching (Strips vs Time)
  // =========================================================================
  const pkgSwitchBtns = document.querySelectorAll('.pkg-switch-btn');
  const pricingCategoryPanels = document.querySelectorAll('.pricing-category-panel');

  pkgSwitchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      pkgSwitchBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      pricingCategoryPanels.forEach((panel) => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // Booking Form Category Switcher
  const formCatBtns = document.querySelectorAll('.form-cat-btn');
  const formPlansPanels = document.querySelectorAll('.form-plans-panel');

  function setFormCategory(catName) {
    formCatBtns.forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-form-cat') === catName);
    });
    formPlansPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `form-plans-${catName}`);
    });
  }

  formCatBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-form-cat');
      setFormCategory(cat);
      const firstRadio = document.querySelector(`#form-plans-${cat} input[type="radio"]`);
      if (firstRadio) {
        firstRadio.checked = true;
        if (mobileSessionPlanSelect) mobileSessionPlanSelect.value = firstRadio.value;
      }
    });
  });

  // "Reserve Package" buttons from pricing cards pre-select plan in the booking form
  const selectPkgBtns = document.querySelectorAll('.select-pkg-btn');
  selectPkgBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      const planValue = btn.getAttribute('data-plan');

      if (category) setFormCategory(category);

      if (planValue) {
        const targetRadio = document.querySelector(`input[name="sessionPlanRadio"][value="${planValue}"]`);
        if (targetRadio) targetRadio.checked = true;
        if (mobileSessionPlanSelect) mobileSessionPlanSelect.value = planValue;
      }
    });
  });

  // =========================================================================
  // 6. Booking Form Submission & Confirmation
  // =========================================================================
  function getSelectedEventType() {
    const mobileSel = document.getElementById('mobileEventTypeSelect');
    if (mobileSel && window.innerWidth <= 768 && mobileSel.value) {
      return mobileSel.value;
    }
    const radioEl = document.querySelector('input[name="eventTypeRadio"]:checked');
    if (radioEl) return radioEl.value;
    return mobileSel && mobileSel.value ? mobileSel.value : 'Wedding / Reception';
  }

  function getSelectedSessionPlan() {
    const mobileSel = document.getElementById('mobileSessionPlanSelect');
    if (mobileSel && window.innerWidth <= 768 && mobileSel.value) {
      return mobileSel.value;
    }
    const radioEl = document.querySelector('.form-plans-panel.active input[name="sessionPlanRadio"]:checked')
      || document.querySelector('input[name="sessionPlanRadio"]:checked');
    if (radioEl) return radioEl.value;
    return mobileSel && mobileSel.value ? mobileSel.value : 'Classic — 200 Prints (₹12,999)';
  }

  function getFormattedPackage(planStr) {
    if (!planStr) return 'Classic — 200 Prints (₹12,999)';
    const match = planStr.match(/^(.*?)\s*\((₹?[0-9,]+.*)\)$/);
    if (match) {
      const name = match[1].trim();
      const price = match[2].trim();
      return `${name} (${price})`;
    }
    return planStr;
  }

  const mobileEventTypeSelect = document.getElementById('mobileEventTypeSelect');
  const mobileSessionPlanSelect = document.getElementById('mobileSessionPlanSelect');

  if (mobileEventTypeSelect) {
    mobileEventTypeSelect.addEventListener('change', (e) => {
      const targetRadio = document.querySelector(`input[name="eventTypeRadio"][value="${e.target.value}"]`);
      if (targetRadio) targetRadio.checked = true;
    });
  }

  if (mobileSessionPlanSelect) {
    mobileSessionPlanSelect.addEventListener('change', (e) => {
      const targetRadio = document.querySelector(`input[name="sessionPlanRadio"][value="${e.target.value}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
        const panel = targetRadio.closest('.form-plans-panel');
        if (panel) {
          const cat = panel.id.replace('form-plans-', '');
          setFormCategory(cat);
        }
      }
    });
  }

  document.querySelectorAll('input[name="eventTypeRadio"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (mobileEventTypeSelect) mobileEventTypeSelect.value = r.value;
    });
  });

  document.querySelectorAll('input[name="sessionPlanRadio"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (mobileSessionPlanSelect) mobileSessionPlanSelect.value = r.value;
      const panel = r.closest('.form-plans-panel');
      if (panel) {
        const cat = panel.id.replace('form-plans-', '');
        setFormCategory(cat);
      }
    });
  });

  // =========================================================================
  // 6. Direct Event Booking Submission & WhatsApp Flow (Single Action)
  // =========================================================================
  if (publicBookingForm) {
    publicBookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('clientName').value.trim();
      const whatsapp = document.getElementById('clientWhatsapp').value.trim();
      const address = document.getElementById('clientAddress').value.trim();
      const eventDate = eventDateInput ? eventDateInput.value : '';
      const eventTime = eventTimeInput ? eventTimeInput.value : '18:00';
      const notes = document.getElementById('clientNotes') ? document.getElementById('clientNotes').value.trim() : '';

      const eventType = getSelectedEventType();
      const sessionPlan = getSelectedSessionPlan();

      if (!name || !whatsapp || !address || !eventDate) {
        alert('Please fill in all required fields marked with *');
        return;
      }

      // Generate consistent Booking ID immediately
      const assignedId = 'BK-' + Math.floor(100000 + Math.random() * 900000);

      // Prepare WhatsApp message and deep-link URL
      const cleanStudioPhone = '919518597366';
      const formattedPackage = getFormattedPackage(sessionPlan);
      const waBookingMsg =
        `🎉 *New Booking Request — Clickiit.co*\n` +
        `Ref: ${assignedId}\n\n` +
        `*Client:* ${name}\n` +
        `*Event Type:* ${eventType}\n` +
        `*Package:* ${formattedPackage}\n` +
        `*Date & Time:* ${formatDatePretty(eventDate)} at ${eventTime}\n` +
        `*Venue:* ${address}\n` +
        `*Preferences:* ${notes || 'None'}\n\n` +
        `Hi Clickiit.co! I'd like to check availability and lock this slot. Please confirm 🙌`;

      const waBookingUrl = `https://wa.me/${cleanStudioPhone}?text=${encodeURIComponent(waBookingMsg)}`;

      // 1. Open WhatsApp immediately in response to user click (guarantees no popup blocking)
      window.open(waBookingUrl, '_blank');

      // 2. Dispatch pending booking to Admin server & Google Sheet in background
      const bookingPayload = {
        id: assignedId,
        name,
        whatsapp,
        address,
        eventDate,
        eventTime,
        eventType,
        sessionPlan,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Direct save to Google Sheet & trigger email alert on live domain
      if (GOOGLE_SHEET_URL) {
        fetch(GOOGLE_SHEET_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'addBooking',
            booking: bookingPayload,
            notificationEmail: NOTIFICATION_EMAIL
          }),
          keepalive: true
        }).catch(err => {
          console.warn('Google Sheet dispatch fallback:', err);
        });
      }

      // Also dispatch to local backend if running
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
        keepalive: true
      }).catch(() => {});

      // Shutter sound & animation
      executeCameraShutter();

      // Populate Success Receipt Modal on page
      if (receiptBookingId) receiptBookingId.textContent = assignedId;
      if (receiptClientName) receiptClientName.textContent = name;
      if (receiptEventDateTime) receiptEventDateTime.textContent = `${formatDatePretty(eventDate)} at ${eventTime}`;
      if (receiptSessionPlan) receiptSessionPlan.textContent = sessionPlan;
      if (receiptEventType) receiptEventType.textContent = eventType;
      if (receiptStatus) receiptStatus.textContent = 'Slot Held &bull; Reviewing';
      if (receiptWhatsappLink) receiptWhatsappLink.href = waBookingUrl;

      if (bookingSuccessModal) {
        bookingSuccessModal.style.display = 'flex';
        bookingSuccessModal.setAttribute('aria-hidden', 'false');
      }

      publicBookingForm.reset();
      resetAvailabilityBanner();
      fetchAvailabilityData();
    });
  }

  function closeSuccessModal() {
    if (bookingSuccessModal) {
      bookingSuccessModal.style.display = 'none';
      bookingSuccessModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (closeSuccessModalBtn) closeSuccessModalBtn.addEventListener('click', closeSuccessModal);
  if (closeSuccessModalTopBtn) closeSuccessModalTopBtn.addEventListener('click', closeSuccessModal);
  if (bookingSuccessBackdrop) bookingSuccessBackdrop.addEventListener('click', closeSuccessModal);

  // =========================================================================
  // 7. College & Campus Fest Sponsorship WhatsApp Form
  // =========================================================================
  const collegeSponsorForm = document.getElementById('collegeSponsorForm');
  const sponsorSuccessNotice = document.getElementById('sponsorSuccessNotice');

  if (collegeSponsorForm) {
    collegeSponsorForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const collegeName = document.getElementById('sponsorCollegeName').value.trim();
      const festName = document.getElementById('sponsorFestName').value.trim();
      const festDates = document.getElementById('sponsorFestDates').value.trim();
      const footfall = document.getElementById('sponsorFootfall').value;
      const leadName = document.getElementById('sponsorLeadName').value.trim();
      const leadPhone = document.getElementById('sponsorLeadPhone').value.trim();
      const notes = document.getElementById('sponsorNotes').value.trim();

      if (!collegeName || !festName || !festDates || !leadName || !leadPhone) {
        alert('Please fill in all required fest and organizer details (*).');
        return;
      }

      const cleanStudioPhone = '919518597366';

      const msg =
        `📸 *New Fest Sponsorship Request — via Clickiit.co*\n` +
        `✅ Verified submission from clickiit.co.in\n\n` +
        `*College/Institute:* ${collegeName}\n` +
        `*Fest/Event:* ${festName}\n` +
        `*Dates & Duration:* ${festDates}\n` +
        `*Expected Footfall:* ${footfall || 'Not specified'}\n` +
        `*Lead Organizer:* ${leadName}\n` +
        `*WhatsApp:* ${leadPhone}\n` +
        `*Notes:* ${notes || 'None'}\n\n` +
        `Hi CLICKIIT.CO team! We'd like to invite you as a stall sponsor for ${festName}. Please share your sponsorship proposal and payout terms.`;

      // Show inline success notice
      if (sponsorSuccessNotice) {
        sponsorSuccessNotice.style.display = 'block';
        setTimeout(() => {
          sponsorSuccessNotice.style.display = 'none';
        }, 6000);
      }

      // Open WhatsApp chat directly with pre-composed proposal
      window.open(`https://wa.me/${cleanStudioPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }
});
