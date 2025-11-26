document.addEventListener('DOMContentLoaded', () => {
    // State
    let apiToken = localStorage.getItem('viotp_token') || '';
    let currentRequestId = null;
    let pollingInterval = null;
    let currentSession = null;

    // Elements
    const tokenInput = document.getElementById('api-token');
    const toggleTokenBtn = document.getElementById('toggle-token');
    const checkTokenBtn = document.getElementById('check-token-btn');

    const serviceSelect = document.getElementById('service-select');
    const networkSelect = document.getElementById('network-select');
    const getNumberBtn = document.getElementById('get-number-btn');

    const activeSessionPanel = document.getElementById('active-session-panel');
    const currentPhoneEl = document.getElementById('current-phone');
    const currentServiceEl = document.getElementById('current-service');
    const otpCodeEl = document.getElementById('otp-code');
    const sessionStatusEl = document.getElementById('session-status');

    const refreshSessionBtn = document.getElementById('refresh-session-btn');
    const balanceContainer = document.getElementById('balance-container');
    const availableCountEl = document.getElementById('available-count');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Init
    if (apiToken) {
        tokenInput.value = apiToken;
        loadInitialData();
        restoreSession();
        updateBalanceDisplay();
    }

    // Event Listeners
    if (refreshSessionBtn) {
        refreshSessionBtn.addEventListener('click', async () => {
            if (!currentRequestId) return;
            refreshSessionBtn.querySelector('i').classList.add('fa-spin');
            await checkSession();
            setTimeout(() => {
                refreshSessionBtn.querySelector('i').classList.remove('fa-spin');
            }, 500);
        });
    }

    toggleTokenBtn.addEventListener('click', () => {
        const type = tokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
        tokenInput.setAttribute('type', type);
        toggleTokenBtn.querySelector('i').className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    tokenInput.addEventListener('change', (e) => {
        apiToken = e.target.value.trim();
        localStorage.setItem('viotp_token', apiToken);
    });

    if (checkTokenBtn) {
        checkTokenBtn.addEventListener('click', async () => {
            if (!apiToken) return showToast('Please enter API Token', 'error');
            checkTokenBtn.disabled = true;
            checkTokenBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

            try {
                const res = await fetch(`/api/networks?token=${apiToken}`);
                const data = await res.json();

                if (data.status_code === 200) {
                    showToast('Token is valid!', 'success');
                    loadInitialData();
                    updateBalanceDisplay();
                } else {
                    showToast('Invalid Token', 'error');
                }
            } catch (e) {
                showToast('Validation failed', 'error');
            } finally {
                checkTokenBtn.disabled = false;
                checkTokenBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Check Token';
            }
        });
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });

    getNumberBtn.addEventListener('click', requestNumber);

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const text = document.getElementById(targetId).innerText;
            if (text && text !== '---' && text !== 'Waiting for code...') {
                navigator.clipboard.writeText(text);
                showToast('Copied to clipboard!', 'success');
            }
        });
    });

    // Functions
    async function loadInitialData() {
        await Promise.all([loadNetworks(), loadServices()]);
    }

    async function updateBalanceDisplay() {
        if (!apiToken) return;
        try {
            const response = await fetch(`/api/balance?token=${apiToken}`);
            const data = await response.json();
            if (data.status_code === 200) {
                const balance = data.data.balance;
                const available = Math.floor(balance / 1600);
                availableCountEl.textContent = available;
                balanceContainer.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }

    async function loadNetworks() {
        if (!apiToken) return;
        try {
            const res = await fetch(`/api/networks?token=${apiToken}`);
            const data = await res.json();

            if (data.status_code === 200) {
                networkSelect.innerHTML = '<option value="">Any Network</option>';
                const allowedNetworks = ['MOBIFONE', 'VINAPHONE', 'VIETTEL'];

                data.data.forEach(net => {
                    if (allowedNetworks.includes(net.name)) {
                        const option = document.createElement('option');
                        option.value = net.name;
                        option.textContent = net.name;
                        networkSelect.appendChild(option);
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load networks', e);
        }
    }

    async function loadServices() {
        if (!apiToken) return;
        try {
            const res = await fetch(`/api/services?token=${apiToken}`);
            const data = await res.json();

            if (data.status_code === 200) {
                serviceSelect.innerHTML = '';

                const vieonServices = data.data.filter(svc =>
                    svc.name.toLowerCase().includes('vieon') ||
                    svc.name.toLowerCase().includes('vie on')
                );

                if (vieonServices.length === 0) {
                    serviceSelect.innerHTML = '<option value="" disabled>Vieon service not found</option>';
                } else {
                    vieonServices.forEach(svc => {
                        const option = document.createElement('option');
                        option.value = svc.id;
                        option.textContent = svc.name;
                        serviceSelect.appendChild(option);
                    });
                    serviceSelect.selectedIndex = 0;
                    getNumberBtn.disabled = false;
                }
            }
        } catch (e) {
            console.error('Failed to load services', e);
        }
    }

    async function requestNumber() {
        if (!apiToken) return showToast('Please enter API Token', 'error');

        // Client-side balance check
        const currentAvailable = parseInt(availableCountEl.textContent) || 0;
        if (currentAvailable <= 0) {
            return showToast('Đã hết số có thể get', 'error');
        }

        const serviceId = serviceSelect.value;
        if (!serviceId) return showToast('Please select a service', 'error');

        const network = networkSelect.value;

        getNumberBtn.disabled = true;
        getNumberBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting...';

        try {
            let url = `/api/request?token=${apiToken}&serviceId=${serviceId}`;

            if (network) {
                url += `&network=${network}`;
            } else {
                url += `&network=MOBIFONE|VINAPHONE|VIETTEL`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.status_code === 200) {
                startSession(data.data);
                showToast('Number acquired successfully!', 'success');
            } else {
                // Use custom message as requested, or fallback to API message if needed
                // But user specifically asked for "Đã hết số có thể get"
                showToast('Đã hết số có thể get', 'error');
            }
        } catch (e) {
            showToast('Đã hết số có thể get', 'error');
        } finally {
            getNumberBtn.disabled = false;
            getNumberBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Get Number';
        }
    }

    function startSession(sessionData) {
        currentRequestId = sessionData.request_id;

        currentSession = {
            request_id: sessionData.request_id,
            phone: sessionData.phone_number,
            service: serviceSelect.options[serviceSelect.selectedIndex].text.split(' - ')[0],
            status: 0,
            code: null
        };

        // Save to localStorage
        localStorage.setItem('current_session', JSON.stringify(currentSession));

        updateSessionUI();
        startPolling();
    }

    function restoreSession() {
        const savedSession = localStorage.getItem('current_session');
        if (savedSession) {
            currentSession = JSON.parse(savedSession);
            currentRequestId = currentSession.request_id;
            updateSessionUI();
            startPolling();
        }
    }

    function updateSessionUI() {
        if (!currentSession) return;

        activeSessionPanel.classList.remove('hidden');
        currentPhoneEl.innerText = currentSession.phone;
        currentServiceEl.innerText = currentSession.service;

        if (currentSession.code) {
            otpCodeEl.innerText = currentSession.code;
            otpCodeEl.className = 'otp-code';
        } else {
            otpCodeEl.innerText = 'Waiting for code...';
            otpCodeEl.className = 'otp-placeholder';
        }

        if (currentSession.status === 1) {
            sessionStatusEl.innerText = 'Completed';
            sessionStatusEl.className = 'status-badge success';
        } else if (currentSession.status === 2) {
            sessionStatusEl.innerText = 'Expired';
            sessionStatusEl.className = 'status-badge error';
        } else {
            sessionStatusEl.innerText = 'Waiting for OTP';
            sessionStatusEl.className = 'status-badge';
        }
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(checkSession, 3000);
    }

    async function checkSession() {
        if (!currentRequestId) return;

        try {
            const res = await fetch(`/api/session?token=${apiToken}&requestId=${currentRequestId}`);
            const data = await res.json();

            if (data.status_code === 200) {
                const status = data.data.Status;

                if (currentSession) {
                    currentSession.status = status;
                    if (data.data.Code) currentSession.code = data.data.Code;

                    // Update localStorage
                    localStorage.setItem('current_session', JSON.stringify(currentSession));
                }

                if (status === 1) {
                    clearInterval(pollingInterval);
                    updateSessionUI();
                    showToast(`OTP Received: ${data.data.Code}`, 'success');

                    // Update available count locally
                    let currentAvailable = parseInt(availableCountEl.textContent) || 0;
                    if (currentAvailable > 0) {
                        availableCountEl.textContent = currentAvailable - 1;
                    }
                    // Also fetch fresh balance to be sure
                    setTimeout(updateBalanceDisplay, 2000);

                    // Clear session after delay
                    setTimeout(() => {
                        localStorage.removeItem('current_session');
                        // Optional: Clear UI or keep it until next request
                    }, 60000); // Keep for 1 minute
                } else if (status === 2) {
                    clearInterval(pollingInterval);
                    updateSessionUI();
                    showToast('Session expired', 'error');

                    localStorage.removeItem('current_session');
                }
            }
        } catch (e) {
            console.error('Polling error', e);
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
