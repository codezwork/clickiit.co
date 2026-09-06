/**
 * CLICK IT.CO PHOTO BOOTH - INTERACTIVE CONTROLLER
 * Features:
 * - High-Fidelity Camera Shutter Audio Engine (Decoded Web Audio API Buffer + HTML5 Audio fallback)
 * - Automatic Browser Audio Unlocking on first user gesture (click/touch/key)
 * - Camera Lens Aperture Shutter Animation (camerashutter-in & camerashutter-out)
 * - Zero Whole-Logo Movement (Logo stays completely stable on stone wall)
 * - Zero Flashy Screen Overlays / Zero Background Glowing Halo
 * - Micro-interactions strictly scoped to wall camera sign (#hangingSign)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const hangingSign = document.getElementById('hangingSign');
  const photoModal = document.getElementById('photoModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalShutterTrigger = document.getElementById('modalShutterTrigger');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const miniStrips = document.querySelectorAll('.mini-strip, .pinned-photostrip');
  const galleryStrips = document.querySelectorAll('.gallery-strip-item, .hanging-strip-card');

  // Shutter Sound Mute State: Default is UNMUTED (per user specification)
  let isSoundMuted = false;

  // Preload layered shutter frames into browser cache
  const imgCacheIn = new Image();
  imgCacheIn.src = 'assets/camerashutter-in.png';
  const imgCacheOut = new Image();
  imgCacheOut.src = 'assets/camerashutter-out.png';

  // =========================================================================
  // 1. Universal Shutter Audio Engine (assets/shutter.wav)
  // =========================================================================
  let audioCtx = null;
  let shutterBuffer = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  // Preload WAV file into decoded Web Audio API buffer for instant 0ms, loud playback
  async function preloadShutterAudioBuffer() {
    try {
      const response = await fetch('assets/shutter.wav');
      const arrayBuffer = await response.arrayBuffer();
      initAudioContext();
      if (audioCtx) {
        audioCtx.decodeAudioData(
          arrayBuffer,
          (decoded) => {
            shutterBuffer = decoded;
          },
          (err) => {
            console.warn('decodeAudioData notice:', err);
          }
        );
      }
    } catch (e) {
      console.warn('Audio prefetch notice:', e);
    }
  }

  preloadShutterAudioBuffer();

  // Browser Autoplay Policy: Unlock audio immediately on first interaction
  function unlockAudioEngine() {
    initAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  ['pointerdown', 'click', 'touchstart', 'keydown'].forEach((evtType) => {
    window.addEventListener(evtType, unlockAudioEngine, { passive: true, once: true });
  });

  // Synthesized mechanical fallback
  function playSynthesizedShutter() {
    if (isSoundMuted) return; // Muted by user

    try {
      initAudioContext();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const now = audioCtx.currentTime;

      // Mechanical shutter "click" 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Metallic curtain snap
      const snapOsc = audioCtx.createOscillator();
      const snapGain = audioCtx.createGain();
      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(800, now + 0.06);
      snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      snapGain.gain.setValueAtTime(0.4, now + 0.06);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      snapOsc.connect(snapGain);
      snapGain.connect(audioCtx.destination);
      snapOsc.start(now + 0.06);
      snapOsc.stop(now + 0.12);

      // Shutter release "clack" 2
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(90, now + 0.22);
      gain2.gain.setValueAtTime(0.6, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.22);
    } catch (e) {}
  }

  // Master shutter sound trigger
  function playShutterSound() {
    if (isSoundMuted) return; // Muted by user

    initAudioContext();

    // 1. Try playing pre-decoded Web Audio API buffer (most reliable & loudest)
    if (audioCtx && shutterBuffer) {
      try {
        const source = audioCtx.createBufferSource();
        source.buffer = shutterBuffer;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.35; // Boosted volume for clear punchy shutter
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start(0);
        return;
      } catch (err) {
        console.warn('Web Audio buffer playback issue:', err);
      }
    }

    // 2. Fallback: Fresh HTML5 Audio instance
    try {
      const audioInstance = new Audio('assets/shutter.wav');
      audioInstance.volume = 1.0;
      const playPromise = audioInstance.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser restricted autoplay, fallback to synthesized audio
          playSynthesizedShutter();
        });
      }
    } catch (e) {
      playSynthesizedShutter();
    }
  }

  // =========================================================================
  // 2. Camera Shutter Lens Animation (ONLY lens in & out, no shake, no flash)
  // =========================================================================
  let isShutterAnimating = false;

  function executeCameraShutter() {
    // Always play the shutter audio immediately
    playShutterSound();

    if (isShutterAnimating) return;
    isShutterAnimating = true;

    if (!hangingSign) {
      isShutterAnimating = false;
      return;
    }

    // Animate ONLY the lens aperture in & out:
    // Step A (t = 0ms): Lens iris opens wide (camerashutter-in overlay appears)
    hangingSign.classList.add('state-shutter-in');

    // Step B (t = 130ms): Lens iris snaps down tight (revealing base camerashutter-out)
    setTimeout(() => {
      hangingSign.classList.remove('state-shutter-in');
    }, 130);

    // Step C (t = 270ms): Lens iris springs back open
    setTimeout(() => {
      hangingSign.classList.add('state-shutter-in');
    }, 270);

    // Step D (t = 430ms): Returns to resting default aperture (camerashutter-out)
    setTimeout(() => {
      hangingSign.classList.remove('state-shutter-in');
      isShutterAnimating = false;
    }, 430);
  }

  // =========================================================================
  // 3. Wall Camera Logo Interactions ONLY (Hover & Click)
  // =========================================================================
  if (hangingSign) {
    let lastHoverTime = 0;

    // Hover trigger (debounced by 1.2s so it doesn't stutter on micro cursor moves)
    hangingSign.addEventListener('mouseenter', () => {
      unlockAudioEngine();
      const now = Date.now();
      if (now - lastHoverTime > 1200) {
        lastHoverTime = now;
        executeCameraShutter();
      }
    });

    // Click trigger (instant unlock and audio firing)
    hangingSign.addEventListener('click', (e) => {
      e.stopPropagation();
      unlockAudioEngine();
      executeCameraShutter();
    });
  }

  // =========================================================================
  // 4. Lightbox Modal Inspection (Blackboard Mini Strips & Gallery)
  // =========================================================================
  function openModal() {
    if (photoModal) {
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

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal);
  }

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

  // Scrapbook board mini photostrips:
  // - NO sound on hover (per user requirement)
  // - Clicking opens the high-res inspection modal
  miniStrips.forEach((strip) => {
    strip.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal();
    });
  });

  // Gallery items open inspection modal
  galleryStrips.forEach((item) => {
    item.addEventListener('click', () => {
      openModal();
    });
  });

  // =========================================================================
  // 5. Neon Marquee Tube Flicker Animation
  // =========================================================================
  const marqueeLetters = document.querySelectorAll('.neon-letter');
  if (marqueeLetters.length > 0) {
    setInterval(() => {
      if (Math.random() < 0.22) {
        const randomIdx = Math.floor(Math.random() * marqueeLetters.length);
        const letter = marqueeLetters[randomIdx];
        letter.style.opacity = '0.35';
        letter.style.textShadow = '0 0 2px #fff';
        setTimeout(() => {
          letter.style.opacity = '1';
          letter.style.textShadow = '';
        }, 85);
      }
    }, 2800);
  }

  // =========================================================================
  // 6. Navigation Bar Shutter Sound Mute Toggle (Default: Unmuted)
  // =========================================================================
  if (soundToggleBtn) {
    const soundToggleLabel = soundToggleBtn.querySelector('.sound-toggle-label');

    soundToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSoundMuted = !isSoundMuted;

      if (isSoundMuted) {
        soundToggleBtn.classList.add('is-muted');
        soundToggleBtn.setAttribute('aria-pressed', 'true');
        soundToggleBtn.setAttribute('aria-label', 'Unmute shutter sound');
        soundToggleBtn.setAttribute('title', 'Unmute shutter sound');
        if (soundToggleLabel) soundToggleLabel.textContent = 'Sound OFF';
      } else {
        soundToggleBtn.classList.remove('is-muted');
        soundToggleBtn.setAttribute('aria-pressed', 'false');
        soundToggleBtn.setAttribute('aria-label', 'Mute shutter sound');
        soundToggleBtn.setAttribute('title', 'Mute shutter sound');
        if (soundToggleLabel) soundToggleLabel.textContent = 'Sound ON';
        unlockAudioEngine();
      }
    });
  }

});

