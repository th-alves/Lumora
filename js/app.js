/* ============================================
   APP MODULE — Main Orchestrator
   ============================================ */
const App = (() => {

    /* ---------- State ---------- */
    let currentMonthKey = Storage.getCurrentMonthKey();
    let editingTransactionId = null;
    let deletingType = null;   // 'transaction' | 'salary'
    let deletingId = null;
    let filterCategory = '';
    let filterStatus = '';

    /* ---------- Label maps ---------- */
    const CATEGORY_LABELS = {
        'contas': 'Contas', 'parcela': 'Parcela', 'assinatura': 'Assinatura',
        'fatura': 'Fatura', 'futuro': 'Futuro'
    };

    const PAYMENT_LABELS = {
        'pix': 'Pix', 'conta-corrente': 'Conta Corrente',
        'cartao-credito': 'Cartão de Crédito', 'dinheiro': 'Dinheiro', 'boleto': 'Boleto'
    };

    const PAYMENT_ICONS = {
        'pix': '⚡', 'conta-corrente': '🏦', 'cartao-credito': '💳',
        'dinheiro': '💵', 'boleto': '📄'
    };

    const CLASS_LABELS = {
        'essencial': 'Essencial (50%)', 'estilo-de-vida': 'Estilo de Vida (30%)',
        'investimento': 'Investimento (20%)'
    };

    /* ---------- DOM refs ---------- */
    const $ = id => document.getElementById(id);

    /* ---------- Helpers ---------- */
    function fmt(v) {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    /* ---------- Currency Mask ---------- */
    function setupCurrencyMask(input) {
        input.addEventListener('input', function () {
            let digits = this.value.replace(/\D/g, '');
            if (digits === '') { this.value = ''; return; }
            /* Remove leading zeros but keep at least 1 */
            digits = digits.replace(/^0+/, '') || '0';
            const cents = parseInt(digits, 10);
            const formatted = (cents / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            this.value = formatted;
        });

        /* Select all on focus for easy overwrite */
        input.addEventListener('focus', function () {
            setTimeout(() => this.select(), 0);
        });
    }

    function parseCurrency(str) {
        if (!str) return 0;
        /* "1.500,75" → "1500.75" */
        const cleaned = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    function formatToCurrencyString(num) {
        return Math.abs(num).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /* ---------- Toast ---------- */
    function toast(message, type = 'success') {
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const container = $('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('hiding');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    /* ---------- Modal helpers ---------- */
    function openModal(id) {
        $(id).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        $(id).classList.remove('active');
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    }

    /* ============================
       RENDER — Summary Cards
       ============================ */
    function renderSummary(totals) {
        animateValue($('card-income'), totals.totalIncome);
        animateValue($('card-spent'), totals.totalSpent);
        animateValue($('card-remaining'), totals.remaining);
        animateValue($('card-pending'), totals.totalPending);
    }

    function animateValue(el, target) {
        const duration = 700;
        const start = performance.now();
        const from = parseFloat(el.dataset.current || '0');
        el.dataset.current = target;

        (function tick(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const v = from + (target - from) * eased;
            el.textContent = fmt(v);
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = fmt(target);
        })(start);
    }

    /* ============================
       RENDER — Salary List
       ============================ */
    function renderSalaries(monthData) {
        const list = $('salary-list');

        if (monthData.salaries.length === 0) {
            list.innerHTML = `
                <div class="salary-empty">
                    <span class="empty-icon">💵</span>
                    Nenhum salário adicionado.<br>
                    <small style="color:var(--text-muted)">Adicione sua renda para começar a controlar seus gastos.</small>
                </div>`;
            return;
        }

        list.innerHTML = monthData.salaries.map(s => `
            <div class="salary-entry" data-id="${s.id}">
                <div class="salary-icon">💵</div>
                <div class="salary-info">
                    <div class="salary-desc">${s.description || 'Salário'}</div>
                    <div class="salary-day">Dia ${s.day || '—'} de cada mês</div>
                </div>
                <div class="salary-value">${fmt(parseFloat(s.value) || 0)}</div>
                <button class="btn-icon delete" data-delete-salary="${s.id}" title="Remover">🗑️</button>
            </div>
        `).join('');
    }

    /* ============================
       RENDER — Transactions Table
       ============================ */
    function renderTransactions(monthData) {
        const tbody = $('transactions-body');
        const empty = $('empty-state');
        const table = $('data-table');

        let txs = [...monthData.transactions];

        /* Apply filters */
        if (filterCategory) txs = txs.filter(t => t.category === filterCategory);
        if (filterStatus) txs = txs.filter(t => t.status === filterStatus);

        /* Sort by date */
        txs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        if (txs.length === 0) {
            table.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        table.style.display = '';
        empty.style.display = 'none';

        tbody.innerHTML = txs.map((t, i) => {
            const val = Math.abs(parseFloat(t.value) || 0);
            return `
            <tr data-id="${t.id}">
                <td data-label="Data">${formatDate(t.date)}</td>
                <td data-label="Categoria"><span class="category-badge ${t.category}">${CATEGORY_LABELS[t.category] || t.category}</span></td>
                <td data-label="Descrição">${t.description || '—'}</td>
                <td data-label="Pagamento">
                    <span class="payment-badge">
                        <span class="pay-icon">${PAYMENT_ICONS[t.paymentMethod] || '💳'}</span>
                        ${PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod}
                    </span>
                </td>
                <td data-label="Classificação"><span class="class-badge ${t.classification}">${CLASS_LABELS[t.classification] || t.classification}</span></td>
                <td data-label="Valor"><span class="value-display value-negative">- ${fmt(val)}</span></td>
                <td data-label="Status">
                    <span class="status-toggle" data-toggle-status="${t.id}" title="Clique para alternar">
                        <span class="status-dot ${t.status}"></span>
                        <span class="status-label ${t.status}">${t.status === 'pago' ? 'Pago' : 'Pendente'}</span>
                    </span>
                </td>
                <td>
                    <div class="row-actions">
                        <button class="btn-icon" data-edit="${t.id}" title="Editar">✏️</button>
                        <button class="btn-icon delete" data-delete-tx="${t.id}" title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    /* ============================
       RENDER — Full refresh
       ============================ */
    function renderAll() {
        const monthData = Storage.getMonthData(currentMonthKey);
        const totals = Storage.calculateTotals(monthData);

        /* Month display */
        $('month-display').textContent = Storage.getMonthName(currentMonthKey);

        /* Cards */
        renderSummary(totals);

        /* Charts */
        Charts.renderDonut($('chart-donut'), totals.categoryBreakdown, totals.totalSpent);
        Charts.renderLegend($('chart-legend'), totals.categoryBreakdown, totals.totalSpent);
        Charts.renderBudgetBars($('budget-bars'), totals);

        /* Salaries */
        renderSalaries(monthData);

        /* Transactions */
        renderTransactions(monthData);
    }

    /* ============================
       EVENT HANDLERS
       ============================ */

    /* -- Month navigation with slide animation -- */
    function animateMonthChange(direction) {
        const display = $('month-display');
        const cards = $('summary-cards');

        /* Slide out */
        display.style.transition = 'opacity 0.15s, transform 0.15s';
        display.style.opacity = '0';
        display.style.transform = `translateX(${direction * -20}px)`;

        setTimeout(() => {
            currentMonthKey = Storage.navigateMonth(currentMonthKey, direction);
            renderAll();

            /* Slide in from opposite side */
            display.style.transform = `translateX(${direction * 20}px)`;
            requestAnimationFrame(() => {
                display.style.opacity = '1';
                display.style.transform = 'translateX(0)';
            });
        }, 150);
    }

    function onPrevMonth() { animateMonthChange(-1); }
    function onNextMonth() { animateMonthChange(1); }

    /* -- Salary modal -- */
    function onAddSalary() {
        $('salary-form').reset();
        openModal('salary-modal');
    }

    function onSalarySubmit(e) {
        e.preventDefault();
        const desc = $('salary-description').value.trim();
        const val  = parseCurrency($('salary-value').value);
        const day  = $('salary-day').value;

        if (!desc || !val || !day) return;

        Storage.addSalary(currentMonthKey, {
            description: desc,
            value: val,
            day: parseInt(day)
        });

        closeModal('salary-modal');
        toast('Renda adicionada com sucesso!');
        renderAll();
    }

    /* -- Transaction modal -- */
    function onAddTransaction() {
        editingTransactionId = null;
        $('modal-title').textContent = 'Nova Transação';
        $('modal-save-tx').textContent = 'Salvar';
        $('transaction-form').reset();

        /* Default date to today */
        const today = new Date();
        $('field-date').value = today.toISOString().split('T')[0];

        openModal('transaction-modal');
    }

    function onEditTransaction(txId) {
        const monthData = Storage.getMonthData(currentMonthKey);
        const tx = monthData.transactions.find(t => t.id === txId);
        if (!tx) return;

        editingTransactionId = txId;
        $('modal-title').textContent = 'Editar Transação';
        $('modal-save-tx').textContent = 'Atualizar';

        $('field-date').value = tx.date || '';
        $('field-category').value = tx.category || 'contas';
        $('field-description').value = tx.description || '';
        $('field-payment').value = tx.paymentMethod || 'pix';
        $('field-classification').value = tx.classification || 'essencial';
        $('field-value').value = formatToCurrencyString(parseFloat(tx.value) || 0);
        $('field-status').value = tx.status || 'pendente';

        openModal('transaction-modal');
    }

    function onTransactionSubmit(e) {
        e.preventDefault();

        const data = {
            date:           $('field-date').value,
            category:       $('field-category').value,
            description:    $('field-description').value.trim(),
            paymentMethod:  $('field-payment').value,
            classification: $('field-classification').value,
            value:          parseCurrency($('field-value').value),
            status:         $('field-status').value
        };

        if (editingTransactionId) {
            Storage.updateTransaction(currentMonthKey, editingTransactionId, data);
            toast('Transação atualizada!');
        } else {
            Storage.addTransaction(currentMonthKey, data);
            toast('Transação adicionada!');
        }

        closeModal('transaction-modal');
        editingTransactionId = null;
        renderAll();
    }

    /* -- Status toggle with visual feedback -- */
    function onToggleStatus(txId) {
        const monthData = Storage.getMonthData(currentMonthKey);
        const tx = monthData.transactions.find(t => t.id === txId);
        if (!tx) return;

        /* Add visual pulse on the row */
        const row = document.querySelector(`tr[data-id="${txId}"]`);
        if (row) {
            row.style.transition = 'background 0.3s';
            row.style.background = tx.status === 'pago'
                ? 'rgba(245, 158, 11, 0.08)'
                : 'rgba(34, 197, 94, 0.08)';
            setTimeout(() => { row.style.background = ''; }, 600);
        }

        const newStatus = tx.status === 'pago' ? 'pendente' : 'pago';
        Storage.updateTransaction(currentMonthKey, txId, { status: newStatus });
        toast(newStatus === 'pago' ? 'Marcado como pago ✅' : 'Marcado como pendente ⏳', 'info');
        renderAll();
    }

    /* -- Delete flow -- */
    function onRequestDelete(type, id) {
        deletingType = type;
        deletingId = id;
        openModal('delete-modal');
    }

    function onConfirmDelete() {
        if (deletingType === 'transaction' && deletingId) {
            Storage.deleteTransaction(currentMonthKey, deletingId);
            toast('Transação excluída!', 'info');
        } else if (deletingType === 'salary' && deletingId) {
            Storage.deleteSalary(currentMonthKey, deletingId);
            toast('Renda removida!', 'info');
        }
        deletingType = null;
        deletingId = null;
        closeModal('delete-modal');
        renderAll();
    }

    /* -- Filters -- */
    function onFilterChange() {
        filterCategory = $('filter-category').value;
        filterStatus = $('filter-status').value;
        const monthData = Storage.getMonthData(currentMonthKey);
        renderTransactions(monthData);
    }

    /* -- Export -- */
    function onDownload() {
        const monthData = Storage.getMonthData(currentMonthKey);
        if (monthData.salaries.length === 0 && monthData.transactions.length === 0) {
            toast('Nenhum dado para exportar neste mês.', 'error');
            return;
        }
        ExportModule.downloadSpreadsheet(monthData, currentMonthKey);
        toast('Planilha exportada com sucesso! 📥');
    }

    /* -- Copy from last month -- */
    function onCopyFromLastMonth() {
        const prevMonthKey = Storage.navigateMonth(currentMonthKey, -1);
        const prevData = Storage.getMonthData(prevMonthKey);

        if (prevData.transactions.length === 0) {
            toast(`Nenhuma transação encontrada em ${Storage.getMonthName(prevMonthKey)}.`, 'error');
            return;
        }

        const currentData = Storage.getMonthData(currentMonthKey);
        let copied = 0;

        prevData.transactions.forEach(tx => {
            /* Check for duplicates by description + category + value */
            const alreadyExists = currentData.transactions.some(
                t => t.description === tx.description
                  && t.category === tx.category
                  && Math.abs(parseFloat(t.value)) === Math.abs(parseFloat(tx.value))
            );
            if (alreadyExists) return;

            /* Copy with new ID, same date adjusted to current month, status reset to pendente */
            const { year, month } = Storage.parseMonthKey(currentMonthKey);
            let newDate = tx.date;
            if (newDate) {
                const day = newDate.split('-')[2];
                newDate = `${year}-${String(month + 1).padStart(2, '0')}-${day}`;
            }

            Storage.addTransaction(currentMonthKey, {
                date: newDate,
                category: tx.category,
                description: tx.description,
                paymentMethod: tx.paymentMethod,
                classification: tx.classification,
                value: parseFloat(tx.value) || 0,
                status: 'pendente'
            });
            copied++;
        });

        if (copied === 0) {
            toast('Todas as transações já existem neste mês.', 'info');
        } else {
            toast(`${copied} transação(s) copiada(s) de ${Storage.getMonthName(prevMonthKey)}! ✅`);
        }

        renderAll();
    }

    /* ============================
       EVENT DELEGATION
       ============================ */
    function setupDelegation() {
        /* Transactions table & salary list — click delegation */
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-toggle-status]');
            if (target) {
                onToggleStatus(target.dataset.toggleStatus);
                return;
            }

            const editBtn = e.target.closest('[data-edit]');
            if (editBtn) {
                onEditTransaction(editBtn.dataset.edit);
                return;
            }

            const delTx = e.target.closest('[data-delete-tx]');
            if (delTx) {
                onRequestDelete('transaction', delTx.dataset.deleteTx);
                return;
            }

            const delSal = e.target.closest('[data-delete-salary]');
            if (delSal) {
                onRequestDelete('salary', delSal.dataset.deleteSalary);
                return;
            }
        });

        /* Close modals on overlay click */
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal.id);
            });
        });

        /* Escape to close modals */
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllModals();
        });
    }

    /* ============================
       INIT
       ============================ */
    function init() {
        /* Wire up buttons */
        $('prev-month').addEventListener('click', onPrevMonth);
        $('next-month').addEventListener('click', onNextMonth);
        $('add-salary-btn').addEventListener('click', onAddSalary);
        $('add-transaction-btn').addEventListener('click', onAddTransaction);
        $('copy-last-month-btn').addEventListener('click', onCopyFromLastMonth);
        $('download-btn').addEventListener('click', onDownload);

        /* Salary modal */
        $('salary-form').addEventListener('submit', onSalarySubmit);
        $('modal-close-sal').addEventListener('click', () => closeModal('salary-modal'));
        $('modal-cancel-sal').addEventListener('click', () => closeModal('salary-modal'));

        /* Transaction modal */
        $('transaction-form').addEventListener('submit', onTransactionSubmit);
        $('modal-close-tx').addEventListener('click', () => closeModal('transaction-modal'));
        $('modal-cancel-tx').addEventListener('click', () => closeModal('transaction-modal'));

        /* Delete modal */
        $('delete-cancel').addEventListener('click', () => { closeModal('delete-modal'); deletingType = null; deletingId = null; });
        $('delete-confirm').addEventListener('click', onConfirmDelete);

        /* Filters */
        $('filter-category').addEventListener('change', onFilterChange);
        $('filter-status').addEventListener('change', onFilterChange);

        /* Delegation for dynamic elements */
        setupDelegation();

        /* Resize handler for donut chart */
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const md = Storage.getMonthData(currentMonthKey);
                const totals = Storage.calculateTotals(md);
                Charts.renderDonut($('chart-donut'), totals.categoryBreakdown, totals.totalSpent);
            }, 250);
        });

        /* Initial render */
        renderAll();

        /* Setup currency masks */
        setupCurrencyMask($('salary-value'));
        setupCurrencyMask($('field-value'));
    }

    /* Boot */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { renderAll, toast };
})();
