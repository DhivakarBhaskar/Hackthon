document.addEventListener('DOMContentLoaded', function () {
    // ---- Page Transitions ----
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 50);

    const links = document.querySelectorAll('a[href]:not([target="_blank"])');
    links.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.hostname === window.location.hostname && !this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const target = this.getAttribute('href');
                document.body.classList.remove('loaded');
                setTimeout(() => {
                    window.location.href = target;
                }, 400); // Wait for fade out
            }
        });
    });

    // ---- Count Up Animation ----
    const countElements = document.querySelectorAll('.count-up');

    countElements.forEach(el => {
        const target = parseFloat(el.getAttribute('data-value'));
        const duration = 1500; // ms
        const frameRate = 30; // ms
        const totalFrames = duration / frameRate;
        let frame = 0;

        const counter = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = target * easeOutQuart;

            // Format check if it has decimals
            if (target % 1 !== 0) {
                el.innerText = current.toFixed(2);
            } else {
                el.innerText = Math.round(current);
            }

            if (frame >= totalFrames) {
                clearInterval(counter);
                el.innerText = target % 1 !== 0 ? target.toFixed(2) : target;
            }
        }, frameRate);
    });

    // ---- Progress Bar Animation ----
    setTimeout(() => {
        document.querySelectorAll('.progress-bar').forEach(bar => {
            bar.style.width = bar.getAttribute('data-width');
        });
    }, 500);

    // ---- Mouse Move Parallax 3D Effect ----
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    if (parallaxLayers.length > 0 && window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth - e.pageX) / 20;
            const y = (window.innerHeight - e.pageY) / 20;

            parallaxLayers.forEach(layer => {
                const speed = layer.getAttribute('data-speed') || 0.05;
                const xOffset = x * speed;
                const yOffset = y * speed;
                layer.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            });
        });
    }

    // ---- Theme Toggle (Forced Dark for Fintech, but works if toggled) ----
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const htmlEl = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default dark for Fintech

    if (savedTheme === 'dark') {
        htmlEl.setAttribute('data-bs-theme', 'dark');
        if (themeIcon) { themeIcon.classList.replace('bi-moon-fill', 'bi-sun-fill'); }
    } else {
        htmlEl.setAttribute('data-bs-theme', 'light');
        if (themeIcon) { themeIcon.classList.replace('bi-sun-fill', 'bi-moon-fill'); }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            if (htmlEl.getAttribute('data-bs-theme') === 'dark') {
                htmlEl.setAttribute('data-bs-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('bi-sun-fill', 'bi-moon-fill');
            } else {
                htmlEl.setAttribute('data-bs-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('bi-moon-fill', 'bi-sun-fill');
            }
            updateChartsTheme();
        });
    }

    // ---- Sidebar Toggle ----
    const menuToggle = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    if (menuToggle && wrapper) {
        menuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            wrapper.classList.toggle('toggled');
        });
    }

    // ---- Insights Dropdown Toggle (Sidebar) ----
    const insightsToggle = document.getElementById('insights-toggle');
    const insightsSubmenu = document.getElementById('insights-submenu');
    if (insightsToggle && insightsSubmenu) {
        insightsToggle.addEventListener('click', function (e) {
            // Prevent navigation + prevent page transition handler from doing anything
            e.preventDefault();

            const isOpen = insightsSubmenu.classList.toggle('show');
            insightsToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    }

    // ---- Smart Import ----
    const smartImportBtn = document.getElementById('smart-import-btn');
    const smartImportText = document.getElementById('smart-import-text');
    const smartImportResult = document.getElementById('smart-import-result');

    if (smartImportBtn) {
        smartImportBtn.addEventListener('click', async function () {
            const message = smartImportText.value.trim();
            if (!message) return;

            const btnText = this.querySelector('.normal-text');
            const spinner = this.querySelector('.spinner-border');
            btnText.classList.add('d-none');
            spinner.classList.remove('d-none');
            this.disabled = true;

            try {
                const response = await fetch('/smart_import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });

                const data = await response.json();

                if (data.success) {
                    smartImportResult.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Imported successfully: <strong>₹${data.amount}</strong> mapped to <strong>${data.category}</strong> (${data.type})`;
                    smartImportResult.className = 'mt-3 text-success small fw-bold p-2 rounded bg-success bg-opacity-10 border-start border-success border-4 shadow-sm';
                    smartImportText.value = '';
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    smartImportResult.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> Failed: ${data.error || 'Amount not found in text.'}`;
                    smartImportResult.className = 'mt-3 text-danger small fw-bold p-2 rounded bg-danger bg-opacity-10 border-start border-danger border-4 shadow-sm';
                }
            } catch (err) {
                console.error(err);
                smartImportResult.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i> Error processing request.`;
                smartImportResult.className = 'mt-3 text-danger small fw-bold p-2 rounded bg-danger bg-opacity-10 border-start border-danger border-4 shadow-sm';
            } finally {
                btnText.classList.remove('d-none');
                spinner.classList.add('d-none');
                smartImportBtn.disabled = false;
            }
        });
    }

    // ---- Optional Chart Theme Sync (only affects pages that load Chart.js) ----
    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        const isDark = htmlEl.getAttribute('data-bs-theme') === 'dark';
        Chart.defaults.color = isDark ? 'rgba(253,245,230,0.7)' : '#6c757d';
    }

    // ---- Can I Spend? Logic (legacy, only if old hidden fields exist) ----
    const calcBtn = document.getElementById('calculateSpendBtn');
    const legacySafeLimitInput = document.getElementById('sys-safe-limit');
    if (calcBtn && legacySafeLimitInput) {
        calcBtn.addEventListener('click', function () {
            const inputVal = parseFloat(document.getElementById('spendEstimateInput').value);
            if (isNaN(inputVal) || inputVal <= 0) return;

            const safeLimit = parseFloat(document.getElementById('sys-safe-limit').value);
            const balance = parseFloat(document.getElementById('sys-balance').value);
            const remainingDays = parseFloat(document.getElementById('sys-remaining-days').value) || 1;

            const resultArea = document.getElementById('spendResultArea');
            const icon = document.getElementById('spendResultIcon');
            const msg = document.getElementById('spendResultMessage');
            const subtext = document.getElementById('spendResultSubtext');

            resultArea.classList.remove('d-none');
            resultArea.classList.add('fade-in');

            // Re-calculate future limit
            const futureBalance = balance - inputVal;
            const tomorrowDays = remainingDays > 1 ? remainingDays - 1 : 1;
            const newSafeTomorrow = futureBalance > 0 ? (futureBalance / tomorrowDays) : 0;

            if (inputVal <= safeLimit) {
                // Green
                icon.innerHTML = '🟢';
                msg.className = 'alert alert-success fw-bold mb-3 shadow-sm border-2';
                msg.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>You can spend this safely today.';
            } else if (inputVal <= safeLimit * 1.5) {
                // Yellow
                icon.innerHTML = '🟡';
                msg.className = 'alert alert-warning fw-bold mb-3 shadow-sm border-2';
                msg.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>This will reduce your budget for tomorrow.';
            } else {
                // Red
                icon.innerHTML = '🔴';
                msg.className = 'alert alert-danger fw-bold mb-3 shadow-sm border-2';
                // Estimate burnout
                const extremeDaily = inputVal;
                let daysLeft = 0;
                if (extremeDaily > 0) {
                    daysLeft = Math.floor(balance / extremeDaily);
                }
                msg.innerHTML = `<i class="bi bi-x-octagon-fill me-2"></i>Not recommended. This may cause you to run out of money in ${daysLeft} days.`;
            }

            subtext.innerHTML = `Your new safe spending tomorrow will be <span class="text-primary fw-bolder">₹${newSafeTomorrow.toFixed(2)}</span>.`;
        });
    }

    // ==== SYSTEM ACTIVATION LOGIN SCREEN LOGIC ====
    const liveIntelList = document.getElementById('live-intelligence-list');
    if (liveIntelList && liveIntelList.children.length > 0) {
        let currentItem = 0;
        const totalItems = liveIntelList.children.length;

        // Setup initial styles for smooth translation
        Array.from(liveIntelList.children).forEach(li => {
            li.style.height = '24px'; // Force consistent height
            li.style.lineHeight = '24px';
        });

        setInterval(() => {
            currentItem = (currentItem + 1) % totalItems;
            liveIntelList.style.transform = `translateY(-${currentItem * 24}px)`;
        }, 2200);
    }

    const loginForm = document.getElementById('loginForm');
    const loginOverlay = document.getElementById('login-overlay');
    const loginProgress = document.getElementById('login-progress');

    if (loginForm && loginOverlay && loginProgress) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Pause submission

            // Show overlay screen
            loginOverlay.classList.remove('d-none');
            loginOverlay.classList.add('d-flex');

            // Trigger CSS transition progress bar
            loginProgress.style.transition = 'width 2.2s cubic-bezier(0.25, 0.8, 0.25, 1)';
            setTimeout(() => {
                loginProgress.style.width = '100%';
            }, 50);

            // Actually submit the form payload after animation
            setTimeout(() => {
                loginForm.submit();
            }, 2200);
        });
    }
});
