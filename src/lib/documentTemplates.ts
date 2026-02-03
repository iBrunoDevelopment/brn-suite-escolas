import { formatCurrency, numberToWords, getSchoolDayBefore, formatCNPJ } from './printUtils';

export const generateAtaHTML = (process: any) => {
    let entry = process.financial_entries || process.financial_entry;
    if (Array.isArray(entry)) entry = entry[0];

    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;

    let quotes = process.quotes || process.accountability_quotes || process.accountability_quote || [];

    // Fallback: If no quotes found, try to use supplier from financial entry
    if (quotes.length === 0 && entry?.suppliers) {
        const sup = entry.suppliers;
        quotes = [{
            supplier_name: sup.name,
            supplier_cnpj: sup.cnpj,
            total_value: Math.abs(entry.value || 0),
            is_winner: true,
            supplier_id: sup.id
        }];
    }

    const winnerQuote = quotes.find((q: any) => q.is_winner);
    const competitorQuotes = quotes.filter((q: any) => !q.is_winner) || [];
    const allQuotes = [winnerQuote, ...competitorQuotes].filter(Boolean).slice(0, 3);

    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const docDate = getSchoolDayBefore(invoiceDate, 2);
    const meetingTime = docDate.getDate() % 2 === 0 ? '15:30' : '09:00';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <title>Ata de Assembleia - BRN Suite</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #ffffff; padding: 20px; color: black; }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .print-container { box-shadow: none !important; border: none !important; width: 100% !important; padding: 1.5cm 2cm !important; }
            @page { size: A4; margin: 0; }
            .no-print { display: none !important; }
        }
        .print-container { background: white; width: 210mm; margin: 0 auto; padding: 2cm; min-height: 297mm; }
        .text-justified { text-align: justify; text-justify: inter-word; line-height: 1.6; }
    </style>
</head>
<body class="flex flex-col items-center">
    <div class="print-container">
        <!-- Header -->
        <div class="text-center mb-10 space-y-4">
            <h2 class="text-[14px] font-bold uppercase">CONSELHO ESCOLAR DA ${school?.name?.toUpperCase() || 'UNIDADE EXECUTORA'}</h2>
            <h1 class="text-[14px] font-bold uppercase leading-tight">
                ATA DA ASSEMBLEIA GERAL EXTRAORDINÁRIA DA UNIDADE EXECUTORA CONSELHO ESCOLAR<br/>
                DA ${school?.name?.toUpperCase() || 'UNIDADE EXECUTORA'}
            </h1>
        </div>

        <!-- Paragraph 1 -->
        <div class="text-justified text-[14px] mb-10">
            Às ${meetingTime} horas do dia <strong>${docDate.getDate()} DE ${docDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} DE ${docDate.getFullYear()}</strong>, foi realizada pesquisa de preços para aquisição de produtos do <strong>${entry?.description?.toUpperCase()}</strong>, com recursos oriundos do <strong>${program?.name || 'PNAE/FNDE'}</strong>, entre as empresas:
        </div>

        <!-- Proponents Section -->
        <div class="space-y-6 mb-12 text-[14px]">
            ${allQuotes.map((q, i) => `
            <div>
                <p class="font-bold mb-1">${i + 1} - ${q.supplier_name?.toUpperCase()}</p>
                <div class="ml-4 grid grid-cols-[60px_1fr] gap-x-2 leading-relaxed">
                    <span class="font-medium text-gray-700">CNPJ:</span>
                    <span>${formatCNPJ(q.supplier_cnpj)}</span>
                    <span class="font-medium text-gray-700">VALOR:</span>
                    <div>
                        <span class="font-bold">${formatCurrency(q.total_value)}</span>
                        <span class="ml-2 italic text-gray-600">(${numberToWords(q.total_value)})</span>
                    </div>
                </div>
            </div>`).join('')}
        </div>

        <!-- Paragraph 2 -->
        <div class="text-justified text-[14px] mb-12">
            Portanto, verificamos que o fornecedor <strong>${winnerQuote?.supplier_name?.toUpperCase()}</strong>, apresentou a melhor proposta, sendo assim autorizamos a aquisição dos produtos ofertados, atendendo as normas do FNDE. Nada mais havendo a tratar, o Presidente, deu por encerrada a reunião. Eu, <strong>${school?.secretary?.toUpperCase() || '____________________'}</strong>, lavrei a presente ata que depois de lida e aprovada, será assinada por mim e pelos demais presentes.
        </div>

        <!-- Location and Date -->
        <div class="text-center font-bold text-[14px] mb-16 uppercase">
            ${school?.city?.toUpperCase() || 'ALAGOAS'}/AL, ${docDate.getDate()} DE ${docDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} DE ${docDate.getFullYear()}
        </div>

        <!-- Signatures Section -->
        <div class="grid grid-cols-2 gap-x-20 mb-8 items-end">
            <div class="text-left">
                <p class="text-[14px] font-bold underline underline-offset-8 decoration-transparent">Primeiro Secretário:</p>
            </div>
            <div class="text-left">
                <p class="text-[14px] font-bold underline underline-offset-8 decoration-transparent">Presidente:</p>
            </div>
        </div>

        <!-- Conselheiros Section -->
        <div class="text-[14px] mb-10">
            <p class="font-bold">Conselheiros:</p>
        </div>

        <!-- Subtle Footer Info -->
        <div class="mt-auto pt-10 flex justify-between items-center text-[8px] text-gray-300 border-t border-gray-100 no-print">
            <div>Hash ID: ${process.id.substring(0, 8).toUpperCase()}</div>
            <div>Emitido via BRN Suite Escolas em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    </div>
</body>
</html>`;
};



export const generateConsolidacaoHTML = (process: any) => {
    let entry = process.financial_entries || process.financial_entry;
    if (Array.isArray(entry)) entry = entry[0];

    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;

    let quotes = process.quotes || process.accountability_quotes || process.accountability_quote || [];

    // Fallback
    if (quotes.length === 0 && entry?.suppliers) {
        const sup = entry.suppliers;
        quotes = [{
            supplier_name: sup.name,
            supplier_cnpj: sup.cnpj,
            total_value: Math.abs(entry.value || 0),
            is_winner: true,
            supplier_id: sup.id
        }];
    }

    const winnerQuote = quotes.find((q: any) => q.is_winner);
    const competitorQuotes = quotes.filter((q: any) => !q.is_winner) || [];
    const allQuotes = [winnerQuote, ...competitorQuotes].filter(Boolean).slice(0, 3);
    const items = (process.items || process.accountability_items || []);
    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();

    const getUnitPrice = (item: any, quote: any) => {
        const qItem = quote.accountability_quote_items?.find((qi: any) => qi.description === item.description);
        return quote.is_winner ? item.winner_unit_price : (qItem?.unit_price || 0);
    };

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <title>Consolidação de Pesquisas</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background: white; padding: 10px; font-size: 8px; }
        @media print { @page { size: A4 landscape; margin: 1cm; } body { padding: 0; } }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        th, td { border: 1.5px solid black; padding: 2px 4px; }
        .bg-gray { background-color: #f3f3f3; }
        .font-bold { font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .uppercase { text-transform: uppercase; }
        .bloco-title { background: #eee; font-weight: bold; padding: 4px; border: 1.5px solid black; border-bottom: none; }
    </style>
</head>
<body>
    <div class="w-full">
        <div class="flex justify-between items-end mb-4">
            <div class="font-bold text-lg">PNAE/FNDE</div>
            <div class="font-bold text-lg">CONSOLIDAÇÃO DE PESQUISAS DE PREÇOS</div>
        </div>

        <div class="bloco-title uppercase">BLOCO I - IDENTIFICAÇÃO DA UNIDADE EXECUTORA PRÓPRIA (UEx) / ENTIDADE MANTENEDORA (EM)</div>
        <table>
            <tr>
                <td width="55%"><span class="font-bold">Uex:</span> ${school?.name?.toUpperCase()}</td>
                <td width="15%">${formatCNPJ(school?.cnpj)}</td>
                <td width="10%" class="bg-gray font-bold">RECURSO:</td>
                <td width="10%">${program?.name || '---'}</td>
                <td width="5%" class="bg-gray font-bold">EXERCÍCIO:</td>
                <td width="5%">${invoiceDate.getFullYear()}</td>
            </tr>
        </table>

        <div class="bloco-title uppercase">BLOCO II - IDENTIFICAÇÃO DOS PROPONENTES</div>
        <table>
            <tr class="bg-gray font-bold text-center">
                <td>PROPONENTE (A)</td>
                <td>PROPONENTE (B)</td>
                <td>PROPONENTE (C)</td>
            </tr>
            <tr class="uppercase">
                <td>${allQuotes[0]?.supplier_name || '---'}<br/>${formatCNPJ(allQuotes[0]?.supplier_cnpj)}</td>
                <td>${allQuotes[1]?.supplier_name || '---'}<br/>${formatCNPJ(allQuotes[1]?.supplier_cnpj)}</td>
                <td>${allQuotes[2]?.supplier_name || '---'}<br/>${formatCNPJ(allQuotes[2]?.supplier_cnpj)}</td>
            </tr>
        </table>

        <div class="bloco-title uppercase">BLOCO III - PROPOSTAS</div>
        <table>
            <thead class="bg-gray font-bold text-center">
                <tr>
                    <td rowspan="2">Item</td>
                    <td rowspan="2">Descrição</td>
                    <td rowspan="2">Unid</td>
                    <td rowspan="2">Qtde</td>
                    <td colspan="4">PREÇOS UNITÁRIOS</td>
                    <td>Vencedor</td>
                    <td colspan="3">MENOR PREÇO POR ITEM</td>
                    <td colspan="3">MENOR PREÇO GLOBAL</td>
                </tr>
                <tr>
                    <td>Prop (A)</td>
                    <td>Prop (B)</td>
                    <td>Prop (C)</td>
                    <td>M. Preço</td>
                    <td></td>
                    <td>Prop (A)</td>
                    <td>Prop (B)</td>
                    <td>Prop (C)</td>
                    <td>Prop (A)</td>
                    <td>Prop (B)</td>
                    <td>Prop (C)</td>
                </tr>
            </thead>
            <tbody>
                ${items.map((it, idx) => {
        const pA = allQuotes[0] ? getUnitPrice(it, allQuotes[0]) : 0;
        const pB = allQuotes[1] ? getUnitPrice(it, allQuotes[1]) : 0;
        const pC = allQuotes[2] ? getUnitPrice(it, allQuotes[2]) : 0;
        const prices = [pA, pB, pC].filter(p => p > 0);
        const minP = prices.length > 0 ? Math.min(...prices) : 0;
        return `
                <tr class="uppercase text-center">
                    <td>${String(idx + 1).padStart(2, '0')}</td>
                    <td class="text-left">${it.description}</td>
                    <td>${it.unit}</td>
                    <td>${it.quantity}</td>
                    <td class="${pA === minP && pA > 0 ? 'bg-yellow-100' : ''}">${pA ? formatCurrency(pA) : ''}</td>
                    <td class="${pB === minP && pB > 0 ? 'bg-yellow-100' : ''}">${pB ? formatCurrency(pB) : ''}</td>
                    <td class="${pC === minP && pC > 0 ? 'bg-yellow-100' : ''}">${pC ? formatCurrency(pC) : ''}</td>
                    <td>${formatCurrency(minP)}</td>
                    <td>Prop (${pA === minP ? 'A' : pB === minP ? 'B' : 'C'})</td>
                    <td>${pA === minP ? formatCurrency(pA * it.quantity) : ''}</td>
                    <td>${pB === minP ? formatCurrency(pB * it.quantity) : ''}</td>
                    <td>${pC === minP ? formatCurrency(pC * it.quantity) : ''}</td>
                    <td>${pA ? formatCurrency(pA * it.quantity) : ''}</td>
                    <td>${pB ? formatCurrency(pB * it.quantity) : ''}</td>
                    <td>${pC ? formatCurrency(pC * it.quantity) : ''}</td>
                </tr>`;
    }).join('')}
            </tbody>
        </table>

        <div class="bloco-title uppercase">BLOCO IV - APURAÇÃO DAS PROPOSTAS</div>
        <table>
            <tr class="font-bold bg-gray">
                <td>VALOR TOTAL DAS PROPOSTAS</td>
                <td class="text-right">${formatCurrency(allQuotes[0]?.total_value || 0)}</td>
                <td class="text-right">${formatCurrency(allQuotes[1]?.total_value || 0)}</td>
                <td class="text-right">${formatCurrency(allQuotes[2]?.total_value || 0)}</td>
            </tr>
            <tr class="font-bold">
                <td>VALOR TOTAL COM DESCONTO</td>
                <td class="text-right text-blue-700">${formatCurrency(allQuotes[0]?.total_value - (process.discount || 0))}</td>
                <td class="text-right">${allQuotes[1] ? formatCurrency(allQuotes[1]?.total_value) : ''}</td>
                <td class="text-right">${allQuotes[2] ? formatCurrency(allQuotes[2]?.total_value) : ''}</td>
            </tr>
        </table>

        <div class="grid grid-cols-2 gap-8 mt-4">
            <div class="text-center font-bold">
                <p>LOCAL E DATA: ${school?.city?.toUpperCase() || 'ALAGOAS'}, ${invoiceDate.toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="text-center font-bold">
                <div class="border-t border-black mb-1 mx-8 pt-1">${school?.director?.toUpperCase() || 'PRESIDENTE'}</div>
                <p>NOME DO PRESIDENTE DA Uex</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateOrdemHTML = (process: any) => {
    let entry = process.financial_entries || process.financial_entry;
    if (Array.isArray(entry)) entry = entry[0];

    const school = entry?.schools || entry?.school;
    let quotes = process.quotes || process.accountability_quotes || process.accountability_quote || [];

    // Fallback
    if (quotes.length === 0 && entry?.suppliers) {
        quotes = [{
            supplier_name: entry.suppliers.name,
            supplier_cnpj: entry.suppliers.cnpj,
            total_value: Math.abs(entry.value || 0),
            is_winner: true
        }];
    }

    const winner = quotes.find((q: any) => q.is_winner);
    const items = (process.items || process.accountability_items || []).slice(0, 27);
    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const dateText = invoiceDate.toLocaleDateString('pt-BR');

    const rows = [...items];
    while (rows.length < 27) rows.push({});

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <title>Ordem de Compra</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: white; padding: 10px; font-size: 10px; }
        @media print { 
            @page { size: A4; margin: 1cm; } 
            body { padding: 0; } 
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: -1px; table-layout: fixed; }
        th, td { border: 1.5px solid black; padding: 4px 8px; height: 18px; word-wrap: break-word; overflow: hidden; }
        .bg-gray { background-color: #f3f3f3; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .uppercase { text-transform: uppercase; }
    </style>
</head>
<body>
    <div style="width: 100%; max-width: 190mm; margin: 0 auto;">
        <table>
            <tr>
                <td class="font-bold text-sm">PNAE/FNDE</td>
                <td class="text-right font-bold text-sm">ORDEM DE COMPRA</td>
            </tr>
        </table>
        <table>
            <tr>
                <td width="15%" class="font-bold text-center bg-gray">UEX CONTRATANTE:</td>
                <td>${school?.name?.toUpperCase() || '---'}</td>
                <td width="10%" class="font-bold text-center bg-gray">CNPJ:</td>
                <td width="20%">${formatCNPJ(school?.cnpj)}</td>
            </tr>
            <tr>
                <td class="font-bold text-center bg-gray">NOME DA ESCOLA:</td>
                <td>${school?.name?.toUpperCase() || '---'}</td>
                <td class="font-bold text-center bg-gray">SEEC:</td>
                <td>${school?.seec || '---'}</td>
            </tr>
        </table>
        <table>
            <tr>
                <td width="15%" class="font-bold text-center bg-gray uppercase">Proponente Vencedor:</td>
                <td>${winner?.supplier_name?.toUpperCase() || '---'}</td>
                <td width="10%" class="font-bold text-center bg-gray">CNPJ:</td>
                <td width="20%">${formatCNPJ(winner?.supplier_cnpj)}</td>
            </tr>
        </table>
        <div class="text-[9px] p-2 leading-tight border-x border-black">
            Autorizo o fornecimento do produto/material, conforme descrição na planilha abaixo, em razão do proponente acima identificado ter apresentado uma proposta adequada e de menor preço, conforme previsto na RESOLUÇÃO CD/FNDE Nº 09, DE 02 DE MARÇO DE 2011.
        </div>
        <table>
            <thead class="bg-gray font-bold text-center uppercase">
                <tr>
                    <td width="5%">ITEM</td>
                    <td width="50%">DESCRIÇÃO</td>
                    <td width="8%">UND.</td>
                    <td width="8%">QTD.</td>
                    <td width="14%">VALOR UNITÁRIO</td>
                    <td width="15%">VALOR TOTAL</td>
                </tr>
            </thead>
            <tbody>
                ${rows.map((it: any, idx) => `
                <tr class="uppercase">
                    <td class="text-center">${it.description ? String(idx + 1).padStart(2, '0') : ''}</td>
                    <td>${it.description || ''}</td>
                    <td class="text-center">${it.unit || ''}</td>
                    <td class="text-center">${it.quantity || ''}</td>
                    <td class="text-right">${it.winner_unit_price ? formatCurrency(it.winner_unit_price) : ''}</td>
                    <td class="text-right font-bold">${it.description ? formatCurrency((it.quantity || 0) * (it.winner_unit_price || 0)) : ''}</td>
                </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" class="text-right font-bold bg-gray uppercase">TOTAL</td>
                    <td class="text-right font-bold">${formatCurrency((winner?.total_value || 0) - (process.discount || 0))}</td>
                </tr>
            </tfoot>
        </table>
        <table>
            <tr>
                <td class="font-bold text-center bg-gray" width="20%">NOME DO(A) RESPONSÁVEL</td>
                <td>${school?.director?.toUpperCase() || '---'}</td>
                <td class="font-bold text-center bg-gray" width="15%">FUNÇÃO</td>
                <td class="text-center uppercase" width="25%">PRESIDENTE</td>
            </tr>
        </table>
        <table>
            <tr>
                <td class="font-bold text-center bg-gray" width="20%">LOCAL E DATA</td>
                <td>${school?.city?.toUpperCase() || 'ALAGOAS'}, ${dateText}</td>
                <td class="font-bold text-center bg-gray" width="20%">ASSINATURA DO(A) RESPONSÁVEL</td>
                <td class="h-10"></td>
            </tr>
        </table>
    </div>
</body>
</html>`;
};

export const generateReciboHTML = (process: any) => {
    let entry = process.financial_entries || process.financial_entry;
    if (Array.isArray(entry)) entry = entry[0];

    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;
    let quotes = process.quotes || process.accountability_quotes || process.accountability_quote || [];

    // Fallback
    if (quotes.length === 0 && entry?.suppliers) {
        quotes = [{
            supplier_name: entry.suppliers.name,
            supplier_cnpj: entry.suppliers.cnpj,
            total_value: Math.abs(entry.value || 0),
            is_winner: true
        }];
    }

    const winner = quotes.find((q: any) => q.is_winner);
    const supplier = winner?.suppliers || winner?.supplier || entry?.suppliers || entry?.supplier;

    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const dateLong = invoiceDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalValue = (winner?.total_value || 0) - (process.discount || 0);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <title>Recibo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 20px; }
        @media print { 
            @page { size: A4; margin: 0; } 
            body { background: white !important; padding: 0 !important; }
            .print-container { padding: 1.5cm !important; width: 100% !important; border: none !important; box-shadow: none !important; } 
        }
        .print-container { background: white; width: 190mm; margin: 0 auto; padding: 2cm; min-height: 297mm; border: 1px solid #e2e8f0; position: relative; }
        .text-justified { text-align: justify; text-justify: inter-word; line-height: 1.8; }
    </style>
</head>
<body class="flex flex-col items-center">
    <div class="print-container">
        <div class="text-center border-b pb-8 mb-12">
            <h1 class="text-xl font-black uppercase mb-2">${supplier?.name || winner?.supplier_name || 'FORNECEDOR'}</h1>
            <div class="text-[11px] text-gray-500 font-medium space-y-0.5">
                <p>CNPJ: ${formatCNPJ(supplier?.cnpj || winner?.supplier_cnpj)}</p>
                <p>${supplier?.address || 'ENDEREÇO'}</p>
                <p>CEP: ${supplier?.cep || '00.000-000'} - ${supplier?.city || 'LOCAL'}/AL</p>
            </div>
        </div>

        <div class="flex justify-between items-center mb-16">
            <h2 class="text-4xl font-black uppercase tracking-tighter">RECIBO</h2>
            <div class="border-2 border-gray-100 bg-gray-50 p-4 rounded-xl text-right min-w-[200px]">
                <span class="block text-[10px] uppercase font-bold text-gray-400 mb-1">VALOR TOTAL</span>
                <span class="text-2xl font-black">${formatCurrency(totalValue)}</span>
            </div>
        </div>

        <div class="p-8 text-justified text-[14px] bg-gray-50/30 rounded-2xl border border-gray-100">
            RECEBEMOS DO <strong>${school?.name?.toUpperCase() || 'UNIDADE EXECUTORA'}</strong>, 
            CNPJ <strong>${formatCNPJ(school?.cnpj)}</strong>, SITUADO NA <strong>${school?.address?.toUpperCase()}</strong>, 
            A IMPORTÂNCIA DE <strong>${formatCurrency(totalValue)} (${numberToWords(totalValue).toUpperCase()})</strong>, 
            REFERENTE A COMPRA DE PRODUTOS CONFORME NOTA FISCAL DE Nº <strong>${entry?.invoice_number || '_______'}</strong>, 
            DATADA DE <strong>${invoiceDate.toLocaleDateString('pt-BR')}</strong>.
            <br/><br/>
            PAGO COM RECURSO <strong>${program?.name?.toUpperCase() || 'PNAE/FNDE'}</strong>, 
            AUTORIZAÇÃO Nº <strong>${process.id.substring(0, 6).toUpperCase()}</strong>, 
            DATADA DE <strong>${new Date().toLocaleDateString('pt-BR')}</strong>.
        </div>

        <div class="text-right italic text-[13px] mt-20 mb-32">
            ${school?.city || 'ALAGOAS'}, ${dateLong}
        </div>

        <div class="flex flex-col items-center">
            <div class="w-2/3 border-t border-black mb-2"></div>
            <p class="text-[11px] font-black uppercase text-gray-900">ASSINATURA DO FORNECEDOR</p>
            <p class="text-[10px] text-gray-400 font-medium uppercase">${supplier?.name || winner?.supplier_name}</p>
        </div>
    </div>
</body>
</html>`;
};

export const generateCotacaoHTML = (process: any, supplierIdx: number = 0) => {
    let entry = process.financial_entries || process.financial_entry;
    if (Array.isArray(entry)) entry = entry[0];
    const school = entry?.schools || entry?.school;

    const dbQuotes = process.quotes || process.accountability_quotes || process.accountability_quote || [];
    const winnerQuoteDB = dbQuotes.find((q: any) => q.is_winner);
    const competitorQuotes = dbQuotes.filter((q: any) => !q.is_winner) || [];

    const winnerQuote = winnerQuoteDB ? {
        ...winnerQuoteDB,
        suppliers: winnerQuoteDB.suppliers || entry?.suppliers
    } : (entry?.suppliers ? {
        supplier_name: entry.suppliers.name,
        supplier_cnpj: entry.suppliers.cnpj,
        total_value: Math.abs(entry.value || 0),
        is_winner: true,
        suppliers: entry.suppliers
    } : null);

    const quotes = [winnerQuote, ...competitorQuotes].filter(Boolean);
    const quote = quotes[supplierIdx];

    if (!quote) return '<h1>Erro: Cotação não encontrada</h1>';

    const supplier = (quote as any).suppliers || (quote as any).supplier;
    const items = (process.items || process.accountability_items || []).slice(0, 27);
    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const quoteDate = getSchoolDayBefore(invoiceDate, 15);
    const dateText = quoteDate.toLocaleDateString('pt-BR');

    const rows = [...items];
    while (rows.length < 27) rows.push({});

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <title>Planilha de Pesquisa de Preços</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: white; padding: 10px; font-size: 9px; }
        @media print { @page { size: A4; margin: 1cm; } body { padding: 0; } }
        table { width: 100%; border-collapse: collapse; margin-bottom: -1px; table-layout: fixed; }
        th, td { border: 1px solid black; padding: 3px 6px; height: 18px; word-wrap: break-word; }
        .bg-gray { background-color: #f3f3f3; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
    </style>
</head>
<body>
    <div style="width: 100%; max-width: 190mm; margin: 0 auto;">
        <table>
            <tr class="bg-gray font-bold text-center text-[10px]">
                <td>PNAE/FNDE - PLANILHA DE PESQUISA DE PREÇOS - ORÇAMENTO</td>
            </tr>
        </table>
        <table>
            <tr>
                <td width="65%" class="font-bold bg-gray"></td>
                <td width="10%" class="font-bold bg-gray">CNPJ:</td>
                <td>${formatCNPJ(quote.supplier_cnpj)}</td>
            </tr>
            <tr>
                <td class="font-bold uppercase">NOME DO FORNECEDOR: ${quote.supplier_name}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td colspan="3"><span class="font-bold uppercase">ENDEREÇO:</span> ${supplier?.address || '---'}</td>
            </tr>
            <tr>
                <td class="uppercase"><span class="font-bold">UF:</span> ${supplier?.uf || 'AL'} <span class="font-bold ml-4">MUNICÍPIO:</span> ${supplier?.city || '---'} <span class="font-bold ml-4">TELEFONE:</span> ${supplier?.phone || '---'}</td>
                <td colspan="2"></td>
            </tr>
        </table>
        <table class="border-t-2">
            <tr>
                <td width="65%" class="font-bold bg-gray"></td>
                <td width="10%" class="font-bold bg-gray">CNPJ:</td>
                <td>${formatCNPJ(school?.cnpj)}</td>
            </tr>
            <tr>
                <td class="font-bold uppercase">NOME DO CLIENTE: ${school?.name}</td>
                <td colspan="2"></td>
            </tr>
            <tr>
                <td colspan="3"><span class="font-bold uppercase">ENDEREÇO:</span> ${school?.address || '---'}</td>
            </tr>
            <tr>
                <td class="uppercase"><span class="font-bold">UF:</span> AL <span class="font-bold ml-4">MUNICÍPIO:</span> ${school?.city || '---'} <span class="font-bold ml-4">TELEFONE:</span> ${school?.phone || '---'}</td>
                <td colspan="2"></td>
            </tr>
        </table>
        <table class="mt-4">
            <thead class="bg-gray font-bold text-center">
                <tr>
                    <td width="5%">ITEM</td>
                    <td width="50%">DESCRIÇÃO</td>
                    <td width="8%">UND.</td>
                    <td width="8%">QTD.</td>
                    <td width="15%">VALOR UNITÁRIO</td>
                    <td width="15%">VALOR TOTAL</td>
                </tr>
            </thead>
            <tbody>
                ${rows.map((it: any, idx) => {
        const qItem = quote.accountability_quote_items?.find((qi: any) => qi.description === it.description);
        const price = quote.is_winner ? it.winner_unit_price : (qItem?.unit_price || 0);
        return `
                <tr class="uppercase text-[9px]">
                    <td class="text-center">${it.description ? String(idx + 1).padStart(2, '0') : ''}</td>
                    <td>${it.description || ''}</td>
                    <td class="text-center">${it.unit || ''}</td>
                    <td class="text-center">${it.quantity || ''}</td>
                    <td class="text-right">${price ? formatCurrency(price) : ''}</td>
                    <td class="text-right font-bold">${price ? formatCurrency(price * it.quantity) : ''}</td>
                </tr>`;
    }).join('')}
            </tbody>
            <tfoot>
                <tr class="bg-gray font-bold">
                    <td colspan="5" class="text-center uppercase">VALOR TOTAL</td>
                    <td class="text-right">${formatCurrency(quote.total_value)}</td>
                </tr>
            </tfoot>
        </table>
        <div class="mt-4 flex justify-end gap-2 font-bold uppercase">
            <span>DATA:</span> <span>${dateText}</span>
        </div>
        <div class="mt-6 space-y-1 font-bold text-[8px] leading-tight">
            <p>Serão atendidas as seguintes condições:</p>
            <p>Todos os itens da planilha deverão ser cotados;</p>
            <p>Período de validade da proposta: 30 dias da catação;</p>
            <p>Prazo máximo de entrega/execução: 02 dias a partir da ordem de compra/serviço pela Unidade Executora;</p>
            <p>Recebimento mediante apresentação de nota fiscal e certidões;</p>
            <p>Pagamento após conferência atesto da nota fiscal, mediante apresentação de recibo.</p>
        </div>
    </div>
</body>
</html>`;
};




