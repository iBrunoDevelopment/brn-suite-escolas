import { formatCurrency, numberToWords, getSchoolDayBefore, subtractBusinessDays } from './printUtils';

export const generateAtaHTML = (process: any) => {
    const entry = process.financial_entries || process.financial_entry;
    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;

    // Reference Date: Invoice Date (entry.date)
    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    // Document Date: 2 school days before invoice
    const docDate = getSchoolDayBefore(invoiceDate, 2);

    const day = docDate.getDate().toString().padStart(2, '0');
    const month = docDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const year = docDate.getFullYear();
    const dateText = `${day} DE ${month} DE ${year}`;

    // Hour Logic
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const displayHour = currentHour < 12 ? '09' : '15';
    const timeText = `${displayHour}:${currentMinutes}`;

    // Sort quotes: winner first, then others
    const quotes = process.quotes || [];
    let winnerQuote = quotes.find((q: any) => q.is_winner);
    // Fallback for winner CNPJ if missing in the quote record
    if (winnerQuote && !winnerQuote.supplier_cnpj) {
        winnerQuote.supplier_cnpj = entry?.suppliers?.cnpj || entry?.supplier?.cnpj;
    }

    const competitorQuotes = quotes.filter((q: any) => !q.is_winner) || [];
    const allQuotes = [winnerQuote, ...competitorQuotes].filter(Boolean).slice(0, 3);

    return `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Ata de Assembleia - BRN Suite</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 20px; }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print { display: none !important; }
            @page { 
                size: A4; 
                margin: 1.5cm; 
            }
            .section-no-break { break-inside: avoid; }
            .signature-footer { break-inside: avoid; }
        }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print { display: none !important; }
            @page { 
                size: A4; 
                margin: 1cm; 
            }
            .section-no-break { break-inside: avoid; }
            .signature-footer { break-inside: avoid; }
        }
        .print-container {
            background-color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            width: 210mm;
            min-height: auto;
            margin: 0 auto;
            padding: 2cm;
        }
    </style>
</head>
<body class="flex flex-col items-center">
    <div class="print-container">
        <div class="text-center mb-10">
            <h2 class="text-base font-bold uppercase tracking-wide mb-4 text-gray-800">
                Conselho Escolar da ${school?.name || 'Escola'}
            </h2>
            <h1 class="text-xl font-bold uppercase leading-relaxed text-gray-900 border-b-2 border-gray-900 pb-4">
                Ata da Assembleia Geral Extraordinária da Unidade Executora Conselho Escolar da ${school?.name || 'Escola'}
            </h1>
        </div>
        
        <div class="mb-6 leading-relaxed text-gray-800 text-sm">
            <p>
                Às ${timeText} horas do dia <strong>${dateText}</strong>, foi realizada pesquisa de preços para aquisição de produtos do <strong>${entry?.description?.toUpperCase() || 'ITENS DE PRESTAÇÃO'}</strong>, com recursos oriundos do <strong>${program?.name || program || 'FNDE'}</strong>, entre as empresas:
            </p>
        </div>

        <div class="space-y-4 mb-8">
            ${allQuotes.map((q: any, idx: number) => `
            <div class="p-3 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">${idx + 1}</span>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold uppercase text-xs leading-none">${q.supplier_name}</h3>
                            <span class="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">${q.supplier_cnpj || '---'}</span>
                        </div>
                        <div class="mt-1 flex items-baseline gap-2">
                            <span class="text-xs font-black text-gray-900">${formatCurrency(q.is_winner ? (q.total_value - (process.discount || 0)) : q.total_value)}</span>
                            <span class="text-[10px] text-gray-500 italic">(${numberToWords(q.is_winner ? (q.total_value - (process.discount || 0)) : q.total_value)})</span>
                        </div>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="mb-10 leading-relaxed text-sm text-gray-800 bg-gray-50 p-6 rounded border border-gray-200">
            <p>
                Portanto, verificamos que o fornecedor <strong class="uppercase">${winnerQuote?.supplier_name}</strong> apresentou a melhor proposta, sendo assim autorizamos a aquisição dos produtos ofertados, atendendo as normas do FNDE. Nada mais havendo a tratar, o Presidente deu por encerrada a reunião. Eu, <span class="font-bold underline uppercase">${school?.secretary || 'Secretário(a)'}</span>, lavrei a presente ata que depois de lida e aprovada, será assinada por mi e pelos demais presentes.
            </p>
        </div>

        <div class="text-center mb-8 section-no-break">
            <p class="text-xs font-bold uppercase tracking-wide">
                ${school?.city || 'União dos Palmares'}/AL, ${dateText}
            </p>
        </div>

        <div class="grid grid-cols-2 gap-12 mt-12 signature-footer">
            <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-900 mb-2"></div>
                <p class="font-bold text-xs uppercase">Primeiro Secretário</p>
                <p class="text-[10px] text-gray-500">${school?.secretary || ''}</p>
            </div>
            <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-900 mb-2"></div>
                <p class="font-bold text-xs uppercase">Presidente</p>
                <p class="text-[10px] text-gray-500">${school?.director || ''}</p>
            </div>
        </div>

        <div class="mt-12">
            <p class="font-bold text-sm mb-4">Conselheiros:</p>
            <div class="space-y-6">
                <div class="flex items-end gap-2"><span class="text-xs">1.</span><div class="flex-1 border-b border-gray-300"></div></div>
                <div class="flex items-end gap-2"><span class="text-xs">2.</span><div class="flex-1 border-b border-gray-300"></div></div>
                <div class="flex items-end gap-2"><span class="text-xs">3.</span><div class="flex-1 border-b border-gray-300"></div></div>
                <div class="flex items-end gap-2"><span class="text-xs">4.</span><div class="flex-1 border-b border-gray-300"></div></div>
                <div class="flex items-end gap-2"><span class="text-xs">5.</span><div class="flex-1 border-b border-gray-300"></div></div>
                <div class="flex items-end gap-2"><span class="text-xs">6.</span><div class="flex-1 border-b border-gray-300"></div></div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateConsolidacaoHTML = (process: any) => {
    const entry = process.financial_entries || process.financial_entry;
    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;
    const quotes = process.quotes || [];

    // Sort quotes for display: winner first, then others
    const winnerQuote = quotes.find((q: any) => q.is_winner);
    const competitorQuotes = quotes.filter((q: any) => !q.is_winner) || [];
    const allQuotes = [winnerQuote, ...competitorQuotes].filter(Boolean).slice(0, 3);

    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const semester = invoiceDate.getMonth() < 6 ? '1' : '2';
    const exercicio = `${invoiceDate.getFullYear()}.${semester}`;

    const docDate = getSchoolDayBefore(invoiceDate, 2);
    const dateLong = docDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

    // Helper to get item total for a specific quote
    const getItemTotal = (item: any, quote: any) => {
        const qItem = quote.accountability_quote_items?.find((qi: any) => qi.description === item.description);
        const price = quote.is_winner ? item.winner_unit_price : (qItem?.unit_price || 0);
        return price * (item.quantity || 0);
    };

    // Helper to get unit price for a specific quote
    const getUnitPrice = (item: any, quote: any) => {
        const qItem = quote.accountability_quote_items?.find((qi: any) => qi.description === item.description);
        return quote.is_winner ? item.winner_unit_price : (qItem?.unit_price || 0);
    };

    return `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Consolidação de Pesquisas de Preços - BRN Suite</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<script>
    tailwind.config = {
        theme: {
            extend: {
                colors: {
                    primary: "#2563eb",
                    "primary-dark": "#1d4ed8",
                    "background-light": "#f3f4f6",
                    "surface-light": "#ffffff",
                    "highlight-light": "#fef08a",
                }
            }
        }
    };
</script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; background-color: #f3f4f6; padding: 20px; }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            @page { 
                size: A4 landscape; 
                margin: 1cm; 
            }
            .section-no-break { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; break-after: auto; }
            thead { display: table-header-group; }
        }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            @page { 
                size: A4 landscape; 
                margin: 0.5cm; 
            }
            .section-no-break { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; break-after: auto; }
            thead { display: table-header-group; }
        }
        .print-container {
            background-color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            width: 297mm;
            min-height: auto;
            margin: 0 auto;
            padding: 10mm;
        }
    </style>
</head>
<body class="flex flex-col items-center">
    <div class="print-container space-y-6 overflow-hidden">
        <header class="flex justify-between items-center border-b border-gray-200 pb-6 mb-8">
            <div>
                <div class="flex items-center gap-2 text-primary font-black tracking-widest text-[10px] uppercase mb-1">
                    PNAE / FNDE
                </div>
                <h1 class="text-2xl font-black text-gray-900 uppercase">Consolidação de Pesquisas de Preços</h1>
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Secretaria de Estado da Educação - Sistema de Controle Financeiro</p>
            </div>
            <div class="text-right">
                <div class="font-black text-primary uppercase text-sm">${program?.name || program || 'N/A'}</div>
                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Exercício: ${exercicio}</div>
            </div>
        </header>

        <section class="border border-gray-200 rounded overflow-hidden mb-6 section-no-break">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <h2 class="text-[10px] font-black uppercase text-gray-700 tracking-widest">Bloco I - Identificação da Unidade Executora (UEx)</h2>
            </div>
            <div class="p-4 grid grid-cols-12 gap-8">
                <div class="col-span-8">
                    <label class="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">Unidade Executora / Entidade Mantenedora</label>
                    <div class="text-xs font-black uppercase text-gray-900">${school?.name || '---'}</div>
                </div>
                <div class="col-span-4">
                    <label class="block text-[8px] font-black text-gray-400 uppercase tracking-tighter mb-1">CNPJ</label>
                    <div class="text-xs font-mono font-bold text-gray-900">${school?.cnpj || '---'}</div>
                </div>
            </div>
        </section>

        <section class="border border-gray-200 rounded overflow-hidden mb-6 section-no-break">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h2 class="text-[10px] font-black uppercase text-gray-700 tracking-widest">Bloco II - Identificação dos Proponentes</h2>
            </div>
            <div class="p-4 grid grid-cols-3 gap-4">
                ${allQuotes.map((q: any, i) => `
                <div class="p-3 rounded border border-gray-100 bg-gray-50">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black text-primary bg-blue-100 px-2 py-0.5 rounded uppercase tracking-tighter">Proponente (${String.fromCharCode(65 + i)})</span>
                    </div>
                    <div class="font-black text-[11px] text-gray-900 uppercase truncate">${q.supplier_name}</div>
                    <div class="text-[9px] font-mono font-bold text-gray-500 mt-1">${q.supplier_cnpj || '---'}</div>
                </div>
                `).join('')}
            </div>
        </section>

        <section class="border border-gray-200 rounded overflow-hidden mb-6">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-[10px] font-black uppercase text-gray-700 tracking-widest">Bloco III - Propostas Detalhadas</h2>
                <div class="flex gap-2">
                    <span class="text-[9px] px-2 py-0.5 bg-highlight-light text-yellow-900 rounded border border-yellow-200 font-black uppercase tracking-tighter italic">Melhor Preço Item</span>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-[10px] text-left border-collapse">
                    <thead class="bg-gray-100 text-gray-600 uppercase font-black border-b border-gray-200">
                        <tr class="text-center text-[9px]">
                            <th class="px-3 py-2 border-r border-gray-200" colspan="4">Item</th>
                            <th class="px-3 py-2 border-r border-gray-200 bg-blue-50" colspan="${allQuotes.length + 1}">Preços Unitários (R$)</th>
                            <th class="px-3 py-2 border-r border-gray-200 italic" colspan="${allQuotes.length}">Menor Preço por Item</th>
                            <th class="px-3 py-2" colspan="${allQuotes.length}">MENOR PREÇO GLOBAL</th>
                        </tr>
                        <tr class="text-[8px] tracking-tight">
                            <th class="px-2 py-1 w-8 text-center">Nº</th>
                            <th class="px-2 py-1">Descrição do Item</th>
                            <th class="px-2 py-1 w-10 text-center">Unid</th>
                            <th class="px-2 py-1 w-12 text-center border-r border-gray-200">Qtde</th>
                            ${allQuotes.map((_, i) => `<th class="px-2 py-1 text-center w-20">Prop (${String.fromCharCode(65 + i)})</th>`).join('')}
                            <th class="px-2 py-1 text-center w-24 border-r border-gray-200 text-primary">Vencedor</th>
                            ${allQuotes.map((_, i) => `<th class="px-2 py-1 text-center w-20 border-r border-gray-200">Prop (${String.fromCharCode(65 + i)})</th>`).join('')}
                            ${allQuotes.map((_, i) => `<th class="px-2 py-1 text-center w-20">Prop (${String.fromCharCode(65 + i)})</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                        ${(process.items || process.accountability_items || []).map((item: any, idx: number) => {
        // Find all prices for this item
        const itemPrices = allQuotes.map((q, i) => ({
            index: i,
            price: getUnitPrice(item, q)
        }));

        // Sort to find the lowest price
        const sortedPrices = [...itemPrices].sort((a, b) => a.price - b.price);
        const lowestPrice = sortedPrices[0].price;
        const itemWinnerIdx = sortedPrices[0].index;

        return `
                            <tr class="hover:bg-gray-50">
                                <td class="px-2 py-2 text-center font-mono text-gray-400">${(idx + 1).toString().padStart(2, '0')}</td>
                                <td class="px-2 py-2 font-black uppercase text-gray-900">${item.description}</td>
                                <td class="px-2 py-2 text-center font-bold text-gray-500 uppercase">${item.unit}</td>
                                <td class="px-2 py-2 text-center font-black text-gray-900 border-r border-gray-200">${item.quantity}</td>
                                ${allQuotes.map((q: any, i: number) => {
            const up = getUnitPrice(item, q);
            const isLowest = up === lowestPrice;
            return `<td class="px-2 py-2 text-center font-bold ${isLowest ? 'bg-highlight-light' : ''}">${formatCurrency(up)}</td>`;
        }).join('')}
                                <td class="px-2 py-2 text-center border-r border-gray-200 text-primary font-black italic uppercase">Prop (${String.fromCharCode(65 + itemWinnerIdx)})</td>
                                ${allQuotes.map((q: any, i: number) => {
            const isLowest = i === itemWinnerIdx;
            const total = getItemTotal(item, q);
            return `<td class="px-2 py-2 text-center border-r border-gray-200 font-bold ${isLowest ? 'text-gray-900 font-black' : 'text-gray-300'}">${isLowest ? formatCurrency(total) : '-'}</td>`;
        }).join('')}
                                ${allQuotes.map((q: any) => {
            const total = getItemTotal(item, q);
            return `<td class="px-2 py-2 text-center font-bold text-gray-400 italic opacity-70">${formatCurrency(total)}</td>`;
        }).join('')}
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section class="lg:col-span-8 border border-gray-200 rounded overflow-hidden">
                <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h2 class="text-[10px] font-black uppercase text-gray-700 tracking-widest">Bloco IV - Apuração das Propostas</h2>
                </div>
                <table class="w-full text-xs text-left">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 uppercase font-black border-b border-gray-200 text-[9px]">
                            <th class="px-4 py-2">Descrição da Apuração</th>
                            <th class="px-4 py-2 text-center bg-blue-100 text-primary">Melhor Preço Item</th>
                            ${allQuotes.map((_, i) => `<th class="px-4 py-2 text-center font-black uppercase">Proponente (${String.fromCharCode(65 + i)})</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr class="font-black text-gray-900">
                            <td class="px-4 py-3 uppercase text-[10px]">Valor Total das Propostas</td>
                            <td class="px-4 py-3 text-center bg-blue-50 text-primary">${formatCurrency(winnerQuote?.total_value || 0)}</td>
                            ${allQuotes.map((q: any) => `<td class="px-4 py-3 text-center">${formatCurrency(q.total_value)}</td>`).join('')}
                        </tr>
                        <tr class="text-amber-700 font-bold italic bg-amber-50/30">
                            <td class="px-4 py-2 uppercase text-[10px]">(-) Desconto Aplicado</td>
                            <td class="px-4 py-2 text-center bg-amber-50 font-black">-${formatCurrency(process.discount || 0)}</td>
                            ${allQuotes.map((q: any) => {
        const d = q.is_winner ? (process.discount || 0) : 0;
        return `<td class="px-4 py-2 text-center">-${formatCurrency(d)}</td>`;
    }).join('')}
                        </tr>
                        <tr class="text-gray-900 font-black bg-amber-50/50">
                            <td class="px-4 py-2 uppercase text-[10px]">Valor Líquido (com desconto)</td>
                            <td class="px-4 py-2 text-center bg-amber-100 text-amber-700 font-black">${formatCurrency((winnerQuote?.total_value || 0) - (process.discount || 0))}</td>
                            ${allQuotes.map((q: any) => {
        const val = q.is_winner ? (q.total_value - (process.discount || 0)) : q.total_value;
        return `<td class="px-4 py-2 text-center font-black ${q.is_winner ? 'text-amber-700' : ''}">${formatCurrency(val)}</td>`;
    }).join('')}
                        </tr>
                        <tr class="text-gray-500 text-[10px]">
                            <td class="px-4 py-1 uppercase italic opacity-50 text-[8px]">Participação Percentual / Eficiência</td>
                            <td class="px-4 py-1 text-center bg-blue-50 font-black">100%</td>
                            ${allQuotes.map((q: any) => {
        const ratio = ((winnerQuote?.total_value || 1) / (q.total_value || 1)) * 100;
        return `<td class="px-4 py-1 text-center">${ratio.toFixed(1)}%</td>`;
    }).join('')}
                        </tr>
                    </tbody>
                </table>
            </section>
            <section class="lg:col-span-4 border-l-4 border-primary bg-blue-50 rounded-r shadow-sm p-6 flex flex-col justify-center">
                <h3 class="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Melhor Opção de Compra</h3>
                <div class="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mb-4 italic">Critério: Menor Preço Global / Item</div>
                <div class="p-4 bg-white rounded border border-blue-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center gap-2 mb-2 relative z-10">
                        <span class="font-black text-blue-700 uppercase text-xs">Adjudicação Recomendada</span>
                    </div>
                    <p class="text-[11px] text-gray-700 leading-tight relative z-10 font-medium">
                        Recomendamos a aquisição junto ao <strong class="uppercase text-blue-800 font-black italic">Proponente (${String.fromCharCode(65 + allQuotes.findIndex(q => q.is_winner))})</strong>.
                    </p>
                    <div class="mt-4 text-2xl font-black text-blue-800 relative z-10">${formatCurrency((winnerQuote?.total_value || 0) - (process.discount || 0))}</div>
                    <div class="text-[9px] text-gray-500 font-bold uppercase tracking-widest relative z-10">Valor Total do Lote (Líquido)</div>
                </div>
            </section>
        </div>

        <footer class="mt-20 pt-10 border-t border-gray-100 italic">
            <div class="grid grid-cols-2 gap-20 text-center">
                <div class="flex flex-col items-center">
                    <div class="text-[11px] font-black text-gray-900 uppercase">
                        ${school?.city || 'UNIÃO DOS PALMARES/AL'}, ${dateLong}
                    </div>
                    <div class="text-[9px] text-gray-400 font-bold border-t border-gray-200 mt-2 pt-1 w-full max-w-xs uppercase">Local e Data</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="text-[11px] font-black text-gray-900 uppercase">
                        ${school?.director || 'ASSINATURA DO PRESIDENTE'}
                    </div>
                    <div class="text-[9px] text-gray-400 font-bold border-t border-gray-200 mt-2 pt-1 w-full max-w-xs uppercase">Presidente da Unidade Executora</div>
                </div>
            </div>
        </footer>
    </div>
</body></html>`;
};

export const generateOrdemHTML = (process: any) => {
    const entry = process.financial_entries || process.financial_entry;
    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;
    const winner = (process.quotes || []).find((q: any) => q.is_winner);

    // Date: 2 school days before invoice
    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const docDate = getSchoolDayBefore(invoiceDate, 2);
    const dateText = docDate.toLocaleDateString('pt-BR');
    const day = docDate.getDate().toString().padStart(2, '0');
    const monthName = docDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
    const year = docDate.getFullYear();

    const subtotal = winner?.total_value || 0;
    const discount = process.discount || 0;
    const totalLiquid = subtotal - discount;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Ordem de Compra - PNAE/FNDE</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 20px; }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print { display: none !important; }
            @page { 
                size: A4; 
                margin: 1.5cm; 
            }
            .footer-signature { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
        }
        @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print { display: none !important; }
            @page { 
                size: A4; 
                margin: 1cm; 
            }
            .footer-signature { break-inside: avoid; }
            table { break-inside: auto; }
            tr { break-inside: avoid; break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
        }
        .print-container {
            background-color: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
            width: 210mm;
            min-height: auto;
            margin: 0 auto;
        }
    </style>
</head>
<body class="flex flex-col items-center">
    <div class="print-container overflow-hidden">
        <!-- Header -->
        <div class="border-b-2 border-blue-600 bg-gray-50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 class="text-lg font-bold text-gray-900 uppercase tracking-wider">PNAE / FNDE</h2>
                <p class="text-sm text-gray-500 mt-1">Programa Nacional de Alimentação Escolar</p>
            </div>
            <div class="text-right">
                <h2 class="text-lg font-bold text-gray-900 uppercase tracking-wider border-b-2 border-gray-300 pb-1">Ordem de Compra</h2>
                <p class="text-xs text-gray-500 mt-1 font-mono uppercase">ID: ${process.id.substring(0, 8).toUpperCase()}</p>
            </div>
        </div>

        <div class="p-6 space-y-6">
            <!-- School / UEx Info -->
            <div class="grid grid-cols-1 md:grid-cols-12 border border-gray-200 rounded-md overflow-hidden">
                <div class="md:col-span-8 p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">UEX / Contratante</label>
                    <div class="font-semibold text-gray-900 uppercase text-xs">${school?.name || '---'}</div>
                </div>
                <div class="md:col-span-4 p-4 bg-gray-50/50">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">CNPJ</label>
                    <div class="font-mono text-gray-900 text-xs">${school?.cnpj || '---'}</div>
                </div>
            </div>

            <!-- Program Info -->
            <div class="grid grid-cols-1 md:grid-cols-12 border border-gray-200 rounded-md overflow-hidden">
                <div class="md:col-span-8 p-4 border-b md:border-b-0 md:border-r border-gray-200">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Programa / Recurso</label>
                    <div class="font-medium text-gray-900 text-xs uppercase">${program?.name || program || '---'}</div>
                </div>
                <div class="md:col-span-4 p-4 bg-gray-50/50">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">SEEC</label>
                    <div class="font-mono text-gray-900 text-xs">${school?.seec || '---'}</div>
                </div>
            </div>

            <!-- Winner Vendor -->
            <div class="grid grid-cols-1 md:grid-cols-12 border-2 border-blue-600/20 rounded-md overflow-hidden shadow-sm">
                <div class="md:col-span-8 p-4 border-b md:border-b-0 md:border-r border-blue-600/20 bg-blue-50/50">
                    <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Proponente Vencedor</label>
                    <div class="font-bold text-gray-900 uppercase text-xs">${winner?.supplier_name || '---'}</div>
                </div>
                <div class="md:col-span-4 p-4 bg-blue-50/50">
                    <label class="block text-xs font-bold text-blue-600 uppercase mb-1">CNPJ</label>
                    <div class="font-mono text-gray-900 text-xs">${winner?.supplier_cnpj || '---'}</div>
                </div>
            </div>

            <!-- Authorization Text -->
            <div class="text-sm text-gray-600 italic p-4 bg-gray-50 rounded border border-gray-200 leading-relaxed">
                Autorizo o fornecimento do produto/material, conforme descrição na planilha abaixo, em razão do proponente acima identificado ter apresentado uma proposta adequada e de menor preço, conforme previsto na RESOLUÇÃO CD/FNDE Nº 09, DE 02 DE MARÇO DE 2011.
            </div>

            <!-- Items Table -->
            <div class="overflow-x-auto border border-gray-200 rounded-lg">
                <table class="w-full text-xs text-left">
                    <thead class="bg-gray-100 uppercase font-black text-gray-700 border-b border-gray-200">
                        <tr>
                            <th class="px-4 py-3 border-r border-gray-200 w-16 text-center">Item</th>
                            <th class="px-4 py-3 border-r border-gray-200">Descrição</th>
                            <th class="px-4 py-3 border-r border-gray-200 w-20 text-center">Und.</th>
                            <th class="px-4 py-3 border-r border-gray-200 w-24 text-center">Qtd.</th>
                            <th class="px-4 py-3 border-r border-gray-200 w-32 text-right">Valor Unit.</th>
                            <th class="px-4 py-3 w-32 text-right">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${(process.items || process.accountability_items || []).map((it: any, idx: number) => `
                        <tr class="${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                            <td class="px-4 py-2 text-center font-mono text-gray-500">${(idx + 1).toString().padStart(2, '0')}</td>
                            <td class="px-4 py-2 font-medium text-gray-900 uppercase">${it.description}</td>
                            <td class="px-4 py-2 text-center uppercase">${it.unit}</td>
                            <td class="px-4 py-2 text-center font-mono">${it.quantity}</td>
                            <td class="px-4 py-2 text-right text-gray-600 font-mono">${formatCurrency(it.winner_unit_price)}</td>
                            <td class="px-4 py-2 text-right font-bold font-mono">${formatCurrency((it.quantity || 0) * (it.winner_unit_price || 0))}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-200">
                        <tr>
                            <td colspan="5" class="px-4 py-2 text-right uppercase text-[10px] tracking-wider">Subtotal (Preço Bruto)</td>
                            <td class="px-4 py-2 text-right font-mono">${formatCurrency(subtotal)}</td>
                        </tr>
                        <tr class="text-amber-700 bg-amber-50">
                            <td colspan="5" class="px-4 py-2 text-right uppercase text-[10px] tracking-wider italic">(-) Desconto Aplicado</td>
                            <td class="px-4 py-2 text-right font-mono italic">-${formatCurrency(discount)}</td>
                        </tr>
                        <tr class="bg-blue-600 text-white text-base">
                            <td colspan="5" class="px-4 py-3 text-right uppercase tracking-widest">Valor Líquido a Pagar</td>
                            <td class="px-4 py-3 text-right font-mono">${formatCurrency(totalLiquid)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Signature Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded-md overflow-hidden mt-6 footer-signature">
                <div class="bg-white p-6 flex flex-col justify-between">
                    <div class="space-y-4">
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block leading-none mb-1">Responsável pela Emissão</span>
                            <span class="text-gray-900 font-bold uppercase text-[11px]">${school?.director || 'ASSINATURA DO PRESIDENTE'}</span>
                        </div>
                        <div>
                            <span class="text-[10px] uppercase text-gray-500 font-bold block leading-none mb-1">Cargo / Função</span>
                            <span class="text-gray-900 text-[11px] font-medium">PRESIDENTE DA UEx / CONSELHO ESCOLAR</span>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 flex flex-col justify-between items-center text-center">
                    <div class="mb-6">
                        <span class="text-[10px] uppercase text-gray-500 font-bold block leading-none mb-2">Local e Data</span>
                        <span class="text-gray-900 font-bold text-[11px]">${school?.city || 'UNIÃO DOS PALMARES/AL'}, ${day} DE ${monthName} DE ${year}</span>
                    </div>
                    <div class="w-full max-w-[240px] border-t border-gray-400 pt-2">
                        <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Assinatura do(a) Responsável</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateReciboHTML = (process: any) => {
    const entry = process.financial_entries || process.financial_entry;
    const school = entry?.schools || entry?.school;
    const program = entry?.programs || entry?.program;
    const winner = (process.quotes || []).find((q: any) => q.is_winner);

    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    const dateLong = invoiceDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // For the body text "DATADA DE", use the specific invoice_date if available, otherwise fallback to entry date
    const specificInvoiceDate = entry?.invoice_date ? new Date(entry.invoice_date) : invoiceDate;
    const invoiceDateText = specificInvoiceDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const totalValue = (winner?.total_value || 0) - (process.discount || 0);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Recibo de Pagamento - BRN Suite Escolas</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet"/>
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        primary: "#0f766e",
                        "background-light": "#f3f4f6",
                        "background-dark": "#111827",
                        "card-light": "#ffffff",
                        "card-dark": "#1f2937",
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Inter', 'sans-serif'],
                        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
                    },
                    boxShadow: {
                        'receipt': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0,0,0,0.05)',
                    }
                },
            },
        };
    </script>
    <style>
        .no-print { display: block; }
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                background-color: white !important;
                color: black !important;
                height: 100vh;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .no-print {
                display: none !important;
            }
            .print-container {
                width: 100%;
                max-width: 100%;
                box-shadow: none !important;
                border: none !important;
                padding: 2cm !important;
            }
            .shadow-receipt {
                box-shadow: none !important;
                border: 1px solid #e5e7eb;
            }
            .bg-primary {
                background-color: transparent !important;
                color: black !important;
            }
            .text-white {
                color: black !important;
            }
        }
    </style>
</head>
<body class="bg-background-light text-gray-800 font-sans antialiased min-h-screen flex flex-col items-center justify-center p-4">
    
    <!-- Navigation / Header (No Print) -->
    <div class="w-full max-w-[850px] mb-6 flex justify-between items-center no-print">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Visualização do Recibo</h1>
            <p class="text-sm text-gray-500">Confira os dados antes de imprimir.</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90 transition shadow-sm" onclick="window.print()">
            <span class="material-icons-outlined text-sm">print</span>
            Imprimir Recibo
        </button>
    </div>

    <!-- Receipt Container -->
    <div class="w-full max-w-[850px] bg-white shadow-receipt rounded-sm p-8 md:p-12 text-gray-900 relative print-container">
        
        <!-- Watermark -->
        <div class="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
            <span class="text-[150px] font-bold transform -rotate-12 select-none">RECIBO</span>
        </div>

        <div class="relative z-10">
            <!-- Header: Supplier Info -->
            <div class="text-center mb-12 border-b border-gray-200 pb-8">
                <h2 class="text-xl md:text-2xl font-bold uppercase tracking-wide text-gray-900 mb-4">
                    ${winner?.supplier_name || 'RAZÃO SOCIAL DO FORNECEDOR'}
                </h2>
                <div class="text-sm text-gray-600 space-y-1">
                    <p class="font-mono">CNPJ: ${winner?.suppliers?.cnpj || winner?.supplier_cnpj || '00.000.000/0000-00'}</p>
                    <p>${winner?.suppliers?.address || winner?.supplier_address || 'Endereço não informado'}</p>
                    <p>${winner?.suppliers?.city ? (winner.suppliers.city + (winner.suppliers.uf ? '/' + winner.suppliers.uf : '')) : (winner?.supplier_city || 'Cidade/UF')} - CEP: ${winner?.suppliers?.cep || winner?.supplier_cep || '00000-000'}</p>
                </div>
            </div>

            <!-- Title & Value -->
            <div class="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-widest text-gray-900 uppercase">Recibo</h1>
                <div class="bg-gray-50 border-2 border-gray-200 rounded-lg px-6 py-3 shadow-inner">
                    <span class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Valor Total</span>
                    <span class="text-2xl md:text-3xl font-bold text-gray-900 font-mono">${formatCurrency(totalValue)}</span>
                </div>
            </div>

            <!-- Body Text -->
            <div class="bg-gray-50 p-6 md:p-8 rounded-lg border border-gray-100 mb-10 text-justify leading-loose text-base md:text-lg text-gray-800">
                <p>
                    RECEBEMOS DO <span class="font-bold uppercase">${school?.name || 'CONSELHO ESCOLAR'}</span>, 
                    CNPJ <span class="font-mono font-medium">${school?.cnpj || '---'}</span>, 
                    SITUADO EM <span class="uppercase">${school?.address || school?.city || '---'}</span>, 
                    A IMPORTÂNCIA DE 
                    <span class="font-bold bg-yellow-100 px-1 rounded mx-1 uppercase">${formatCurrency(totalValue)} (${numberToWords(totalValue).toUpperCase()})</span>, 
                    REFERENTE A COMPRA DE PRODUTOS/SERVIÇOS CONFORME NOTA FISCAL DE Nº <span class="font-bold">${entry?.document_number || '---'}</span>, 
                    DATADA DE <span class="font-medium">${invoiceDateText}</span>.
                </p>
                <p class="mt-4 pt-4 border-t border-dashed border-gray-300">
                    PAGO COM RECURSO <span class="font-bold text-primary uppercase">${program?.name || program || '---'}</span>, 
                    AUTORIZAÇÃO Nº <span class="font-bold">${entry?.auth_number || (process.id ? process.id.substring(0, 8).toUpperCase() : '---')}</span>.
                </p>
                <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 uppercase font-bold tracking-wider bg-gray-100 p-2 rounded">
                    <span>Categoria: <span class="text-gray-900">${entry?.category || '---'}</span></span>
                    <span>•</span>
                    <span>Método de Movimentação: <span class="text-gray-900">${entry?.payment_methods?.name || '---'}</span></span>
                </div>
            </div>

            <!-- Signatures -->
            <div class="mt-16 flex flex-col gap-16">
                <div class="text-right text-gray-700 font-medium italic">
                    ${school?.city || 'União dos Palmares'}/AL, ${dateLong}
                </div>
                
                <div class="flex flex-col items-center justify-center mt-8 relative">
                    ${winner?.suppliers?.stamp_url && `
                        <div class="absolute -top-24 opacity-80 pointer-events-none">
                            <img src="${winner.suppliers.stamp_url}" alt="Carimbo" class="w-48 h-48 object-contain mix-blend-multiply" />
                        </div>
                    `}
                    <div class="w-full md:w-2/3 border-b-2 border-gray-800 mb-4 relative"></div>
                    <p class="font-bold text-gray-900 uppercase tracking-wide">Assinatura do Fornecedor</p>
                    <p class="text-sm text-gray-500 uppercase">${winner?.supplier_name || 'Fornecedor'}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateCotacaoHTML = (process: any, supplierIdx: number = 0) => {
    const entry = process.financial_entries || process.financial_entry;
    const school = entry?.schools || entry?.school;
    const quote = (process.quotes || [])[supplierIdx];
    if (!quote) return '<h1>Erro: Cotação não encontrada</h1>';

    const invoiceDate = entry?.date ? new Date(entry.date) : new Date();
    // 15 days before invoice, excluding weekends/holidays
    const quoteDate = subtractBusinessDays(invoiceDate, 15);
    const day = quoteDate.getDate().toString().padStart(2, '0');
    const month = quoteDate.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
    const year = quoteDate.getFullYear();
    const city = school?.city || 'União dos Palmares';
    const dateText = `${city}, ${day} de ${month} de ${year}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/><title>Pesquisa de Preços - BRN Suite</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white p-8 font-sans text-xs">
    <div class="max-w-4xl mx-auto border border-gray-300 shadow-lg">
        <header class="bg-gray-50 border-b border-gray-300 p-6 text-center">
            <h2 class="text-lg font-black uppercase tracking-widest text-gray-800">Planilha de Pesquisa de Preços - PNAE/FNDE</h2>
        </header>

        <div class="p-8 space-y-8">
            <div class="grid grid-cols-12 gap-0 border border-gray-300 rounded overflow-hidden">
                <div class="col-span-8 p-4 border-r border-gray-300 bg-gray-50/50">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fornecedor / Proponente</label>
                    <div class="font-bold text-sm uppercase">${quote.supplier_name}</div>
                </div>
                <div class="col-span-4 p-4">
                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                    <div class="font-mono text-sm">${quote.supplier_cnpj || '---'}</div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-0 border border-blue-200 rounded overflow-hidden bg-blue-50/20">
                <div class="col-span-8 p-4 border-r border-blue-200">
                    <label class="block text-[10px] font-bold text-blue-600 uppercase mb-1">Entidade Solicitante (UEx)</label>
                    <div class="font-bold text-sm uppercase">${school?.name || '---'}</div>
                </div>
                <div class="col-span-4 p-4 bg-white/50">
                    <label class="block text-[10px] font-bold text-blue-600 uppercase mb-1">CNPJ</label>
                    <div class="font-mono text-sm">${school?.cnpj || '---'}</div>
                </div>
            </div>

            <table class="w-full border-collapse border border-gray-300 text-[11px]">
                <thead class="bg-gray-100 uppercase font-black">
                    <tr>
                        <th class="border border-gray-300 p-2 w-10">Item</th>
                        <th class="border border-gray-300 p-2 text-left">Descrição Detalhada do Item</th>
                        <th class="border border-gray-300 p-2 w-12 text-center">Und</th>
                        <th class="border border-gray-300 p-2 w-16 text-right">Qtde</th>
                        <th class="border border-gray-300 p-2 w-28 text-right">Valor Unitário</th>
                        <th class="border border-gray-300 p-2 w-28 text-right">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(process.items || process.accountability_items || []).map((it: any, idx: number) => {
        const qItem = quote.accountability_quote_items?.find((qi: any) => qi.description === it.description);
        const price = quote.is_winner ? it.winner_unit_price : (qItem?.unit_price || 0);
        return `
                        <tr>
                            <td class="border border-gray-300 p-2 text-center font-mono">${idx + 1}</td>
                            <td class="border border-gray-300 p-2 font-medium uppercase">${it.description}</td>
                            <td class="border border-gray-300 p-2 text-center uppercase">${it.unit}</td>
                            <td class="border border-gray-300 p-2 text-right">${it.quantity}</td>
                            <td class="border border-gray-300 p-2 text-right font-mono">${formatCurrency(price)}</td>
                            <td class="border border-gray-300 p-2 text-right font-bold font-mono">${formatCurrency((it.quantity || 0) * (price || 0))}</td>
                        </tr>`;
    }).join('')}
                </tbody>
                <tfoot class="bg-gray-50 font-black text-[10px]">
                    <tr class="text-gray-500">
                        <td colspan="5" class="border border-gray-300 p-2 text-right uppercase tracking-wider">Subtotal (Preço de Tabela)</td>
                        <td class="border border-gray-300 p-2 text-right">${formatCurrency(quote.total_value || 0)}</td>
                    </tr>
                    <tr class="text-amber-700 bg-amber-50/50">
                        <td colspan="5" class="border border-gray-300 p-2 text-right uppercase tracking-wider italic">(-) Desconto Aplicado</td>
                        <td class="border border-gray-300 p-2 text-right font-bold italic">-${formatCurrency(quote.is_winner ? (process.discount || 0) : 0)}</td>
                    </tr>
                    <tr class="text-gray-900 border-t-2 border-gray-400">
                        <td colspan="5" class="border border-gray-300 p-3 text-right uppercase tracking-widest text-xs">Valor Líquido da Proposta</td>
                        <td class="border border-gray-300 p-3 text-right text-sm text-blue-700 font-mono">${formatCurrency((quote.total_value || 0) - (quote.is_winner ? (process.discount || 0) : 0))}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="bg-yellow-50 border border-yellow-100 p-4 rounded text-[10px] space-y-1">
                <p class="font-bold uppercase text-yellow-800 mb-2 underline">Condições de Fornecimento:</p>
                <p>• Validade da proposta: Mínimo 30 dias.</p>
                <p>• Prazo de entrega: Imediato após Ordem de Compra.</p>
                <p>• Pagamento: Mediante conferência e Nota Fiscal.</p>
            </div>

            <div class="flex justify-center mt-16 pt-8">
                <div class="text-center font-bold relative flex flex-col items-center justify-center w-full max-w-sm">
                    ${quote?.suppliers?.stamp_url && `
                        <div class="absolute -top-24 opacity-70 pointer-events-none">
                            <img src="${quote.suppliers.stamp_url}" alt="Carimbo" class="w-44 h-44 object-contain mix-blend-multiply" />
                        </div>
                    `}
                    <div class="w-full border-b border-black mb-2 opacity-30"></div>
                    <p class="uppercase text-[9px] mb-1">Representante do Fornecedor</p>
                    <p class="text-[9px] text-gray-500 font-medium">${dateText}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateRelatorioGerencialHTML = (entries: any[], filters: any, stats: any, reprogrammed: any[] = []) => {
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const periodText = filters.startDate && filters.endDate
        ? `Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`
        : 'Período: Completo / Todos os Lançamentos';

    const schoolName = entries[0]?.school || reprogrammed[0]?.schools?.name || 'Todas as Escolas';

    // Data Processing
    const byProgram: Record<string, any> = {};

    // 1. Process Reprogrammed Balances (Previous Balance)
    reprogrammed.forEach(r => {
        const progName = r.programs?.name || 'Sem Programa';
        if (!byProgram[progName]) byProgram[progName] = {
            previousBalance: 0,
            credits: 0,
            debits: 0,
            entries: []
        };
        byProgram[progName].previousBalance += Number(r.value || 0);
    });

    // 2. Process Financial Entries (Credits / Debits)
    entries.forEach(e => {
        const progName = e.program || 'Sem Programa';
        const val = Number(e.value);
        const type = e.type; // 'Entrada' or 'Saída'

        if (!byProgram[progName]) byProgram[progName] = {
            previousBalance: 0,
            credits: 0,
            debits: 0,
            entries: []
        };

        const progNode = byProgram[progName];
        if (type === 'Entrada') {
            progNode.credits += val;
        } else {
            progNode.debits += Math.abs(val);
        }

        progNode.entries.push(e);
    });

    // Calculate totals for summary
    const totalPrevious = Object.values(byProgram).reduce((acc: number, curr: any) => acc + curr.previousBalance, 0);
    const totalCredits = Object.values(byProgram).reduce((acc: number, curr: any) => acc + curr.credits, 0);
    const totalDebits = Object.values(byProgram).reduce((acc: number, curr: any) => acc + curr.debits, 0);
    const totalCurrent = totalPrevious + totalCredits - totalDebits;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Relatório Gerencial - BRN Suite</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
        @media print {
            body { padding: 0; margin: 0; }
            .print-container { box-shadow: none; border: none; padding: 0; margin: 0; max-width: 100%; }
            .no-break { break-inside: avoid; }
        }
    </style>
</head>
<body class="bg-gray-100 p-8 min-h-screen text-gray-800">

    <div class="print-container bg-white max-w-[210mm] mx-auto p-12 shadow-xl min-h-[297mm]">
        
        <!-- Header -->
        <header class="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
            <div>
                <h1 class="text-2xl font-black uppercase tracking-tight text-slate-900">Relatório de Execução Financeira</h1>
                <p class="text-sm font-medium text-slate-500 uppercase mt-1">Controle de Receitas e Despesas Escolares</p>
            </div>
            <div class="text-right">
                <div class="text-xs font-bold uppercase text-slate-400">Data de Emissão</div>
                <div class="text-sm font-mono font-bold text-slate-700">${reportDate}</div>
            </div>
        </header>

        <!-- Context Info -->
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8 flex justify-between items-center text-sm">
            <div>
                <span class="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Unidade Escolar</span>
                <span class="block font-bold text-slate-800 text-lg uppercase">${schoolName}</span>
            </div>
            <div class="text-right">
                 <span class="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Período de Referência</span>
                 <span class="block font-bold text-slate-800">${periodText}</span>
            </div>
        </div>

        <!-- Global Summary Data -->
        <div class="grid grid-cols-4 gap-4 mb-10">
            <div class="p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-center">
                <span class="text-[10px] uppercase font-black text-blue-400 mb-1">Saldo Anterior</span>
                <span class="text-xl font-bold text-blue-700 font-mono">${formatCurrency(totalPrevious)}</span>
            </div>
            <div class="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center">
                <span class="text-[10px] uppercase font-black text-emerald-400 mb-1">Receitas</span>
                <span class="text-xl font-bold text-emerald-700 font-mono">+ ${formatCurrency(totalCredits)}</span>
            </div>
            <div class="p-4 rounded-lg bg-red-50 border border-red-100 flex flex-col items-center justify-center text-center">
                <span class="text-[10px] uppercase font-black text-red-400 mb-1">Despesas</span>
                <span class="text-xl font-bold text-red-700 font-mono">- ${formatCurrency(totalDebits)}</span>
            </div>
            <div class="p-4 rounded-lg bg-slate-800 text-white flex flex-col items-center justify-center text-center shadow-lg">
                <span class="text-[10px] uppercase font-black text-slate-400 mb-1">Saldo em Caixa</span>
                <span class="text-xl font-black font-mono ${totalCurrent < 0 ? 'text-red-400' : 'text-emerald-400'}">${formatCurrency(totalCurrent)}</span>
            </div>
        </div>

        <!-- Program Breakdown -->
        <div class="space-y-10">
            ${Object.entries(byProgram).map(([progName, data]: any) => {
        const currentBalance = data.previousBalance + data.credits - data.debits;

        // Group entries by Nature -> and then list them
        const entriesByNature: Record<string, any[]> = {};
        data.entries.forEach((e: any) => {
            const nature = e.nature || 'Outros';
            if (!entriesByNature[nature]) entriesByNature[nature] = [];
            entriesByNature[nature].push(e);
        });

        return `
                <section class="no-break border border-slate-200 rounded-lg overflow-hidden">
                    <!-- Program Header -->
                    <div class="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <span class="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Programa / Recurso</span>
                            <h2 class="text-lg font-black text-slate-800 uppercase">${progName}</h2>
                        </div>
                        <div class="flex items-center gap-6 text-xs">
                             <div class="text-right">
                                <span class="block text-[9px] font-bold text-slate-400 uppercase">Saldo Anterior</span>
                                <span class="font-mono font-bold text-slate-600">${formatCurrency(data.previousBalance)}</span>
                            </div>
                            <div class="text-right">
                                <span class="block text-[9px] font-bold text-slate-400 uppercase">Receitas</span>
                                <span class="font-mono font-bold text-emerald-600">+ ${formatCurrency(data.credits)}</span>
                            </div>
                            <div class="text-right">
                                <span class="block text-[9px] font-bold text-slate-400 uppercase">Despesas</span>
                                <span class="font-mono font-bold text-red-600">- ${formatCurrency(data.debits)}</span>
                            </div>
                            <div class="text-right bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
                                <span class="block text-[9px] font-black text-slate-800 uppercase">Saldo Atual</span>
                                <span class="font-mono font-black ${currentBalance < 0 ? 'text-red-600' : 'text-emerald-600'} text-sm">${formatCurrency(currentBalance)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Entries List -->
                    <div class="divide-y divide-slate-100">
                        ${Object.keys(entriesByNature).length === 0
                ? `<div class="p-6 text-center text-xs text-slate-400 italic">Nenhuma movimentação neste período, apenas sado anterior.</div>`
                : Object.entries(entriesByNature).map(([nature, items]) => `
                                <div class="p-0">
                                    <div class="bg-white px-6 py-2 border-b border-slate-50 flex justify-between items-center">
                                        <h3 class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">${nature}</h3>
                                        <span class="text-[10px] font-bold text-slate-400 uppercase">${items.length} Lançamentos</span>
                                    </div>
                                    <table class="w-full text-left text-[11px]">
                                        <thead class="bg-slate-50 text-slate-500 uppercase font-bold text-[9px]">
                                            <tr>
                                                <th class="px-6 py-2 w-24">Data</th>
                                                <th class="px-2 py-2">Descrição / Fornecedor</th>
                                                <th class="px-2 py-2">Rubrica</th>
                                                <th class="px-6 py-2 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-50 text-slate-700">
                                            ${items.map(item => `
                                                <tr class="hover:bg-yellow-50/50 transition-colors">
                                                    <td class="px-6 py-2 font-mono text-slate-500">${new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                                    <td class="px-2 py-2 font-medium uppercase">
                                                        <div class="truncate max-w-[280px]">${item.description}</div>
                                                        <div class="text-[9px] text-slate-400 truncate max-w-[280px]">${item.supplier || '-'}</div>
                                                    </td>
                                                    <td class="px-2 py-2 text-[10px] uppercase text-slate-500">${item.rubric || 'Geral'}</td>
                                                    <td class="px-6 py-2 text-right font-mono font-bold ${item.type === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}">
                                                        ${item.type === 'Entrada' ? '+' : '-'} ${formatCurrency(item.value)}
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot className="bg-slate-50">
                                            <tr>
                                                <td colspan="3" class="px-6 py-2 text-right text-[10px] font-bold uppercase text-slate-500">Total ${nature}</td>
                                                <td class="px-6 py-2 text-right font-mono font-bold text-xs text-slate-800">
                                                    ${formatCurrency(items.reduce((acc, curr) => acc + (curr.type === 'Entrada' ? curr.value : -curr.value), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            `).join('')}
                    </div>
                </section>
                `;
    }).join('')}
        </div>

        <!-- Footer -->
        <footer class="mt-20 border-t border-slate-200 pt-8 no-break">
            <div class="flex flex-col items-center justify-center text-center gap-12">
                 <div class="flex flex-col items-center gap-1">
                    <div class="w-64 border-b border-slate-900 mb-2"></div>
                    <span class="text-xs font-bold uppercase text-slate-900">Presidente da Unidade Executora</span>
                    <span class="text-[10px] uppercase text-slate-500">Assinatura do Responsável</span>
                </div>
                <p class="text-[9px] text-slate-400 uppercase">Sistema BRN Suite Escolas - Gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        </footer>

    </div>

    <script>
        // Auto print setup
        // window.print();
    </script>
</body>
</html>`;
};
;
