/* ── Glassmorphism Custom Cursor ───────────────────────────────── */
(function () {
    // Only enable on pointer (non-touch) devices
    if (!window.matchMedia('(hover: hover)').matches) return;

    // Create DOM elements
    const orb = document.createElement('div');
    orb.id = 'cursor-orb';
    const dot = document.createElement('div');
    dot.id = 'cursor-dot';
    document.body.appendChild(orb);
    document.body.appendChild(dot);
    document.body.classList.add('custom-cursor-active');

    // Spring state for the orb (lagged)
    let orbX = -100, orbY = -100;
    let dotX = -100, dotY = -100;
    let mouseX = -100, mouseY = -100;
    const ORB_SPEED = 0.12;   // 0–1: lower = more lag
    const DOT_SPEED = 1.0;    // dot snaps instantly

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
        orbX = lerp(orbX, mouseX, ORB_SPEED);
        orbY = lerp(orbY, mouseY, ORB_SPEED);
        dotX = lerp(dotX, mouseX, DOT_SPEED);
        dotY = lerp(dotY, mouseY, DOT_SPEED);

        orb.style.transform = `translate(calc(${orbX}px - 50%), calc(${orbY}px - 50%))`;
        dot.style.transform = `translate(calc(${dotX}px - 50%), calc(${dotY}px - 50%))`;

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Hover effect on interactive elements
    const hoverTargets = 'a, button, [role="button"], input, textarea, select, label, .project-card, .timeline-item, .cert-timeline-item, .hz-item-card, .hz-item-link, .hackathon-card-showcase, .center-text, .nav-link';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverTargets)) {
            orb.classList.add('hovering');
            dot.classList.add('hovering');
        }
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverTargets)) {
            orb.classList.remove('hovering');
            dot.classList.remove('hovering');
        }
    });

    // Click burst effect
    document.addEventListener('mousedown', () => {
        orb.classList.add('clicking');
        dot.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
        orb.classList.remove('clicking');
        dot.classList.remove('clicking');
    });

    // Hide when pointer leaves window
    document.addEventListener('mouseleave', () => {
        orb.style.opacity = '0';
        dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
        orb.style.opacity = '1';
        dot.style.opacity = '1';
    });
})();
/* ──────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    // 0. Initialize Lenis Smooth Scrolling Engine
    let lenis = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof Lenis !== 'undefined' && !reducedMotion) {
        lenis = new Lenis({
            duration: 1.35,                      // Luxurious smooth deceleration (higher = slower & smoother)
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration curve
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.82,              // Calibrated slow, non-jerky mouse wheel travel
            touchMultiplier: 1.2,
            infinite: false,
        });

        // Synchronize Lenis with GSAP ScrollTrigger
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);

            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });

            gsap.ticker.lagSmoothing(0);
        }

        // Pause Lenis while the welcome screen overlay is active
        if (document.body.classList.contains('welcome-active')) {
            lenis.stop();
            const welcomeObserver = new MutationObserver(() => {
                if (!document.body.classList.contains('welcome-active')) {
                    lenis.start();
                    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
                    welcomeObserver.disconnect();
                }
            });
            welcomeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }

        // Smooth scroll for in-page navigation anchors
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId && targetId !== '#') {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        lenis.scrollTo(targetEl, {
                            offset: -20,
                            duration: 1.35,
                            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                        });
                    }
                }
            });
        });
    }

    // 1. Smart Smooth Motion Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Add scrolled background glass state
        if (currentScrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Smart motion: hide on scroll down, reveal on scroll up
        if (currentScrollY > 150 && currentScrollY > lastScrollY) {
            navbar.classList.add('nav-hidden');
        } else {
            navbar.classList.remove('nav-hidden');
        }

        lastScrollY = currentScrollY;
    });

    // 2. Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Reset styles on resize
    window.addEventListener('resize', () => {
        if(window.innerWidth > 768) {
            navLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });

    // 3. GSAP Scrolling Animations
    if (typeof gsap !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Hero Content fade and slide up
        gsap.from('.hero-content > *', {
            opacity: 0,
            y: 40,
            duration: 1,
            stagger: 0.12,
            ease: 'power3.out'
        });

        // Hero Image slide in from right
        gsap.from('.hero-avatar', {
            opacity: 0,
            scale: 0.85,
            duration: 1.2,
            ease: 'back.out(1.2)',
            delay: 0.4
        });

        // 4. Horizontal Pinned-Scroll Timelines (Projects, Experience, Certifications)
        const timelineSections = document.querySelectorAll('.hz-timeline-section');

        timelineSections.forEach((section) => {
            const track = section.querySelector('.hz-timeline-track');
            const journeyLine = section.querySelector('.hz-journey-line');
            const items = section.querySelectorAll('.hz-item-card');
            const rail = section.querySelector('.hz-timeline-rail');
            const lead = section.querySelector('.hz-timeline-lead');

            if (!track || !rail || items.length === 0) return;

            const isMobile = window.innerWidth <= 900;

            if (isMobile) {
                // Mobile: clean vertical timeline with natural scrolling and scroll-reveals
                items.forEach((item) => {
                    item.classList.add('is-active');
                    const content = item.querySelector('.hz-item-content');
                    if (content) {
                        gsap.from(content, {
                            scrollTrigger: {
                                trigger: item,
                                start: 'top 88%',
                                toggleActions: 'play none none none'
                            },
                            opacity: 0,
                            y: 20,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                });
                return;
            }

            const isRTL = section.classList.contains('hz-timeline-rtl') || section.getAttribute('data-direction') === 'rtl';

            // Dynamically size rail and track tightly around actual cards so the center line ends right at the last card
            let maxCardSpan = 0;
            const rowTop = section.querySelector('.hz-row-top');
            const rowBottom = section.querySelector('.hz-row-bottom');
            if (rowTop) maxCardSpan = Math.max(maxCardSpan, rowTop.scrollWidth);
            if (rowBottom) maxCardSpan = Math.max(maxCardSpan, rowBottom.scrollWidth);

            items.forEach((item) => {
                const right = item.offsetLeft + item.offsetWidth;
                if (right > maxCardSpan) maxCardSpan = right;
            });

            // Generous end buffer so the arrow reaches comfortably past the last card to the end dot
            const endBuffer = 260;
            const totalRailWidth = Math.max(maxCardSpan + endBuffer, window.innerWidth * 0.85);
            rail.style.width = `${totalRailWidth}px`;
            rail.style.minWidth = `${totalRailWidth}px`;

            const leadWidth = lead ? lead.offsetWidth : 320;
            const totalTrackWidth = leadWidth + totalRailWidth + 160;
            track.style.width = `${totalTrackWidth}px`;
            track.style.minWidth = `${totalTrackWidth}px`;

            // Calculate precise travel distance so full track, last card, and end arrow slide completely into view
            const getTravelDistance = () => {
                const distance = track.scrollWidth - window.innerWidth + 80;
                return -Math.max(0, distance);
            };

            // Initial position for RTL: start shifted to right edge so lead & first role appear on arrival
            if (isRTL) {
                gsap.set(track, { x: () => getTravelDistance() });
            }

            // Master Timeline: scrub: 1.2 gives silky-smooth damping and relaxed gliding motion
            const masterTl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1.2,
                    invalidateOnRefresh: true,
                }
            });

            // -------------------------------------------------------------
            // PHASE 1: Gentle Entry Buffer (0.00 to 0.06)
            // When user arrives, section locks full-page smoothly.
            // -------------------------------------------------------------

            // -------------------------------------------------------------
            // PHASE 2: Active Motion (0.06 to 0.88)
            // Track slides and the center journey arrow moves leisurely across
            // the rail, giving ample, slow-paced time to absorb each card!
            // LTR tracks slide from 0 to -distance.
            // RTL tracks slide from -distance to 0 (Right to Left flow)!
            // -------------------------------------------------------------
            masterTl.fromTo(track, 
                { x: () => (isRTL ? getTravelDistance() : 0) }, 
                {
                    x: () => (isRTL ? 0 : getTravelDistance()),
                    ease: 'none',
                    duration: 0.82,
                },
                0.06
            );

            if (journeyLine) {
                masterTl.fromTo(journeyLine,
                    { width: '0%' },
                    {
                        width: '100%',
                        ease: 'none',
                        duration: 0.82,
                    },
                    0.06
                );
            }

            // Milestone items activate progressively across the wider duration
            const count = items.length;
            items.forEach((item, index) => {
                const stem = item.querySelector('.hz-stem');
                const dot = item.querySelector('.hz-dot');
                const arrow = item.querySelector('.hz-arrow');
                const content = item.querySelector('.hz-item-content');

                if (reducedMotion) {
                    if (journeyLine) gsap.set(journeyLine, { width: '100%' });
                    if (stem) gsap.set(stem, { scaleY: 1 });
                    if (dot) gsap.set(dot, { scale: 1 });
                    if (arrow) gsap.set(arrow, { scale: 1 });
                    if (content) gsap.set(content, { opacity: 1, scale: 1 });
                    return;
                }

                if (stem) gsap.set(stem, { scaleY: 0 });
                if (dot) gsap.set(dot, { scale: 0 });
                if (arrow) gsap.set(arrow, { scale: 0 });
                if (content) gsap.set(content, { opacity: 0.75, scale: 0.98 });

                // Spreads milestones comfortably across the 0.08 to 0.84 progression
                const itemTime = count <= 1 ? 0.15 : 0.08 + (index / (count - 1)) * 0.74;

                if (dot) {
                    masterTl.to(dot, {
                        scale: 1,
                        duration: 0.07,
                        ease: 'back.out(1.5)'
                    }, itemTime);
                }

                if (stem) {
                    masterTl.to(stem, {
                        scaleY: 1,
                        duration: 0.08,
                        ease: 'power2.out'
                    }, itemTime + 0.01);
                }

                if (arrow) {
                    masterTl.to(arrow, {
                        scale: 1,
                        duration: 0.07,
                        ease: 'back.out(1.5)'
                    }, itemTime + 0.02);
                }

                if (content) {
                    masterTl.to(content, {
                        opacity: 1,
                        scale: 1,
                        duration: 0.08,
                        ease: 'power2.out',
                        onStart: () => item.classList.add('is-active'),
                        onReverseComplete: () => item.classList.remove('is-active')
                    }, itemTime + 0.02);
                }
            });

            // -------------------------------------------------------------
            // PHASE 3: Exit Hold / Dwell Buffer (0.88 to 1.00)
            // Holds the final completed state cleanly before unpinning.
            // -------------------------------------------------------------
            masterTl.to({}, { duration: 0.12 }, 0.88);
        });

        // 5. Hackathons Showcase Animation
        gsap.from('.hackathon-card-showcase', {
            scrollTrigger: {
                trigger: '#hackathons',
                start: 'top 80%',
                toggleActions: 'play none none none'
            },
            opacity: 0,
            y: 40,
            duration: 0.8,
            ease: 'power2.out'
        });

        // Refresh triggers on resize and asset load
        window.addEventListener('resize', () => ScrollTrigger.refresh());
        window.addEventListener('load', () => ScrollTrigger.refresh());
    }
});

