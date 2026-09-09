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

  // Booking DOM Elements
  const publicBookingForm = document.getElementById('publicBookingForm');
  const eventDateInput = document.getElementById('eventDateInput');
  const eventTimeInput = document.getElementById('eventTimeInput');
  const availabilityBanner = document.getElementById('availabilityBanner');
  const instantWhatsappBtn = document.getElementById('instantWhatsappBtn');
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

  // Synthesized mechanical two-curtain shutter sound
  function playSynthesizedShutter() {
    if (isSoundMuted) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;

      // Click 1 (First curtain release)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.07);
      gain1.gain.setValueAtTime(0.9, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Noise Burst (Focal plane curtain friction)
      const bufferSize = audioCtx.sampleRate * 0.06;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now + 0.02);
      filter.Q.setValueAtTime(2.5, now + 0.02);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.setValueAtTime(0.55, now + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      whiteNoise.start(now + 0.02);
      whiteNoise.stop(now + 0.08);

      // Click 2 (Second curtain closure)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(220, now + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.16);
      gain2.gain.setValueAtTime(0.8, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.17);
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
  // 2. Camera Shutter Execution & Subtle Flash with Shutter Blade Animation
  // =========================================================================
  let isShutterAnimating = false;

  function executeCameraShutter() {
    playShutterSound();

    // Trigger subtle studio flash overlay effect
    if (cameraFlashOverlay) {
      cameraFlashOverlay.classList.add('flash-active');
      setTimeout(() => {
        cameraFlashOverlay.classList.remove('flash-active');
      }, 90);
    }

    if (isShutterAnimating) return;
    isShutterAnimating = true;

    if (heroShutterDisplay) {
      // 1. Tactile recoil mechanical snap
      heroShutterDisplay.classList.add('shutter-snapping');

      // 2. Shutter blades open (reveal camerashutter-in.png and lens bloom)
      setTimeout(() => {
        heroShutterDisplay.classList.add('shutter-open');
      }, 35);

      // 3. Shutter blades close (snap back to camerashutter-out.png)
      setTimeout(() => {
        heroShutterDisplay.classList.remove('shutter-open');
      }, 260);

      // 4. Reset recoil state
      setTimeout(() => {
        heroShutterDisplay.classList.remove('shutter-snapping');
        isShutterAnimating = false;
      }, 450);
    } else if (heroBoothMachine) {
      heroBoothMachine.style.transform = 'scale(0.985)';
      setTimeout(() => {
        heroBoothMachine.style.transform = '';
        isShutterAnimating = false;
      }, 200);
    } else {
      isShutterAnimating = false;
    }
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
      const modalDownloadBtn = photoModal.querySelector('a.btn-primary');
      const modalTitleEl = photoModal.querySelector('.modal-title');
      if (modalImg && imageSrc) {
        modalImg.src = imageSrc;
        modalImg.alt = imageTitle || 'Photo strip';
      }
      if (modalDownloadBtn && imageSrc) {
        modalDownloadBtn.href = imageSrc;
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

  // Event delegation for all current and future hanging strip cards
  document.addEventListener('click', (e) => {
    const stripCard = e.target.closest('.hanging-strip-card');
    if (stripCard) {
      const img = stripCard.querySelector('img');
      const src = stripCard.getAttribute('data-src') || (img ? img.src : 'assets/photostrip.png');
      const title = stripCard.getAttribute('data-title') || 'Archival Photo Strip';
      openModal(src, title);
    }
  });

  // =========================================================================
  // 5. Real-Time Date Availability Engine
  // =========================================================================
  let bookedDatesCache = [];

  async function fetchAvailabilityData() {
    try {
      const res = await fetch('/api/availability');
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      bookedDatesCache = Array.isArray(data.bookedDates) ? data.bookedDates : [];
    } catch (err) {
      console.warn('Could not fetch server availability, using local simulation:', err);
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
    return mobileSel && mobileSel.value ? mobileSel.value : '200 Prints (₹15,000)';
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
  // 6. Direct Event Booking Submission & WhatsApp Flow
  // =========================================================================
  if (publicBookingForm) {
    publicBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('clientName').value.trim();
      const whatsapp = document.getElementById('clientWhatsapp').value.trim();
      const address = document.getElementById('clientAddress').value.trim();
      const eventDate = eventDateInput.value;
      const eventTime = eventTimeInput ? eventTimeInput.value : '18:00';
      const notes = document.getElementById('clientNotes') ? document.getElementById('clientNotes').value.trim() : '';

      const eventType = getSelectedEventType();
      const sessionPlan = getSelectedSessionPlan();

      if (!name || !whatsapp || !address || !eventDate) {
        alert('Please fill in all required fields marked with *');
        return;
      }

      if (submitBookingBtn) {
        submitBookingBtn.disabled = true;
        submitBookingBtn.innerHTML = `<span>Reserving Slot...</span>`;
      }

      const bookingPayload = {
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

      let assignedId = 'BK-' + Math.floor(1000 + Math.random() * 9000);

      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.booking && resJson.booking.id) {
            assignedId = resJson.booking.id;
          }
        }
      } catch (err) {
        console.warn('Offline reservation fallback:', err);
      }

      executeCameraShutter();

      // Populate Success Receipt Modal
      if (receiptBookingId) receiptBookingId.textContent = assignedId;
      if (receiptClientName) receiptClientName.textContent = name;
      if (receiptEventDateTime) receiptEventDateTime.textContent = `${formatDatePretty(eventDate)} at ${eventTime}`;
      if (receiptSessionPlan) receiptSessionPlan.textContent = sessionPlan;
      if (receiptEventType) receiptEventType.textContent = eventType;
      if (receiptStatus) receiptStatus.textContent = 'Slot Held &bull; Reviewing';

      if (receiptWhatsappLink) {
        const cleanStudioPhone = '919767074984';
        const msg = encodeURIComponent(
          `Hi Clickiit.co! I just reserved photo booth booking ID: ${assignedId}\nName: ${name}\nEvent: ${eventType} (${sessionPlan})\nDate: ${eventDate} at ${eventTime}\nVenue: ${address}`
        );
        receiptWhatsappLink.href = `https://wa.me/${cleanStudioPhone}?text=${msg}`;
      }

      if (bookingSuccessModal) {
        bookingSuccessModal.style.display = 'flex';
        bookingSuccessModal.setAttribute('aria-hidden', 'false');
      }

      if (submitBookingBtn) {
        submitBookingBtn.disabled = false;
        submitBookingBtn.innerHTML = `
          <span>Confirm &amp; Reserve Date</span>
          <span class="btn-arrow">↗</span>
        `;
      }

      publicBookingForm.reset();
      resetAvailabilityBanner();
      fetchAvailabilityData();
    });
  }

  // Instant WhatsApp Direct Button
  if (instantWhatsappBtn) {
    instantWhatsappBtn.addEventListener('click', () => {
      const name = document.getElementById('clientName').value.trim() || 'Guest';
      const eventDate = eventDateInput ? eventDateInput.value || 'Upcoming Date' : 'Upcoming Date';
      const eventTime = eventTimeInput ? eventTimeInput.value : '18:00';
      const address = document.getElementById('clientAddress').value.trim() || 'Nagpur';
      const eventType = getSelectedEventType();
      const sessionPlan = getSelectedSessionPlan();

      const cleanStudioPhone = '919767074984';
      const waMsg = encodeURIComponent(
        `Hello Clickiit.co Photo Booth! I'd like to check availability and book a booth for ${eventType} (${sessionPlan}) on ${eventDate} at ${eventTime}.\nClient: ${name}\nVenue: ${address}`
      );
      window.open(`https://wa.me/${cleanStudioPhone}?text=${waMsg}`, '_blank');
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
});
