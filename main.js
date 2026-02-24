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

    // ==== AI FINANCIAL COMMAND CENTER LOGIC ====
    if (window.FIN_DATA) {
        const d = window.FIN_DATA;
        const avgDaily = d.expenseTotal / Math.max(1, d.currentDayOfMonth);
        const inferredBalance = Math.max(0, d.incomeTotal - d.expenseTotal);
        const survival_days = avgDaily > 0 ? (inferredBalance / avgDaily) : 999;
        const projectedSavings = d.incomeTotal - (avgDaily * d.daysInMonth);
        const safeDaily = inferredBalance / Math.max(1, (d.daysInMonth - d.currentDayOfMonth));

        // 1. Top Prediction Strip Text
        const predictionText = document.getElementById('aiPredictionText');
        if (predictionText) {
            setTimeout(() => {
                if (d.incomeTotal === 0 && d.expenseTotal === 0) {
                    predictionText.innerHTML = `<i class="bi bi-info-circle text-info me-2"></i> Awaiting Data Input`;
                } else if (survival_days < (d.daysInMonth - d.currentDayOfMonth)) {
                    predictionText.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i> WARNING: You may run out of money in ${Math.floor(survival_days)} days`;
                } else {
                    predictionText.innerHTML = `<i class="bi bi-shield-check text-success me-2"></i> SYSTEM OPTIMAL: You are safe for the rest of the month`;
                }
            }, 800); // Fake analyzing delay
        }

        // 2. Animate Circular Gauges
        function setGauge(id, percent, textId, textVal) {
            const gauge = document.getElementById(id);
            const textEl = document.getElementById(textId);
            if (gauge && textEl) {
                // SVG dasharray logic (100 is full circle in this viewBox)
                const safePercent = Math.min(Math.max(percent, 0), 100);
                setTimeout(() => {
                    gauge.style.strokeDasharray = `${safePercent}, 100`;
                    textEl.textContent = textVal;
                }, 500); // Delayed start for effect
            }
        }

        // Gauge 1: Balance Health
        const balancePercent = d.incomeTotal > 0 ? (inferredBalance / d.incomeTotal) * 100 : 0;
        setGauge('gauge-balance', balancePercent, 'text-balance', Math.round(balancePercent) + '%');

        // Gauge 2: Survival Time
        const survivalPercent = (Math.min(survival_days, d.daysInMonth) / d.daysInMonth) * 100;
        setGauge('gauge-days', survivalPercent, 'text-days', survival_days > 900 ? '99+ d' : Math.floor(survival_days) + 'd');

        // Gauge 3: Projected Savings
        const savingsPercent = d.incomeTotal > 0 ? (Math.max(0, projectedSavings) / d.incomeTotal) * 100 : 0;
        setGauge('gauge-savings', savingsPercent, 'text-savings', '₹' + Math.max(0, Math.round(projectedSavings)));

        // Gauge 4: Safe Daily Spend
        const safeDailyPercent = avgDaily > 0 ? (safeDaily / avgDaily) * 50 : 0; // Relative to current avg
        setGauge('gauge-safe-spend', safeDailyPercent, 'text-safe-spend', '₹' + Math.round(safeDaily));

        // 3. Smart Suggestion Engine (Food > 40%)
        const smartPanel = document.getElementById('smartSuggestionPanel');
        const smartText = document.getElementById('aiSuggestionText');
        const smartCatLabels = Array.isArray(d.categoryLabels) ? d.categoryLabels : [];
        const smartCatValues = Array.isArray(d.categoryValues) ? d.categoryValues : [];
        if (smartPanel && smartText && smartCatLabels.length > 0 && smartCatValues.length > 0) {
            let totalFood = 0;
            const foodIndex = smartCatLabels.findIndex(l => l.toLowerCase() === 'food' || l.toLowerCase() === 'dining');
            if (foodIndex !== -1) totalFood = smartCatValues[foodIndex];

            const foodRatio = d.expenseTotal > 0 ? (totalFood / d.expenseTotal) : 0;
            if (foodRatio > 0.40) {
                setTimeout(() => {
                    smartPanel.style.display = 'block';
                    const potentialSavings = Math.round(totalFood * 0.15); // Assume 15% saving
                    smartText.innerHTML = `Food expenses form <strong>${Math.round(foodRatio * 100)}%</strong> of your spending. Cooking at home 2 times this week could save you <strong>₹${potentialSavings}</strong>.`;
                }, 1200);
            }
        }

        // 4. Inject Insight Texts under charts
        const pieInsight = document.getElementById('pieChartInsight');
        const pieValues = Array.isArray(d.categoryValues) ? d.categoryValues : [];
        const pieLabels = Array.isArray(d.categoryLabels) ? d.categoryLabels : [];
        if (pieInsight && pieValues.length > 0 && d.expenseTotal > 0) {
            const maxVal = Math.max(...pieValues);
            const maxIdx = pieValues.indexOf(maxVal);
            const pct = Math.round((maxVal / d.expenseTotal) * 100);
            const label = pieLabels[maxIdx] || 'Spending';
            pieInsight.innerHTML = `<i class="bi bi-robot me-1"></i> <strong>${label}</strong> forms ${pct}% of your monthly spending`;
        }

        const weekInsight = document.getElementById('weeklyChartInsight');
        const weekVals = Array.isArray(d.weekdayValues) ? d.weekdayValues : [];
        const weekLabels = Array.isArray(d.weekdayLabels) ? d.weekdayLabels : [];
        if (weekInsight && weekVals.length > 0) {
            const maxVal = Math.max(...weekVals);
            const maxIdx = weekVals.indexOf(maxVal);
            const label = weekLabels[maxIdx] || '';
            if (label === 'Saturday' || label === 'Sunday') {
                weekInsight.innerHTML = `<i class="bi bi-exclamation-circle text-danger me-1"></i> You are overspending on weekends. (${label})`;
            } else {
                weekInsight.innerHTML = `<i class="bi bi-graph-up text-warning me-1"></i> <strong>${label}</strong> is your highest burning day.`;
            }
        }
    }

    // ==== Chart.js Initialization ====
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Space Grotesk', sans-serif";
        Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    }
    let charts = {};

    // Custom Plugin to display text in the center of Doughnut chart
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function (chart) {
            if (chart.config.type !== 'doughnut') return;

            var width = chart.width,
                height = chart.height,
                ctx = chart.ctx;

            ctx.restore();
            var fontSize = (height / 160).toFixed(2);
            ctx.textBaseline = "middle";

            // Calculate Total
            let total = 0;
            if (chart.data.datasets.length > 0) {
                total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            }
            var text = "₹" + total.toLocaleString();

            // Subtext (Top Category)
            let maxIndex = 0;
            let maxVal = -1;
            if (chart.data.datasets.length > 0 && chart.data.datasets[0].data.length > 0) {
                chart.data.datasets[0].data.forEach((val, index) => {
                    if (val > maxVal) { maxVal = val; maxIndex = index; }
                });
            }
            var subtext = total > 0 ? chart.data.labels[maxIndex] : "No Data";
            var pctText = total > 0 ? `(${Math.round((maxVal / total) * 100)}%)` : "";

            // Draw Main text (Total)
            ctx.font = "bold " + fontSize + "em 'Space Grotesk'";
            ctx.fillStyle = "#ffaa00";
            var textX = Math.round((width - ctx.measureText(text).width) / 2),
                textY = height / 2 - 15;
            ctx.fillText(text, textX, textY);

            // Draw Subtext (Category)
            ctx.font = "500 " + (fontSize * 0.40).toFixed(2) + "em 'Outfit'";
            ctx.fillStyle = "#8a8a9e";
            var subtextX = Math.round((width - ctx.measureText(subtext).width) / 2),
                subtextY = height / 2 + 10;
            ctx.fillText(subtext, subtextX, subtextY);

            // Draw Percent text
            ctx.fillStyle = "#00e5ff";
            var pctTextX = Math.round((width - ctx.measureText(pctText).width) / 2),
                pctTextY = height / 2 + 30;
            ctx.fillText(pctText, pctTextX, pctTextY);

            ctx.save();
        }
    };

    // Tech Grid Plugin for all charts
    const techGridPlugin = {
        id: 'techGridPlugin',
        beforeDraw: function (chart) {
            if (chart.config.type === 'doughnut' || chart.config.type === 'pie') return;
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            if (!chartArea) return;
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const step = 40;
            // Draw vertical lines
            for (let x = chartArea.left; x <= chartArea.right; x += step) {
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
            }
            // Draw horizontal lines
            for (let y = chartArea.top; y <= chartArea.bottom; y += step) {
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
            }
            ctx.stroke();
            ctx.restore();
        }
    };

    // Custom limit line plugin for Daily Line Chart
    const limitLinePlugin = {
        id: 'limitLine',
        afterDraw: function (chart) {
            if (chart.canvas.id !== 'dailyLineChart') return;
            const safeDailyLimit = parseFloat(document.getElementById('sys-safe-limit')?.value) || 0;
            if (safeDailyLimit <= 0) return;

            const ctx = chart.ctx;
            const yAxis = chart.scales.y;
            const xAxis = chart.scales.x;
            const yPixel = yAxis.getPixelForValue(safeDailyLimit);

            if (yPixel > yAxis.bottom || yPixel < yAxis.top) return;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xAxis.left, yPixel);
            ctx.lineTo(xAxis.right, yPixel);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
            ctx.font = "bold 10px 'Outfit'";
            ctx.fillText("SAFE LIMIT", xAxis.right - 70, yPixel - 5);
            ctx.restore();
        }
    };

    if (typeof Chart !== 'undefined') {
        Chart.register(techGridPlugin);
    }

    function createCharts() {
        const moneyLeakCtx = document.getElementById('moneyLeakChart');
        const dailyCtx = document.getElementById('dailyTrendChart');
        const incExpCtx = document.getElementById('incomeExpenseChart');
        const weeklyCtx = document.getElementById('weeklyRiskChart');
        const stabilityCtx = document.getElementById('stabilityScoreChart');

        const customTooltip = {
            backgroundColor: 'rgba(10, 10, 12, 0.95)',
            titleFont: { family: "'Space Grotesk'", size: 14, weight: 'bold' },
            bodyFont: { family: "'Outfit'", size: 13 },
            borderColor: 'rgba(0, 229, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)',
            callbacks: {
                label: function (context) {
                    let label = context.dataset.label || '';
                    if (label) { label += ': '; }
                    if (context.parsed.y !== null && context.parsed.y !== undefined) {
                        label += '₹' + context.parsed.y.toLocaleString();
                    } else if (context.parsed !== null) {
                        label += '₹' + context.parsed.toLocaleString();
                    }
                    return label;
                }
            }
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, color: '#8a8a9e', font: { family: "'Space Grotesk'" } } },
                tooltip: customTooltip
            },
            hover: {
                mode: 'nearest',
                intersect: true,
                animationDuration: 400
            }
        };

        // 1. Money Leak Chart (Doughnut)
        if (moneyLeakCtx) {
            const labels = window.FIN_DATA ? window.FIN_DATA.categoryLabels : [];
            const values = window.FIN_DATA ? window.FIN_DATA.categoryValues : [];

            if (labels && labels.length > 0) {
                charts.pie = new Chart(moneyLeakCtx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: ['#b200ff', '#00e5ff', '#ffaa00', '#ff0055', '#00ffaa', '#ffbb33', '#ff2a2a', '#00bcd4'],
                            borderColor: 'transparent',
                            borderWidth: 2,
                            hoverOffset: 15,
                            hoverBorderColor: 'rgba(0,229,255,0.5)',
                            hoverBorderWidth: 2,
                        }]
                    },
                    plugins: [centerTextPlugin],
                    options: {
                        ...commonOptions,
                        cutout: '68%',
                        layout: { padding: 20 },
                        elements: {
                            arc: { shadowOffsetX: 0, shadowOffsetY: 0, shadowBlur: 15, shadowColor: 'rgba(255, 170, 0, 0.5)' }
                        }
                    }
                });
            } else {
                moneyLeakCtx.parentElement.innerHTML = '<div class="text-center text-muted mt-5">No transaction data yet</div>';
            }
        }

        // 2. Daily Spending Trend (Line)
        if (dailyCtx) {
            const labels = window.FIN_DATA ? window.FIN_DATA.dailyLabels : [];
            const values = window.FIN_DATA ? window.FIN_DATA.dailyValues : [];

            if (labels && labels.length > 0) {
                const gradient = dailyCtx.getContext('2d').createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
                gradient.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

                charts.line = new Chart(dailyCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Daily Spent',
                            data: values,
                            borderColor: '#00e5ff',
                            backgroundColor: gradient,
                            borderWidth: 4,
                            tension: 0.45,
                            fill: true,
                            pointRadius: context => context.dataIndex === context.chart.data.labels.length - 1 ? 6 : 0,
                            pointHoverRadius: 8,
                            pointBackgroundColor: '#00e5ff',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            hoverBackgroundColor: '#fff'
                        }]
                    },
                    plugins: [limitLinePlugin],
                    options: {
                        ...commonOptions,
                        plugins: { legend: { display: false }, tooltip: customTooltip },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { family: "'Space Grotesk'" } } },
                            x: { grid: { display: false, drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { family: "'Space Grotesk'" } } }
                        },
                        interaction: { intersect: false, mode: 'index' }
                    }
                });
            } else {
                dailyCtx.parentElement.innerHTML = '<div class="text-center text-muted mt-5">No transaction data yet</div>';
            }
        }

        // 3. Income vs Expense (Bar)
        if (incExpCtx) {
            const tIncome = window.FIN_DATA ? window.FIN_DATA.totalIncome : 0;
            const tExpense = window.FIN_DATA ? window.FIN_DATA.totalExpense : 0;

            if (tIncome > 0 || tExpense > 0) {
                charts.incExpBar = new Chart(incExpCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Income', 'Expense'],
                        datasets: [{
                            label: 'Amount',
                            data: [tIncome, tExpense],
                            backgroundColor: function (context) {
                                const chart = context.chart;
                                const { ctx, chartArea } = chart;
                                if (!chartArea) return null;
                                let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                                if (context.dataIndex === 0) {
                                    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.2)');
                                    gradient.addColorStop(1, 'rgba(0, 229, 255, 0.9)');
                                } else {
                                    gradient.addColorStop(0, 'rgba(255, 0, 85, 0.2)');
                                    gradient.addColorStop(1, 'rgba(255, 0, 85, 0.9)');
                                }
                                return gradient;
                            },
                            hoverBackgroundColor: function (context) { return context.dataIndex === 0 ? '#80f2ff' : '#ff4d88'; },
                            borderRadius: 8,
                            barPercentage: 0.5
                        }]
                    },
                    options: {
                        ...commonOptions,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { family: "'Space Grotesk'" } } },
                            x: { grid: { display: false, drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.6)', font: { family: "'Space Grotesk'", weight: 'bold' } } }
                        }
                    }
                });
            } else {
                incExpCtx.parentElement.innerHTML = '<div class="text-center text-muted mt-5">No transaction data yet</div>';
            }
        }

        // 4. Weekly Risk Day (Bar)
        if (weeklyCtx) {
            const labels = window.FIN_DATA ? window.FIN_DATA.weekLabels : [];
            const values = window.FIN_DATA ? window.FIN_DATA.weekValues : [];

            if (labels && labels.length > 0) {
                charts.weekBar = new Chart(weeklyCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Spent',
                            data: values,
                            backgroundColor: function (context) {
                                const maxVal = Math.max(...context.dataset.data);
                                return context.raw === maxVal ? '#ffaa00' : '#b200ff';
                            },
                            hoverBackgroundColor: function (context) {
                                const maxVal = Math.max(...context.dataset.data);
                                return context.raw === maxVal ? '#ffbb33' : '#c94dff';
                            },
                            borderRadius: 6,
                            barPercentage: 0.6
                        }]
                    },
                    options: {
                        ...commonOptions,
                        indexAxis: 'y', // horizontal bar
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.02)', drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { family: "'Space Grotesk'" } } },
                            y: { grid: { display: false, drawBorder: false }, ticks: { color: 'rgba(255,255,255,0.8)', font: { family: "'Space Grotesk'", weight: 'bold' } } }
                        }
                    }
                });
            } else {
                weeklyCtx.parentElement.innerHTML = '<div class="text-center text-muted mt-5">No transaction data yet</div>';
            }
        }

        // 5. Stability Score Gauge (Doughnut without legend)
        if (stabilityCtx) {
            const score = window.FIN_DATA ? window.FIN_DATA.stabilityScore || 0 : 0;
            charts.stability = new Chart(stabilityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Score', 'Remaining'],
                    datasets: [{
                        data: [score, 100 - score],
                        backgroundColor: function () {
                            if (score >= 80) return ['#00e5ff', 'rgba(10,10,12,0.8)']; // Green/Cyan
                            if (score >= 50) return ['#ffaa00', 'rgba(10,10,12,0.8)']; // Yellow
                            return ['#ff2a2a', 'rgba(10,10,12,0.8)']; // Red
                        }(),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { tooltip: { enabled: false }, legend: { display: false } },
                    cutout: '85%',
                    animation: { animateScale: true, animateRotate: true, duration: 2000, easing: 'easeOutQuart' }
                }
            });
        }
    }

    // Chart Intersection Observer for Scroll Animation
    const chartObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('invisible');
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.chart-container').forEach(container => {
        chartObserver.observe(container);
    });

    if (typeof Chart !== 'undefined' && typeof createCharts === 'function') {
        // Slight delay so FIN_DATA and layout are ready before drawing charts
        setTimeout(() => {
            try {
                createCharts();
            } catch (e) {
                console.error('Chart initialization failed', e);
            }
        }, 150);
    }

    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        const isDark = htmlEl.getAttribute('data-bs-theme') === 'dark';
        Chart.defaults.color = isDark ? 'rgba(253,245,230,0.7)' : '#6c757d';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        if (charts.line) { charts.line.options.scales.y.grid.color = gridColor; charts.line.update(); }
        if (charts.bar) { charts.bar.options.scales.y.grid.color = gridColor; charts.bar.update(); }
        if (charts.catBar) { charts.catBar.options.scales.y.grid.color = gridColor; charts.catBar.update(); }
        if (charts.weekBar) { charts.weekBar.options.scales.x.grid.color = gridColor; charts.weekBar.update(); }
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
