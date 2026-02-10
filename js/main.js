/* ===================================
   Montáže EPS - Main JavaScript v2
   =================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- Navbar scroll effect ---
    const navbar = document.getElementById('navbar');
    if (navbar && !navbar.classList.contains('scrolled')) {
        const handleScroll = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // --- Mobile menu ---
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    const navClose = document.getElementById('navClose');

    if (hamburger && navLinks) {
        const closeMenu = () => {
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        };

        const openMenu = () => {
            navLinks.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navLinks.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Close button
        if (navClose) {
            navClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMenu();
            });
        }

        // Close on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });
    }

    // --- Floating CTA ---
    const floatingCta = document.getElementById('floatingCta');
    const poptavkaSection = document.getElementById('poptavka') || document.getElementById('service-poptavka');

    if (floatingCta && poptavkaSection) {
        const handleFloatingCta = () => {
            const scrolled = window.scrollY > 600;
            const rect = poptavkaSection.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            floatingCta.classList.toggle('visible', scrolled && !isVisible);
        };
        window.addEventListener('scroll', handleFloatingCta, { passive: true });
    }

    // --- Scroll animations ---
    const animateElements = () => {
        const selectors = '.service-card, .process-step, .reference-card, .feature, .visual-stat, .contact-item, .service-feature-card';
        const elements = document.querySelectorAll(selectors);

        if (!elements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Stagger delay based on sibling index
                    const parent = entry.target.parentElement;
                    const siblings = parent ? Array.from(parent.children) : [];
                    const index = siblings.indexOf(entry.target);
                    setTimeout(() => {
                        entry.target.classList.add('animate-in');
                    }, index * 80);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    };

    animateElements();

    // --- Counter animation for hero stats ---
    const animateCounters = () => {
        const counters = document.querySelectorAll('.stat-number[data-target]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target);
                    const duration = 1800;
                    const start = performance.now();

                    const update = (now) => {
                        const progress = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);
                        el.textContent = Math.round(target * eased);
                        if (progress < 1) requestAnimationFrame(update);
                    };

                    requestAnimationFrame(update);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    };

    animateCounters();

    // --- Form handling with Supabase ---
    const form = document.getElementById('contactForm');
    if (form) {
        // Auto-select service from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const serviceParam = urlParams.get('service');
        if (serviceParam) {
            const serviceSelect = form.querySelector('#service');
            if (serviceSelect) serviceSelect.value = serviceParam;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            // Loading state
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="spin">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10" stroke-linecap="round"/>
                </svg>
                Odesílám...
            `;
            btn.disabled = true;

            const formData = {
                name: form.querySelector('#name').value,
                email: form.querySelector('#email').value,
                phone: form.querySelector('#phone').value,
                service: form.querySelector('#service').value,
                message: form.querySelector('#message').value,
                page: window.location.pathname,
                created_at: new Date().toISOString()
            };

            try {
                // Try Supabase first
                if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
                    const { error } = await window.supabaseClient
                        .from('inquiries')
                        .insert([formData]);

                    if (error) throw error;
                } else {
                    // Fallback: send to Vercel serverless function
                    const res = await fetch('/api/inquiry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Chyba při odesílání');
                    }
                }

                // Success
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Poptávka odeslána!
                `;
                btn.style.background = '#22c55e';
                form.reset();

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);

            } catch (err) {
                console.error('Form error:', err);
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Chyba - zkuste to znovu
                `;
                btn.style.background = '#ef4444';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }
        });
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = 80;
                const position = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: position, behavior: 'smooth' });
            }
        });
    });

    // --- Trust logos pause on hover ---
    const trustTrack = document.querySelector('.trust-logos-track');
    if (trustTrack) {
        trustTrack.addEventListener('mouseenter', () => {
            trustTrack.style.animationPlayState = 'paused';
        });
        trustTrack.addEventListener('mouseleave', () => {
            trustTrack.style.animationPlayState = 'running';
        });
    }

});
