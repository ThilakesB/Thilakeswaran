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
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        timelineSections.forEach((section) => {
            const track = section.querySelector('.hz-timeline-track');
            const journeyLine = section.querySelector('.hz-journey-line');
            const items = section.querySelectorAll('.hz-item-card');

            if (!track) return;

            const isMobile = window.innerWidth < 600;
            const slideEnd = isMobile ? '85% 50%' : '95% bottom';
            const lineStart = isMobile ? 'top 30%' : 'top 25%';
            const lineEnd = isMobile ? '80% 50%' : '92% bottom';

            // Calculate precise travel distance so full track and all cards slide into view
            const getTravelDistance = () => {
                const pad = isMobile ? 30 : 60;
                return -(track.scrollWidth - window.innerWidth + pad);
            };

            // Horizontal Track Scrub
            gsap.fromTo(track, 
                { x: 0 }, 
                {
                    x: () => getTravelDistance(),
                    ease: 'none',
                    scrollTrigger: {
                        trigger: section,
                        start: 'top top',
                        end: slideEnd,
                        scrub: 1,
                        invalidateOnRefresh: true,
                    }
                }
            );

            // Center Journey Line Progression
            if (reducedMotion) {
                if (journeyLine) gsap.set(journeyLine, { width: '100%' });
                section.querySelectorAll('.hz-stem').forEach(stem => gsap.set(stem, { scaleY: 1 }));
                section.querySelectorAll('.hz-dot').forEach(dot => gsap.set(dot, { scale: 1 }));
                section.querySelectorAll('.hz-item-content').forEach(c => gsap.set(c, { opacity: 1, y: 0 }));
                return;
            }

            if (journeyLine) {
                gsap.to(journeyLine, {
                    width: '100%',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: section,
                        start: lineStart,
                        end: lineEnd,
                        scrub: 1,
                    }
                });
            }

            // Dynamic Milestone Animations (Stems, Dots, Content Reveal)
            const count = items.length;
            const minStart = isMobile ? 22 : 6;
            const maxStart = isMobile ? 69 : 65;
            const span = isMobile ? 10 : 20;

            items.forEach((item, index) => {
                const stem = item.querySelector('.hz-stem');
                const dot = item.querySelector('.hz-dot');
                const arrow = item.querySelector('.hz-arrow');
                const content = item.querySelector('.hz-item-content');

                if (stem) gsap.set(stem, { scaleY: 0 });
                if (dot) gsap.set(dot, { scale: 0 });
                if (arrow) gsap.set(arrow, { scale: 0 });
                if (content) gsap.set(content, { opacity: 0.75, scale: 0.98 });

                const startPos = count <= 1 ? minStart : minStart + (index / (count - 1)) * (maxStart - minStart);
                const endPos = startPos + span;

                const itemTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: section,
                        start: `${startPos}% 30%`,
                        end: `${endPos}% 50%`,
                        scrub: 1,
                    }
                });

                if (dot) {
                    itemTl.to(dot, {
                        scale: 1,
                        duration: 0.25,
                        ease: 'back.out(2)'
                    });
                }

                if (stem) {
                    itemTl.to(stem, {
                        scaleY: 1,
                        duration: 0.35,
                        ease: 'power2.out'
                    }, '<');
                }

                if (arrow) {
                    itemTl.to(arrow, {
                        scale: 1,
                        duration: 0.25,
                        ease: 'back.out(2)'
                    }, '-=0.1');
                }

                if (content) {
                    itemTl.to(content, {
                        opacity: 1,
                        scale: 1,
                        duration: 0.35,
                        ease: 'power2.out',
                        onStart: () => item.classList.add('is-active'),
                        onReverseComplete: () => item.classList.remove('is-active')
                    }, '-=0.2');
                }
            });
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

