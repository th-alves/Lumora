/* ============================================
   STORAGE MODULE — Persistência & Cálculos
   ============================================ */
const Storage = (() => {
    const STORAGE_KEY = 'controle-financeiro-v1';

    const MONTHS_PT = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    /* ---------- Helpers ---------- */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    function getCurrentMonthKey() {
        const now = new Date();
        return formatMonthKey(now.getFullYear(), now.getMonth());
    }

    function formatMonthKey(year, month) {
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }

    function parseMonthKey(key) {
        const [year, month] = key.split('-').map(Number);
        return { year, month: month - 1 };
    }

    function getMonthName(key) {
        const { year, month } = parseMonthKey(key);
        return `${MONTHS_PT[month]} ${year}`;
    }

    function navigateMonth(currentKey, direction) {
        const { year, month } = parseMonthKey(currentKey);
        let newMonth = month + direction;
        let newYear = year;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        if (newMonth < 0) { newMonth = 11; newYear--; }
        return formatMonthKey(newYear, newMonth);
    }

    /* ---------- Raw Data Access ---------- */
    function getAllData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { months: {} };
        } catch (e) {
            console.error('Erro ao ler localStorage:', e);
            return { months: {} };
        }
    }

    function saveAllData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Erro ao salvar localStorage:', e);
        }
    }

    function getMonthData(monthKey) {
        const data = getAllData();
        if (!data.months[monthKey]) {
            data.months[monthKey] = { salaries: [], transactions: [] };
        }
        return data.months[monthKey];
    }

    function saveMonthData(monthKey, monthData) {
        const data = getAllData();
        data.months[monthKey] = monthData;
        saveAllData(data);
    }

    /* ---------- Salary CRUD ---------- */
    function addSalary(monthKey, salary) {
        const md = getMonthData(monthKey);
        salary.id = generateId();
        md.salaries.push(salary);
        saveMonthData(monthKey, md);
        return md;
    }

    function updateSalary(monthKey, salaryId, updates) {
        const md = getMonthData(monthKey);
        const i = md.salaries.findIndex(s => s.id === salaryId);
        if (i !== -1) {
            md.salaries[i] = { ...md.salaries[i], ...updates };
            saveMonthData(monthKey, md);
        }
        return md;
    }

    function deleteSalary(monthKey, salaryId) {
        const md = getMonthData(monthKey);
        md.salaries = md.salaries.filter(s => s.id !== salaryId);
        saveMonthData(monthKey, md);
        return md;
    }

    /* ---------- Transaction CRUD ---------- */
    function addTransaction(monthKey, tx) {
        const md = getMonthData(monthKey);
        tx.id = generateId();
        md.transactions.push(tx);
        saveMonthData(monthKey, md);
        return md;
    }

    function updateTransaction(monthKey, txId, updates) {
        const md = getMonthData(monthKey);
        const i = md.transactions.findIndex(t => t.id === txId);
        if (i !== -1) {
            md.transactions[i] = { ...md.transactions[i], ...updates };
            saveMonthData(monthKey, md);
        }
        return md;
    }

    function deleteTransaction(monthKey, txId) {
        const md = getMonthData(monthKey);
        md.transactions = md.transactions.filter(t => t.id !== txId);
        saveMonthData(monthKey, md);
        return md;
    }

    /* ---------- Financial Calculations ---------- */
    function calculateTotals(monthData) {
        const totalIncome = monthData.salaries
            .reduce((s, sal) => s + (parseFloat(sal.value) || 0), 0);

        const paid   = monthData.transactions.filter(t => t.status === 'pago');
        const pend   = monthData.transactions.filter(t => t.status === 'pendente');

        const totalSpent   = paid.reduce((s, t) => s + Math.abs(parseFloat(t.value) || 0), 0);
        const totalPending = pend.reduce((s, t) => s + Math.abs(parseFloat(t.value) || 0), 0);
        const remaining    = totalIncome - totalSpent;

        /* 50 / 30 / 20 */
        const essentialSpent = paid
            .filter(t => t.classification === 'essencial')
            .reduce((s, t) => s + Math.abs(parseFloat(t.value) || 0), 0);
        const lifestyleSpent = paid
            .filter(t => t.classification === 'estilo-de-vida')
            .reduce((s, t) => s + Math.abs(parseFloat(t.value) || 0), 0);
        const investmentSpent = paid
            .filter(t => t.classification === 'investimento')
            .reduce((s, t) => s + Math.abs(parseFloat(t.value) || 0), 0);

        /* Per-category breakdown (expenses only) */
        const categoryBreakdown = {};
        paid.forEach(t => {
            if (!categoryBreakdown[t.category]) categoryBreakdown[t.category] = 0;
            categoryBreakdown[t.category] += Math.abs(parseFloat(t.value) || 0);
        });

        return {
            totalIncome,
            totalSpent,
            totalPending,
            remaining,
            essentialSpent,
            lifestyleSpent,
            investmentSpent,
            essentialBudget:  totalIncome * 0.5,
            lifestyleBudget:  totalIncome * 0.3,
            investmentBudget: totalIncome * 0.2,
            categoryBreakdown
        };
    }

    /* ---------- Public API ---------- */
    return {
        generateId,
        getCurrentMonthKey,
        formatMonthKey,
        parseMonthKey,
        getMonthName,
        navigateMonth,
        getAllData,
        saveAllData,
        getMonthData,
        saveMonthData,
        addSalary,
        updateSalary,
        deleteSalary,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        calculateTotals,
        MONTHS_PT
    };
})();
