# Dashboard de Controle Financeiro

Dashboard web moderno e estético para controle financeiro pessoal, replicando as funcionalidades da planilha existente com uma experiência visual premium.

## Análise da Planilha Atual

Com base na imagem fornecida, a planilha possui:

| Coluna | Descrição | Valores Exemplo |
|--------|-----------|-----------------|
| **Data** | Data da transação | 05/05/2026, 18/05/2026 |
| **Categoria** | Tipo da transação (com cores) | Receita 🟢, Contas 🟠, Parcela 🟡, Assinatura 🟢claro, Fatura 🔵, Futuro 🔵claro |
| **Descrição** | Texto livre | Salário, Internet, Faculdade |
| **Método de Pagamento** | Como foi pago | Conta Corrente, Pix, Cartão de Crédito |
| **Classificação (50/30/20)** | Regra orçamentária | Renda, Essencial (50%), Estilo de Vida (30%), Investimento (20%) |
| **Valor** | Valor monetário (R$) | R$ 3.388,11 / -R$ 136,00 |
| **Status** | Situação do pagamento | Pago ✅, Pendente ⏳ |
| **Total Gasto** | Soma automática dos gastos pagos | R$ 1.229,25 |
| **Sobra** | Salário - Total Gasto | R$ 2.158,86 |

### Regra 50/30/20
- **Essencial (50%)**: Necessidades básicas (contas, fatura, faculdade)
- **Estilo de Vida (30%)**: Desejos e lazer (assinaturas, parcelas)
- **Investimento (20%)**: Poupança e investimentos futuros

## Proposta de Design

### Visual & Estética
- **Tema**: Dark mode premium com acentos vibrantes em gradiente (roxo/azul/cyan)
- **Tipografia**: Google Fonts - **Inter** (corpo) + **Outfit** (títulos)
- **Efeitos**: Glassmorphism nos cards, micro-animações em hover/focus, transições suaves
- **Paleta de cores**:
  - Background: `#0a0a1a` → `#111827`
  - Cards: `rgba(255,255,255,0.05)` com backdrop-blur
  - Acentos: gradiente `#8b5cf6` → `#06b6d4`
  - Categorias: cada uma com sua cor vibrante (badges coloridos)

### Layout (Single Page App)
```
┌─────────────────────────────────────────────────────────┐
│  🏦 CONTROLE FINANCEIRO          [Seletor de Mês] [⬇]  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Salário  │ │  Gastos  │ │  Sobra   │ │ Pendente │   │
│  │ Total    │ │  Pagos   │ │ Atual    │ │ Restante │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────────┐   │
│  │  Gráfico Donut      │ │  Barras 50/30/20        │   │
│  │  Categorias         │ │  Orçamento vs Real      │   │
│  └─────────────────────┘ └─────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  💰 SALÁRIOS / RENDAS                    [+ Adicionar]  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Salário 1: R$ 3.388,11  |  Dia 5  | [🗑]      │    │
│  │  Salário 2: R$ X.XXX,XX  |  Dia 20 | [🗑]      │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  📋 TRANSAÇÕES                [+ Nova] [🔍 Filtro]      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Data | Categoria | Descrição | Pagto | Class.   │    │
│  │      | (badge)   |           |       | 50/30/20 │    │
│  │      |           |           | Valor | Status   │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                          [📥 Baixar Planilha]           │
└─────────────────────────────────────────────────────────┘
```

## Funcionalidades Detalhadas

### 1. Gestão de Salários
- Input para adicionar múltiplos salários (ex: dia 5 e dia 20)
- Cada entrada de salário com: valor + data de recebimento
- Soma automática da renda total do mês
- Animação ao adicionar/remover salários

### 2. Tabela de Transações
- Adicionar nova transação via modal animado
- Campos: Data, Categoria (dropdown), Descrição (texto), Método de Pagamento (dropdown), Classificação 50/30/20 (dropdown), Valor (input R$), Status (toggle Pago/Pendente)
- Edição inline ao clicar em uma célula
- Deletar transação com confirmação animada
- Filtros por categoria, status e classificação

### 3. Cálculos Automáticos (tempo real)
- **Total Gasto**: soma dos valores com status "Pago"
- **Sobra**: Salário Total - Total Gasto
- **Gastos Pendentes**: soma dos valores com status "Pendente"
- **Distribuição 50/30/20**: quanto foi gasto em cada categoria vs. meta

### 4. Visualizações (Charts com Canvas API puro)
- **Donut chart**: distribuição por categoria (Contas, Assinatura, Parcela, etc.)
- **Barras horizontais**: comparação 50/30/20 (meta vs. real)
- Animações suaves nos gráficos

### 5. Seletor de Mês
- Navegação entre meses com animação de slide
- Cada mês tem seus próprios dados independentes
- Dados persistidos no `localStorage`

### 6. Exportação
- Botão para baixar em formato `.xlsx` usando a biblioteca **SheetJS (xlsx)**
- Formato idêntico à planilha original

## Proposta Técnica

### Stack
- **HTML5** + **CSS3** + **JavaScript** vanilla (sem frameworks)
- **SheetJS (xlsx.js)** via CDN para exportação de planilhas
- **Google Fonts** (Inter + Outfit) via CDN
- Gráficos renderizados com **Canvas API** nativa
- Persistência com **localStorage**

### Estrutura de Arquivos

```
c:\Users\Thigas\Desktop\Controle Financeiro\
├── index.html          # Estrutura HTML principal
├── css/
│   └── styles.css      # Design system + todos os estilos
└── js/
    ├── app.js           # Inicialização, estado global, orquestração
    ├── transactions.js  # CRUD de transações e salários
    ├── charts.js        # Gráficos (donut + barras) com Canvas API
    ├── storage.js       # Persistência localStorage
    └── export.js        # Exportação para .xlsx
```

### Categorias e Cores

| Categoria | Cor | Hex |
|-----------|-----|-----|
| Receita | Verde | `#22c55e` |
| Contas | Laranja | `#f97316` |
| Parcela | Amarelo | `#eab308` |
| Assinatura | Teal | `#14b8a6` |
| Fatura | Roxo | `#a855f7` |
| Futuro | Azul | `#3b82f6` |

### Métodos de Pagamento
- Conta Corrente
- Pix
- Cartão de Crédito
- Dinheiro
- Boleto

### Classificações (50/30/20)
- Renda (receitas)
- Essencial (50%)
- Estilo de Vida (30%)
- Investimento (20%)

## Verificação

### Testes Manuais
1. Adicionar múltiplos salários e verificar soma correta
2. Adicionar transações de todas as categorias
3. Alternar status Pago/Pendente e verificar recálculo automático
4. Navegar entre meses e verificar persistência dos dados
5. Exportar planilha e verificar formato correto no Excel
6. Testar responsividade em diferentes tamanhos de tela
7. Verificar animações e transições em todos os elementos interativos

### Validações Automáticas
- Abrir no navegador e verificar que não há erros no console
- Testar exportação `.xlsx` e abrir no Excel/Google Sheets
