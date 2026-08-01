/* ==========================================================================
   SmartSpend — Application Logic
   --------------------------------------------------------------------------
   Talks to the SmartSpend Spring Boot API (see /smartspend-backend) for
   auth and data. All network access is isolated in `apiFetch` and the
   `DataStore` object below — nothing else in this file touches fetch()
   directly.
   ========================================================================== */

(() => {
  'use strict';

  /* ========================================================================
     0. CONSTANTS
     ======================================================================== */

  // ⚠️ DEPLOYMENT: change this to your deployed backend's URL, e.g.
  // 'https://smartspend-backend-xxxx.onrender.com/api'. Leave it as
  // localhost only while running the backend on your own machine.
  const API_BASE = 'https://smartspend-backend-11qe.onrender.com/api';

  const SUBCATEGORY_MAP = {
    Education: ['Tuition Fees', 'Books & Supplies', 'Exam Fees', 'Stationery', 'Other'],
    Rent: ['Hostel Rent', 'Apartment Rent', 'Utilities Deposit', 'Other'],
    Transportation: ['Bus Fare', 'Taxi / Ride-share', 'Fuel', 'Vehicle Maintenance', 'Other'],
    Groceries: ['Vegetables & Fruits', 'Grains & Staples', 'Dairy', 'Household Supplies', 'Other'],
    Health: ['Medicine', 'Doctor Visit', 'Health Insurance', 'Gym / Fitness', 'Other'],
    Food: ['Restaurant', 'Snacks', 'Tea / Coffee', 'Delivery', 'Other'],
    Shopping: ['Clothing', 'Electronics', 'Personal Care', 'Gifts', 'Other'],
  };

  // Utility sub-category set referenced in the project brief (Electricity,
  // Internet, Phone, Water) is folded into Rent's "Utilities" — but kept
  // here as its own list in case a category named "Utilities" is reinstated.
  const UTILITY_ITEMS = ['Electricity', 'Internet', 'Phone', 'Water', 'Other'];
  SUBCATEGORY_MAP.Rent = ['Hostel Rent', 'Apartment Rent', ...UTILITY_ITEMS];

  const CATEGORY_ICONS = {
    Education: '📚', Rent: '🏠', Transportation: '🚌', Groceries: '🛒',
    Health: '⚕️', Food: '🍜', Shopping: '🛍️',
    Salary: '💼', Investment: '📈', Freelance: '💻', 'Given by parents': '👪', Other: '✨',
  };

  const TOAST_DURATION_MS = 2600;

  /* ========================================================================
     1. DATA STORE — talks to the Spring Boot API over fetch().
     ------------------------------------------------------------------------
     The JWT + basic profile for the signed-in user live in sessionStorage
     (so a reload keeps you logged in, but closing the tab logs you out —
     same behavior as the earlier prototype). The token itself is only ever
     read from sessionStorage right before a request; it's never persisted
     anywhere else.
     ======================================================================== */

  const SESSION_KEY = 'smartspend_session';

  /** Low-level fetch wrapper: adds the JSON content-type + bearer token,
   *  parses the response, and throws a plain Error with a user-facing
   *  message on any failure so callers can catch() and show a toast. */
  async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const session = DataStore.getSession();
      if (session?.token) headers.Authorization = `Bearer ${session.token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Is the backend running?');
    }

    if (response.status === 204) return null;

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      // No JSON body (e.g. some error pages) — fall through with data = null.
    }

    if (!response.ok) {
      // A 401 on an authenticated call almost always means the token
      // expired or was revoked server-side — bounce back to the login
      // screen instead of leaving the UI stuck showing a failed request.
      if (response.status === 401 && auth) {
        DataStore.clearSession();
        App.exitToAuth();
        showToast(data?.error || 'Your session has expired. Please log in again.');
      }
      throw new Error(data?.error || `Request failed (${response.status}).`);
    }

    return data;
  }

  const DataStore = {
    // ---- Auth ----

    async registerUser({ username, email, password }) {
      try {
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          auth: false,
          body: { username, email, password },
        });
        return { ok: true, token: data.token, user: { username: data.username, email: data.email } };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },

    async loginUser({ username, password }) {
      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          auth: false,
          body: { usernameOrEmail: username, password },
        });
        return { ok: true, token: data.token, user: { username: data.username, email: data.email } };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },

    async findUserForReset(username) {
      try {
        const data = await apiFetch('/auth/forgot/find', {
          method: 'POST',
          auth: false,
          body: { username },
        });
        return { username: data.username };
      } catch (err) {
        return null;
      }
    },

    async resetPassword(username, newPassword) {
      try {
        await apiFetch('/auth/forgot/reset', {
          method: 'POST',
          auth: false,
          body: { username, newPassword },
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },

    async deleteAccount(password) {
      await apiFetch('/users/me', { method: 'DELETE', body: { password } });
    },

    // ---- Session (local only — the JWT + a bit of profile info for this tab) ----

    getSession() {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    },

    setSession(session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },

    clearSession() {
      sessionStorage.removeItem(SESSION_KEY);
    },

    // ---- Transactions ----

    async getTransactions() {
      return await apiFetch('/transactions');
    },

    async addTransaction(transaction) {
      return await apiFetch('/transactions', { method: 'POST', body: transaction });
    },

    async deleteTransaction(transactionId) {
      await apiFetch(`/transactions/${transactionId}`, { method: 'DELETE' });
    },

    // ---- Budget ----

    async getBudget() {
      return await apiFetch('/budget'); // null if no budget set (204)
    },

    async setBudget(amount) {
      return await apiFetch('/budget', { method: 'PUT', body: { amount } });
    },
  };


  /* ========================================================================
     2. HELPERS
     ======================================================================== */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function formatMoney(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  function formatDateReadable(isoOrDateString) {
    const d = new Date(isoOrDateString);
    if (Number.isNaN(d.getTime())) return isoOrDateString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function todayInputValue() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function uid() {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.remove('is-hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('is-hidden'), TOAST_DURATION_MS);
  }

  function openModal(id) {
    $(`#${id}`).classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    $(`#${id}`).classList.add('is-hidden');
    document.body.style.overflow = '';
  }

  /** Generic live-validation wiring for a single input/select against the
   *  browser's built-in Constraint Validation API, surfacing messages in
   *  the adjacent .field-hint element. */
  function wireFieldValidation(input) {
    const field = input.closest('.field');
    const hint = field?.querySelector('.field-hint');
    const defaultHint = hint ? hint.textContent : '';

    const validate = () => {
      if (!field) return true;
      if (input.value === '' && !input.required) {
        field.classList.remove('is-invalid');
        if (hint) hint.textContent = defaultHint;
        return true;
      }
      if (input.validity.valid) {
        field.classList.remove('is-invalid');
        if (hint) hint.textContent = defaultHint;
        return true;
      }
      field.classList.add('is-invalid');
      if (hint) hint.textContent = readableValidationMessage(input);
      return false;
    };

    input.addEventListener('blur', validate);
    input.addEventListener('input', () => {
      if (field?.classList.contains('is-invalid')) validate();
    });

    return validate;
  }

  function readableValidationMessage(input) {
    const v = input.validity;
    if (v.valueMissing) return 'This field is required.';
    if (v.tooShort) return `Please use at least ${input.minLength} characters.`;
    if (v.tooLong) return `Please use no more than ${input.maxLength} characters.`;
    if (v.typeMismatch && input.type === 'email') return 'Please enter a valid email address.';
    if (v.patternMismatch) return 'Please remove special characters or spaces.';
    if (v.rangeUnderflow) return `Value must be at least ${input.min}.`;
    return 'Please check this field.';
  }

  /* ========================================================================
     3. AUTH VIEW
     ======================================================================== */

  const AuthView = {
    init() {
      this.wireToggle();
      this.wireLoginForm();
      this.wireRegisterForm();
      this.wireForgotPassword();
      this.wirePasswordVisibility();
    },

    wireToggle() {
      const tabLogin = $('#tab-login');
      const tabRegister = $('#tab-register');
      const pill = $('#auth-toggle-pill');
      const formLogin = $('#form-login');
      const formRegister = $('#form-register');
      const message = $('#auth-message');

      const show = (which) => {
        message.textContent = '';
        message.classList.remove('is-success');
        const isLogin = which === 'login';
        tabLogin.classList.toggle('is-active', isLogin);
        tabRegister.classList.toggle('is-active', !isLogin);
        tabLogin.setAttribute('aria-selected', String(isLogin));
        tabRegister.setAttribute('aria-selected', String(!isLogin));
        pill.classList.toggle('is-register', !isLogin);
        formLogin.classList.toggle('is-hidden', !isLogin);
        formRegister.classList.toggle('is-hidden', isLogin);
      };

      tabLogin.addEventListener('click', () => show('login'));
      tabRegister.addEventListener('click', () => show('register'));
    },

    wireLoginForm() {
      const form = $('#form-login');
      const message = $('#auth-message');
      const username = $('#login-username');
      const password = $('#login-password');
      const validateUsername = wireFieldValidation(username);
      const validatePassword = wireFieldValidation(password);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = '';
        message.classList.remove('is-success');

        const validUsername = validateUsername();
        const validPassword = validatePassword();
        if (!validUsername || !validPassword) {
          message.textContent = 'Please fix the highlighted fields.';
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const result = await DataStore.loginUser({
          username: username.value.trim(),
          password: password.value,
        });
        submitBtn.disabled = false;

        if (!result.ok) {
          message.textContent = result.error;
          return;
        }

        DataStore.setSession({ token: result.token, username: result.user.username, email: result.user.email });
        App.enterApp(result.user);
      });
    },

    wireRegisterForm() {
      const form = $('#form-register');
      const message = $('#auth-message');
      const username = $('#reg-username');
      const email = $('#reg-email');
      const password = $('#reg-password');
      const confirm = $('#reg-password-confirm');

      const validators = [
        wireFieldValidation(username),
        wireFieldValidation(email),
        wireFieldValidation(password),
        wireFieldValidation(confirm),
      ];

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        message.textContent = '';
        message.classList.remove('is-success');

        const allValid = validators.every(fn => fn());
        if (!allValid) {
          message.textContent = 'Please fix the highlighted fields.';
          return;
        }

        if (password.value !== confirm.value) {
          message.textContent = 'Passwords do not match.';
          confirm.closest('.field').classList.add('is-invalid');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const result = await DataStore.registerUser({
          username: username.value.trim(),
          email: email.value.trim(),
          password: password.value,
        });
        submitBtn.disabled = false;

        if (!result.ok) {
          message.textContent = result.error;
          return;
        }

        message.classList.add('is-success');
        message.textContent = 'Account created! Logging you in…';

        setTimeout(() => {
          DataStore.setSession({ token: result.token, username: result.user.username, email: result.user.email });
          App.enterApp(result.user);
        }, 600);
      });
    },

    wireForgotPassword() {
      const openBtn = $('#open-forgot');
      const findForm = $('#form-forgot-find');
      const resetForm = $('#form-forgot-reset');
      const findMessage = $('#forgot-message');
      const foundMsg = $('#forgot-found-msg');
      let targetUsername = null;

      openBtn.addEventListener('click', () => {
        // Reset modal to its initial "find account" state every time it opens.
        findForm.classList.remove('is-hidden');
        resetForm.classList.add('is-hidden');
        findForm.reset();
        resetForm.reset();
        findMessage.textContent = '';
        targetUsername = null;
        openModal('modal-forgot');
      });

      findForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = $('#forgot-username');
        const submitBtn = findForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const user = await DataStore.findUserForReset(usernameInput.value.trim());
        submitBtn.disabled = false;

        if (!user) {
          findMessage.textContent = 'We could not find an account with that username.';
          return;
        }

        targetUsername = user.username;
        findMessage.textContent = '';
        foundMsg.textContent = `Account found for "${user.username}". Choose a new password below.`;
        findForm.classList.add('is-hidden');
        resetForm.classList.remove('is-hidden');
      });

      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = $('#forgot-new-password');
        const confirmPassword = $('#forgot-new-password-confirm');

        if (newPassword.value.length < 6) {
          newPassword.closest('.field').classList.add('is-invalid');
          return;
        }
        if (newPassword.value !== confirmPassword.value) {
          confirmPassword.closest('.field').classList.add('is-invalid');
          $('#forgot-found-msg').textContent = 'Those passwords do not match — try again.';
          return;
        }

        const result = await DataStore.resetPassword(targetUsername, newPassword.value);
        if (!result.ok) {
          $('#forgot-found-msg').textContent = result.error;
          return;
        }
        closeModal('modal-forgot');
        showToast('Password updated. You can log in now.');

        // Pre-fill the login form's username for convenience.
        $('#login-username').value = targetUsername;
        $('#tab-login').click();
      });
    },

    wirePasswordVisibility() {
      $$('.pw-toggle').forEach(btn => {
        const eyeIcon = btn.querySelector('.icon-eye');
        const eyeOffIcon = btn.querySelector('.icon-eye-off');
        btn.addEventListener('click', () => {
          const target = $(`#${btn.dataset.target}`);
          const isPassword = target.type === 'password';
          target.type = isPassword ? 'text' : 'password';
          // isPassword true => we just revealed it, so show the open eye
          // and swap to the "eye-off" icon for the next click (to hide again).
          eyeIcon.classList.toggle('is-hidden', isPassword);
          eyeOffIcon.classList.toggle('is-hidden', !isPassword);
          btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
      });
    },
  };

  /* ========================================================================
     4. DASHBOARD VIEW
     ======================================================================== */

  const Dashboard = {
    async init() {
      this.renderHeader();
      this.wireQuickActions();
      this.wireModalForms();
      this.wireLogout();
      await this.render();
    },

    renderHeader() {
      const now = new Date();
      $('#dashboard-date').textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const session = DataStore.getSession();
      $('#dashboard-greeting-name').textContent = session?.username || 'Student';
    },

    wireLogout() {
      $('#dashboard-logout').addEventListener('click', () => App.logout());
    },

    /** Recomputes balance, budget ring, and transaction list from DataStore.
     *  Called after every add/delete so the UI always reflects current data. */
    async render() {
      const session = DataStore.getSession();
      if (!session) return;

      let transactions, budget;
      try {
        [transactions, budget] = await Promise.all([
          DataStore.getTransactions(),
          DataStore.getBudget(),
        ]);
      } catch (err) {
        showToast(err.message);
        return;
      }

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;

      $('#hero-balance-amount').textContent = formatMoney(balance);
      $('#hero-total-income').textContent = `Rs. ${formatMoney(totalIncome)}`;
      $('#hero-total-expense').textContent = `Rs. ${formatMoney(totalExpense)}`;
      $('#hero-budget-amount').textContent = budget ? `Rs. ${formatMoney(budget.amount)}` : 'Not set';

      this.renderBudgetRing(totalExpense, budget);
      this.renderTransactionList(transactions, '#transaction-list', '#transactions-empty', 5);
      this.renderTransactionList(transactions, '#all-transaction-list', '#all-transactions-empty', Infinity);
    },

    /** Drives the signature circular gauge + the red overspend banner.
     *  Logic: percent = expense / budget. Ring colors shift teal -> amber
     *  (80%+) -> red (100%+). This is the one place overspend is computed,
     *  so there's a single source of truth (no duplicated/conflicting
     *  budget checks elsewhere in the app). */
    renderBudgetRing(totalExpense, budget) {
      const ring = $('#ring-progress');
      const percentLabel = $('#ring-percent');
      const banner = $('#overspend-banner');
      const CIRCUMFERENCE = 314.159; // 2 * PI * r(50)

      if (!budget || budget.amount <= 0) {
        ring.style.strokeDashoffset = CIRCUMFERENCE;
        ring.classList.remove('is-caution', 'is-over');
        percentLabel.textContent = '—';
        banner.classList.add('is-hidden');
        return;
      }

      const rawPercent = (totalExpense / budget.amount) * 100;
      const clampedPercent = Math.min(rawPercent, 100);
      const offset = CIRCUMFERENCE - (CIRCUMFERENCE * clampedPercent) / 100;

      ring.style.strokeDashoffset = String(offset);
      percentLabel.textContent = `${Math.round(rawPercent)}%`;

      ring.classList.remove('is-caution', 'is-over');
      if (rawPercent >= 100) {
        ring.classList.add('is-over');
      } else if (rawPercent >= 80) {
        ring.classList.add('is-caution');
      }

      // Strict red dashboard warning when expenses exceed budget.
      banner.classList.toggle('is-hidden', rawPercent < 100);
    },

    renderTransactionList(transactions, listSelector, emptySelector, limit) {
      const list = $(listSelector);
      const empty = $(emptySelector);
      const items = transactions.slice(0, limit);

      list.innerHTML = '';

      if (items.length === 0) {
        empty.classList.remove('is-hidden');
        return;
      }
      empty.classList.add('is-hidden');

      items.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'transaction-row';
        const isIncome = tx.type === 'income';
        const icon = CATEGORY_ICONS[tx.category] || (isIncome ? '💰' : '🧾');
        const label = tx.category === 'Other' && tx.otherText ? tx.otherText : tx.category;
        const subLabel = tx.subcategory ? ` · ${tx.subcategory}` : '';

        li.innerHTML = `
          <span class="tx-icon ${isIncome ? 'is-income' : 'is-expense'}" aria-hidden="true">${icon}</span>
          <span class="tx-info">
            <span class="tx-title">${escapeHtml(label)}${escapeHtml(subLabel)}</span><br/>
            <span class="tx-date">${formatDateReadable(tx.date)}</span>
          </span>
          <span class="tx-amount ${isIncome ? 'is-income' : 'is-expense'}">${isIncome ? '+' : '-'}Rs. ${formatMoney(tx.amount)}</span>
          <button type="button" class="tx-delete" data-tx-id="${tx.id}" aria-label="Delete transaction">🗑</button>
        `;
        list.appendChild(li);
      });

      // Wire delete buttons for this render pass.
      $$('.tx-delete', list).forEach(btn => {
        btn.addEventListener('click', async () => {
          // 1. Show the confirmation popup
          const isConfirmed = confirm("Are you sure you want to delete this transaction?");

          // 2. If the user clicks "Cancel", stop right here
          if (!isConfirmed) return;

          // 3. Otherwise, proceed with the deletion
          try {
            await DataStore.deleteTransaction(btn.dataset.txId);
            showToast('Transaction deleted.');
            await Dashboard.render();
            await Analytics.renderIfActive();
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    },

    wireQuickActions() {
      $('#open-money-in').addEventListener('click', () => {
        $('#mi-date').value = todayInputValue();
        openModal('modal-money-in');
        // Auto-focus the Amount input
        setTimeout(() => $('#mi-amount').focus(), 100); 
      });
      
      $('#open-set-budget').addEventListener('click', async () => {
        let budget = null;
        try {
          budget = await DataStore.getBudget();
        } catch (err) {
          showToast(err.message);
        }
        $('#budget-amount').value = budget ? budget.amount : '';
        openModal('modal-set-budget');
        // Auto-focus the Budget input
        setTimeout(() => $('#budget-amount').focus(), 100); 
      });
      
      $('#open-add-expense').addEventListener('click', () => {
        $('#exp-date').value = todayInputValue();
        openModal('modal-add-expense');
        // Auto-focus the Amount input
        setTimeout(() => $('#exp-amount').focus(), 100); 
      });
      $('#show-all-transactions').addEventListener('click', () => openModal('modal-all-transactions'));

      // Generic close wiring for every modal close button + overlay click.
      $$('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
      });
      $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) closeModal(overlay.id);
        });
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          $$('.modal-overlay:not(.is-hidden)').forEach(overlay => closeModal(overlay.id));
        }
      });
    },

    wireModalForms() {
      this.wireMoneyInForm();
      this.wireBudgetForm();
      this.wireExpenseForm();
    },

    wireMoneyInForm() {
      const form = $('#form-money-in');
      const categorySelect = $('#mi-category');
      const otherField = $('#mi-other-field');
      const otherInput = $('#mi-other-text');

      categorySelect.addEventListener('change', () => {
        const isOther = categorySelect.value === 'Other';
        otherField.classList.toggle('is-hidden', !isOther);
        otherInput.required = false; // optional text input, per spec
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const amount = parseFloat($('#mi-amount').value);

        if (!(amount > 0)) {
          showToast('Please enter an amount greater than zero.');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          await DataStore.addTransaction({
            type: 'income',
            amount,
            category: categorySelect.value,
            otherText: otherInput.value.trim() || null,
            date: $('#mi-date').value,
          });
        } catch (err) {
          submitBtn.disabled = false;
          showToast(err.message);
          return;
        }
        submitBtn.disabled = false;

        form.reset();
        otherField.classList.add('is-hidden');
        closeModal('modal-money-in');
        showToast('Income added.');
        await Dashboard.render();
        await Analytics.renderIfActive();
      });
    },

    wireBudgetForm() {
      const form = $('#form-set-budget');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const amount = parseFloat($('#budget-amount').value);

        if (!(amount > 0)) {
          showToast('Budget must be greater than zero.');
          return;
        }

        // Guard against accidentally overwriting an existing budget silently —
        // the prompt specifically calls out avoiding bugs around "already
        // existing budget", so we confirm before replacing a prior value.
        let existing = null;
        try {
          existing = await DataStore.getBudget();
        } catch (err) {
          showToast(err.message);
          return;
        }
        if (existing && existing.amount !== amount) {
          const confirmed = confirm(
            `You already have a budget of Rs. ${formatMoney(existing.amount)} set. Replace it with Rs. ${formatMoney(amount)}?`
          );
          if (!confirmed) return;
        }

        try {
          await DataStore.setBudget(amount);
        } catch (err) {
          showToast(err.message);
          return;
        }

        form.reset();
        closeModal('modal-set-budget');
        showToast('Budget saved.');
        await Dashboard.render();
      });
    },

    wireExpenseForm() {
      const form = $('#form-add-expense');
      const categorySelect = $('#exp-category');
      const subcategorySelect = $('#exp-subcategory');

     categorySelect.addEventListener('change', () => {
        const options = SUBCATEGORY_MAP[categorySelect.value] || [];
        subcategorySelect.innerHTML = '<option value="" disabled selected>Select a sub-category</option>'
          + options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const amount = parseFloat($('#exp-amount').value);

        if (!(amount > 0)) {
          showToast('Please enter an amount greater than zero.');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
          await DataStore.addTransaction({
            type: 'expense',
            amount,
            category: categorySelect.value,
            subcategory: subcategorySelect.value,
            date: $('#exp-date').value,
          });
        } catch (err) {
          submitBtn.disabled = false;
          showToast(err.message);
          return;
        }
        submitBtn.disabled = false;

        form.reset();
        subcategorySelect.innerHTML = '<option value="" selected>None</option>';
        closeModal('modal-add-expense');
        showToast('Expense added.');
        await Dashboard.render();
        await Analytics.renderIfActive();
      });
    },
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ========================================================================
     5. ANALYTICS VIEW (Chart.js)
     ======================================================================== */

  const Analytics = {
    charts: {},
    initialized: false,

    /** Builds three charts from the user's real transaction data when
     *  available, falling back to realistic dummy data so the page always
     *  looks populated (per the brief's request for sample data to preview). */
    async init() {
      this.initialized = true;
      await this.render();
    },

    async renderIfActive() {
      // Re-render only if the analytics view is currently visible, so we
      // don't do unnecessary chart work while the user is on another page.
      const view = $('#view-analytics');
      if (this.initialized && view && !view.classList.contains('is-hidden')) {
        await this.render();
      }
    },

    async render() {
      const session = DataStore.getSession();
      let transactions = [];
      if (session) {
        try {
          transactions = await DataStore.getTransactions();
        } catch (err) {
          showToast(err.message);
        }
      }
      const expenses = transactions.filter(t => t.type === 'expense');

      this.renderCategoryChart(expenses);
      this.renderDailyChart(expenses);
      this.renderTrendChart(expenses);
    },

    /** Spending by Category — donut chart. Uses real expense data if any
     *  exists, otherwise realistic dummy figures for a student budget. */
    renderCategoryChart(expenses) {
      const totals = {};
      expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

      let labels = Object.keys(totals);
      let data = Object.values(totals);

      if (labels.length === 0) {
        labels = ['Rent', 'Food', 'Education', 'Transportation', 'Groceries', 'Shopping'];
        data = [6500, 3200, 2400, 1100, 1800, 900];
      }

      const palette = ['#1f7a5c', '#3f6fb0', '#e8a23d', '#d64545', '#7a6fd6', '#3aa6a0'];

      this._upsertChart('chart-category', 'doughnut', {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          hoverOffset: 6,
        }],
      }, {
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        cutout: '62%',
      });
    },

    /** Daily Spending — bar chart, last 7 days. */
    renderDailyChart(expenses) {
      const days = [];
      const totalsByDay = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push(key);
        totalsByDay[key] = 0;
      }

      expenses.forEach(e => {
        if (totalsByDay.hasOwnProperty(e.date)) {
          totalsByDay[e.date] += e.amount;
        }
      });

      const hasRealData = expenses.some(e => totalsByDay.hasOwnProperty(e.date) && e.amount > 0);
      const labels = days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' }));
      const data = hasRealData
        ? days.map(d => totalsByDay[d])
        : [450, 0, 1200, 300, 800, 1500, 600]; // realistic dummy week

      this._upsertChart('chart-daily', 'bar', {
        labels,
        datasets: [{
          label: 'Spent (Rs.)',
          data,
          backgroundColor: '#1f7a5c',
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      }, {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `Rs. ${v}` } },
        },
      });
    },

    /** Monthly Expense Trend — line graph, last 6 months. */
    renderTrendChart(expenses) {
      const totalsByMonth = {};
      const months = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }) });
        totalsByMonth[key] = 0;
      }

      expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (totalsByMonth.hasOwnProperty(key)) totalsByMonth[key] += e.amount;
      });

      const hasRealData = expenses.length > 0;
      const labels = months.map(m => m.label);
      const data = hasRealData
        ? months.map(m => totalsByMonth[m.key])
        : [9800, 11200, 8700, 13400, 10100, 12600]; // realistic dummy trend

      this._upsertChart('chart-trend', 'line', {
        labels,
        datasets: [{
          label: 'Total spend (Rs.)',
          data,
          borderColor: '#1f7a5c',
          backgroundColor: 'rgba(31, 122, 92, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#1f7a5c',
          pointRadius: 4,
        }],
      }, {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `Rs. ${v}` } },
        },
      });
    },

    _upsertChart(canvasId, type, data, options) {
     const canvas = $(`#${canvasId}`);
      if (!canvas) return;

      // 1. If a chart already exists on this canvas, destroy it first!
      if (this.charts[canvasId]) {
        this.charts[canvasId].destroy();
      }

      // 2. Now it is perfectly safe to draw the new chart
      this.charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options,
        },
      });
    },
  };

  /* ========================================================================
     6. SETTINGS VIEW
     ======================================================================== */

  const Settings = {
    init() {
      this.render();
      $('#settings-logout').addEventListener('click', () => App.logout());
      $('#settings-delete-account').addEventListener('click', () => this.handleDeleteAccount());
    },

    render() {
      const session = DataStore.getSession();
      if (!session) return;
      const initial = session.username.charAt(0).toUpperCase();
      $('#settings-username').textContent = session.username;
      $('#settings-email').textContent = session.email || 'No email on file';
      $('#settings-avatar').textContent = initial;
    },

    /** Two-step confirmation to prevent accidental destructive clicks:
     *  a standard confirm(), then re-entering the account password (verified
     *  server-side) so a logged-in-but-unattended session can't be used to
     *  wipe the account without actually knowing the password. */
    async handleDeleteAccount() {
      const session = DataStore.getSession();
      if (!session) return;

      const firstConfirm = confirm(
        'This will permanently delete your account and all expense data. This cannot be undone. Continue?'
      );
      if (!firstConfirm) return;

      const password = prompt('To confirm, enter your password:');
      if (password === null) return; // user clicked Cancel

      try {
        await DataStore.deleteAccount(password);
      } catch (err) {
        showToast(err.message);
        return;
      }

      DataStore.clearSession();
      showToast('Account deleted.');
      App.exitToAuth();
    },
  };

  /* ========================================================================
     7. APP SHELL — routing between Dashboard / Analytics / Settings
     ======================================================================== */

  const App = {
    async init() {
      AuthView.init();
      this.wireNav();

      const session = DataStore.getSession();
      if (session) {
        // A token from a previous visit could have expired since then —
        // confirm it's still good before trusting it, otherwise the user
        // would see a blank/broken app instead of the login screen.
        try {
          await apiFetch('/users/me');
          await this.enterApp(session, { skipAuthAnimation: true });
        } catch (err) {
          DataStore.clearSession();
        }
      }
    },

    wireNav() {
      $$('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => this.navigateTo(btn.dataset.route));
      });
    },

    async navigateTo(route) {
      $$('.nav-item').forEach(btn => btn.classList.toggle('is-active', btn.dataset.route === route));
      $$('.route-view').forEach(view => view.classList.toggle('is-hidden', view.dataset.routeView !== route));

      if (route === 'analytics') await Analytics.renderIfActive();
      if (route === 'dashboard') await Dashboard.render();
      if (route === 'settings') Settings.render();
    },

    async enterApp(user) {
      $('#view-auth').classList.add('is-hidden');
      $('#app-shell').classList.remove('is-hidden');

      const initial = (user.username || '?').charAt(0).toUpperCase();
      $('#nav-user-avatar').textContent = initial;
      $('#nav-user-name').textContent = user.username;

      await Dashboard.init();
      await Analytics.init();
      Settings.init();
      await this.navigateTo('dashboard');
    },

    logout() {
      // Stateless JWTs aren't revoked server-side on logout (there's no
      // session to invalidate) — this just discards the token locally.
      // The account's transactions and budget remain in the database for
      // next time they log in.
      DataStore.clearSession();
      this.exitToAuth();
      showToast('Logged out.');
    },

    exitToAuth() {
      $('#app-shell').classList.add('is-hidden');
      $('#view-auth').classList.remove('is-hidden');
      $('#form-login').reset();
      $('#form-register').reset();
    },
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();