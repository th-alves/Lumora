/* ============================================
   EXPORT MODULE — Download XLSX via SheetJS
   ============================================ */
const ExportModule = (() => {

    const CATEGORY_LABELS = {
        'receita':    'Receita',
        'contas':     'Contas',
        'parcela':    'Parcela',
        'assinatura': 'Assinatura',
        'fatura':     'Fatura',
        'futuro':     'Futuro'
    };

    const PAYMENT_LABELS = {
        'pix':            'Pix',
        'conta-corrente': 'Conta Corrente',
        'cartao-credito': 'Cartão de Crédito',
        'dinheiro':       'Dinheiro',
        'boleto':         'Boleto'
    };

    const CLASS_LABELS = {
        'renda':          'Renda',
        'essencial':      'Essencial (50%)',
        'estilo-de-vida': 'Estilo de Vida (30%)',
        'investimento':   'Investimento (20%)'
    };

    function fmt(v) {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function downloadSpreadsheet(monthData, monthKey) {
        if (typeof XLSX === 'undefined') {
            alert('Biblioteca de exportação não carregou. Verifique sua conexão com a internet e recarregue a página.');
            return;
        }

        const totals = Storage.calculateTotals(monthData);
        const monthName = Storage.getMonthName(monthKey);

        /* ---- Build header rows ---- */
        const rows = [];

        /* Title */
        rows.push(['Controle Financeiro — ' + monthName]);
        rows.push([]);

        /* Salaries summary */
        rows.push(['SALÁRIOS / RENDAS']);
        rows.push(['Descrição', 'Dia Recebimento', 'Valor']);
        monthData.salaries.forEach(s => {
            rows.push([s.description || 'Salário', s.day || '', parseFloat(s.value) || 0]);
        });
        rows.push(['', 'TOTAL RENDA', totals.totalIncome]);
        rows.push([]);

        /* Summary */
        rows.push(['RESUMO']);
        rows.push(['Total de Gastos (Pagos)', totals.totalSpent]);
        rows.push(['Total Pendente', totals.totalPending]);
        rows.push(['Sobra Atual', totals.remaining]);
        rows.push([]);

        /* 50/30/20 */
        rows.push(['ORÇAMENTO 50/30/20', 'Gasto', 'Orçamento', '% Utilizado']);
        rows.push([
            'Essencial (50%)',
            totals.essentialSpent,
            totals.essentialBudget,
            totals.essentialBudget > 0 ? ((totals.essentialSpent / totals.essentialBudget) * 100).toFixed(1) + '%' : '0%'
        ]);
        rows.push([
            'Estilo de Vida (30%)',
            totals.lifestyleSpent,
            totals.lifestyleBudget,
            totals.lifestyleBudget > 0 ? ((totals.lifestyleSpent / totals.lifestyleBudget) * 100).toFixed(1) + '%' : '0%'
        ]);
        rows.push([
            'Investimento (20%)',
            totals.investmentSpent,
            totals.investmentBudget,
            totals.investmentBudget > 0 ? ((totals.investmentSpent / totals.investmentBudget) * 100).toFixed(1) + '%' : '0%'
        ]);
        rows.push([]);

        /* Transactions table */
        rows.push(['TRANSAÇÕES']);
        rows.push(['Data', 'Categoria', 'Descrição', 'Método de Pagamento', 'Classificação (50/30/20)', 'Valor', 'Status']);

        const sorted = [...monthData.transactions].sort((a, b) => {
            if (a.date && b.date) return a.date.localeCompare(b.date);
            return 0;
        });

        sorted.forEach(t => {
            rows.push([
                t.date || '',
                CATEGORY_LABELS[t.category] || t.category || '',
                t.description || '',
                PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod || '',
                CLASS_LABELS[t.classification] || t.classification || '',
                parseFloat(t.value) || 0,
                t.status === 'pago' ? 'Pago' : 'Pendente'
            ]);
        });

        /* ---- Create workbook ---- */
        const ws = XLSX.utils.aoa_to_sheet(rows);

        /* Column widths */
        ws['!cols'] = [
            { wch: 20 }, { wch: 18 }, { wch: 30 },
            { wch: 22 }, { wch: 25 }, { wch: 16 }, { wch: 12 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, monthName.substring(0, 31));

        /* ---- Download ---- */
        const filename = `controle-financeiro-${monthKey}.xlsx`;
        XLSX.writeFile(wb, filename);
    }

    return { downloadSpreadsheet };
})();
