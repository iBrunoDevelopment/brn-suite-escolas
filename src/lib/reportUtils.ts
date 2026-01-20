import { formatCurrency } from './printUtils';

export const generateRelatorioGerencialHTML = (entries: any[], filters: any, stats: any, reprogrammed: any[] = []) => {
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const periodText = filters.startDate && filters.endDate
        ? `Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`
        : 'Período: Completo / Todos os Lançamentos';

    // 1. Filter Reprogrammed Balances
    const activeReprogrammed = filters.school
        ? reprogrammed.filter(r => r.school_id === filters.school)
        : reprogrammed;

    // 2. Data Structure: School -> Program -> Data
    interface ProgramData {
        previousBalance: number;
        credits: number;
        debits: number;
        entries: any[];
    }
    interface SchoolData {
        name: string;
        previousBalance: number;
        credits: number;
        debits: number;
        programs: Record<string, ProgramData>;
    }

    const dataBySchool: Record<string, SchoolData> = {};

    const ensurePath = (schoolName: string, programName: string) => {
        if (!dataBySchool[schoolName]) {
            dataBySchool[schoolName] = { name: schoolName, previousBalance: 0, credits: 0, debits: 0, programs: {} };
        }
        if (!dataBySchool[schoolName].programs[programName]) {
            dataBySchool[schoolName].programs[programName] = { previousBalance: 0, credits: 0, debits: 0, entries: [] };
        }
        return dataBySchool[schoolName].programs[programName];
    };

    // Process Reprogrammed
    activeReprogrammed.forEach(r => {
        const schoolName = r.schools?.name || 'Escola Desconhecida';
        const progName = r.programs?.name || 'Sem Programa';
        const val = Number(r.value || 0);

        const progNode = ensurePath(schoolName, progName);
        progNode.previousBalance += val;

        // Add to School Totals
        dataBySchool[schoolName].previousBalance += val;
    });

    // Process Entries
    entries.forEach(e => {
        const schoolName = e.school || 'Escola não Identificada';
        const progName = e.program || 'Sem Programa';
        const val = Number(e.value);
        const type = e.type;

        const progNode = ensurePath(schoolName, progName);

        if (type === 'Entrada') {
            progNode.credits += val;
            dataBySchool[schoolName].credits += val;
        } else {
            progNode.debits += Math.abs(val);
            dataBySchool[schoolName].debits += Math.abs(val);
        }

        progNode.entries.push(e);
    });

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
            .page-break { page-break-after: always; }
        }
    </style>
</head>
<body class="bg-gray-100 p-8 min-h-screen text-gray-800">

    <div class="print-container bg-white max-w-[210mm] mx-auto p-12 shadow-xl min-h-[297mm]">
        
        <header class="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
            <div>
                <h1 class="text-2xl font-black uppercase tracking-tight text-slate-900">Relatório de Execução Financeira</h1>
                <p class="text-xs font-bold text-slate-500 uppercase mt-1 tracking-widest">Prestação de Contas Unificada</p>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-bold uppercase text-slate-400">Emissão</div>
                <div class="text-sm font-mono font-bold text-slate-700">${reportDate}</div>
            </div>
        </header>

        <div class="bg-slate-50 border border-slate-200 rounded p-4 mb-8 flex justify-between items-center text-xs">
            <span class="font-bold text-slate-600 uppercase">Referência: ${periodText}</span>
            <span class="font-bold text-slate-600 uppercase">Total de Escolas: ${Object.keys(dataBySchool).length}</span>
        </div>

        ${Object.keys(dataBySchool).length === 0
            ? '<div class="text-center p-10 text-slate-400 italic">Nenhum dado encontrado para o período selecionado.</div>'
            : ''
        }

        ${Object.values(dataBySchool).map((school, schoolIdx) => {
            const schoolCurrentBalance = school.previousBalance + school.credits - school.debits;
            return `
            <div class="${schoolIdx > 0 ? 'page-break mt-8' : ''}">
                
                <div class="bg-slate-900 text-white p-4 mb-6 rounded-lg shadow-md no-break">
                    <h2 class="text-lg font-black uppercase tracking-wide">${school.name}</h2>
                    <div class="grid grid-cols-4 gap-4 mt-4 border-t border-slate-700 pt-4">
                        <div class="text-center">
                            <span class="block text-[9px] uppercase text-slate-400">Saldo Anterior</span>
                            <span class="font-mono text-sm font-bold text-blue-300">${formatCurrency(school.previousBalance)}</span>
                        </div>
                        <div class="text-center">
                            <span class="block text-[9px] uppercase text-slate-400">Receitas</span>
                            <span class="font-mono text-sm font-bold text-emerald-300">+ ${formatCurrency(school.credits)}</span>
                        </div>
                        <div class="text-center">
                            <span class="block text-[9px] uppercase text-slate-400">Despesas</span>
                            <span class="font-mono text-sm font-bold text-red-300">- ${formatCurrency(school.debits)}</span>
                        </div>
                        <div class="text-center bg-slate-800 rounded">
                            <span class="block text-[9px] uppercase text-slate-400">Em Caixa</span>
                            <span class="font-mono text-sm font-black ${schoolCurrentBalance < 0 ? 'text-red-400' : 'text-emerald-400'}">${formatCurrency(schoolCurrentBalance)}</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-8">
                    ${Object.entries(school.programs).map(([progName, progData]) => {
                const progCurrent = progData.previousBalance + progData.credits - progData.debits;

                const entriesByNature: Record<string, any[]> = {};
                progData.entries.forEach(e => {
                    const nature = e.nature || 'Outros';
                    if (!entriesByNature[nature]) entriesByNature[nature] = [];
                    entriesByNature[nature].push(e);
                });

                return `
                        <div class="border border-slate-200 rounded-lg overflow-hidden no-break">
                            <div class="bg-slate-100/50 px-4 py-3 border-b border-slate-200 flex justify-between items-center text-xs">
                                <h3 class="font-black uppercase text-slate-800 text-sm">${progName}</h3>
                                <div class="flex gap-4">
                                    <span class="text-slate-500">Ant: <strong>${formatCurrency(progData.previousBalance)}</strong></span>
                                    <span class="text-emerald-600">Ent: <strong>${formatCurrency(progData.credits)}</strong></span>
                                    <span class="text-red-600">Sai: <strong>${formatCurrency(progData.debits)}</strong></span>
                                    <span class="text-slate-900 border-l pl-4 border-slate-300">Atual: <strong>${formatCurrency(progCurrent)}</strong></span>
                                </div>
                            </div>
                            
                            <div class="bg-white">
                                ${Object.entries(entriesByNature).length === 0
                        ? `<div class="p-3 text-[10px] text-slate-400 italic text-center">Apenas saldo anterior (R$ ${formatCurrency(progData.previousBalance)}) sem movimentação no período.</div>`
                        : Object.entries(entriesByNature).map(([nature, items]) => `
                                        <div>
                                            <div class="px-4 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                                ${nature}
                                            </div>
                                            <table class="w-full text-left text-[10px]">
                                                <tbody class="divide-y divide-slate-50">
                                                    ${items.map(item => `
                                                        <tr class="hover:bg-yellow-50">
                                                            <td class="px-4 py-1.5 w-20 font-mono text-slate-500">${new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                                            <td class="px-2 py-1.5 uppercase font-medium text-slate-700">
                                                                <span class="truncate block max-w-[300px]">${item.description}</span>
                                                            </td>
                                                            <td class="px-2 py-1.5 w-32 uppercase text-slate-400 text-[9px] truncate">${item.rubric || 'Geral'}</td>
                                                            <td class="px-4 py-1.5 w-28 text-right font-mono font-bold ${item.type === 'Entrada' ? 'text-emerald-600' : 'text-red-600'}">
                                                                ${item.type === 'Entrada' ? '+' : '-'} ${formatCurrency(item.value)}
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>

                <div class="mt-12 flex flex-col items-center justify-center no-break">
                    <div class="w-64 border-b border-slate-900 mb-2"></div>
                    <span class="text-[10px] font-bold uppercase text-slate-900">Presidente do Conselho Escolar</span>
                    <span class="text-[9px] uppercase text-slate-500">${school.name}</span>
                </div>
            </div>
            `;
        }).join('')}

    </div>
    
    <script>
        // window.print();
    </script>
</body>
</html>`;
};
