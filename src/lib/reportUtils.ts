import { formatCurrency } from './printUtils';

export const generateRelatorioGerencialHTML = (entries: any[], stats: any, filters: any, reprogrammed: any[] = []) => {
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const periodText = filters.startDate && filters.endDate
        ? `Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`
        : 'Período: Completo / Todos os Lançamentos';

    // 1. Data Structure: School -> Program -> Data
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
    reprogrammed.forEach(r => {
        const schoolName = r.schools?.name || 'Escola Desconhecida';
        const progName = r.programs?.name || 'Sem Programa';
        const val = Number(r.value || 0);
        const progNode = ensurePath(schoolName, progName);
        progNode.previousBalance += val;
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

    const totalStats = {
        prev: Object.values(dataBySchool).reduce((acc, s) => acc + s.previousBalance, 0),
        cred: Object.values(dataBySchool).reduce((acc, s) => acc + s.credits, 0),
        deb: Object.values(dataBySchool).reduce((acc, s) => acc + s.debits, 0),
    };

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Relatório Executivo de Execução Financeira</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"/>
    <style>
        body { 
            font-family: 'Manrope', sans-serif; 
            background-color: #f8fafc;
            color: #1e293b;
        }
        @media print {
            body { background-color: white !important; margin: 0; padding: 0; }
            .print-container { 
                box-shadow: none !important; 
                border: none !important; 
                max-width: 100% !important;
                padding: 1.5cm !important;
            }
            .page-break { page-break-before: always; }
            .no-break { break-inside: avoid; }
            @page {
                size: A4;
                margin: 0;
            }
        }
        .summary-card {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
        }
    </style>
</head>
<body class="p-4 md:p-12">
    <div class="print-container bg-white max-w-[210mm] mx-auto p-12 shadow-2xl border border-slate-100 min-h-[297mm]">
        
        <header class="flex justify-between items-end mb-12 border-b-4 border-slate-900 pb-8">
            <div>
                <div class="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4">Executivo v2.0</div>
                <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight">Relatório Gerencial</h1>
                <p class="text-slate-500 font-semibold uppercase text-xs tracking-widest mt-1">SISTEMA INTEGRADO DE PRESTAÇÃO DE CONTAS</p>
            </div>
            <div class="text-right">
                <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Data de Emissão</p>
                <p class="text-lg font-bold text-slate-900">${reportDate}</p>
            </div>
        </header>

        <!-- Global Summary -->
        <section class="mb-12 no-break">
            <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Resumo Consolidado</h3>
            <div class="summary-card p-8 rounded-3xl grid grid-cols-3 gap-8 shadow-xl">
                <div>
                    <span class="block text-[10px] uppercase text-slate-400 font-bold mb-2">Total Reprogramado</span>
                    <span class="text-2xl font-black text-blue-400">${formatCurrency(totalStats.prev)}</span>
                </div>
                <div>
                    <span class="block text-[10px] uppercase text-slate-400 font-bold mb-2">Total Receitas</span>
                    <span class="text-2xl font-black text-emerald-400">+ ${formatCurrency(totalStats.cred)}</span>
                </div>
                <div>
                    <span class="block text-[10px] uppercase text-slate-400 font-bold mb-2">Total Despesas</span>
                    <span class="text-2xl font-black text-red-400">- ${formatCurrency(totalStats.deb)}</span>
                </div>
            </div>
            <div class="mt-4 px-6 py-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-tighter">${periodText}</span>
                <span class="text-xs font-black text-slate-900">SALDO GLOBAL EM CAIXA: <span class="text-emerald-600">${formatCurrency(totalStats.prev + totalStats.cred - totalStats.deb)}</span></span>
            </div>
        </section>

        ${Object.values(dataBySchool).map((school, schoolIdx) => {
        const schoolBalance = school.previousBalance + school.credits - school.debits;
        return `
            <div class="mb-16 ${schoolIdx > 0 ? 'page-break' : ''}">
                <div class="flex items-center gap-4 mb-6 no-break">
                    <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">S</div>
                    <div>
                        <h2 class="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">${school.name}</h2>
                        <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">Unidade Executora / ID Escolar</p>
                    </div>
                </div>

                <div class="grid grid-cols-4 gap-4 mb-8 no-break">
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="block text-[8px] font-black uppercase text-slate-400 mb-1">Saldo Anterior</span>
                        <span class="text-sm font-bold">${formatCurrency(school.previousBalance)}</span>
                    </div>
                    <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                        <span class="block text-[8px] font-black uppercase text-emerald-600 mb-1">Receit. Período</span>
                        <span class="text-sm font-bold text-emerald-700">${formatCurrency(school.credits)}</span>
                    </div>
                    <div class="p-4 bg-red-50 rounded-2xl border border-red-100/50">
                        <span class="block text-[8px] font-black uppercase text-red-600 mb-1">Desp. Período</span>
                        <span class="text-sm font-bold text-red-700">${formatCurrency(school.debits)}</span>
                    </div>
                    <div class="p-4 bg-slate-900 rounded-2xl text-white shadow-lg">
                        <span class="block text-[8px] font-black uppercase text-slate-400 mb-1">Saldo Disponível</span>
                        <span class="text-sm font-black ${schoolBalance < 0 ? 'text-red-400' : 'text-emerald-400'}">${formatCurrency(schoolBalance)}</span>
                    </div>
                </div>

                <div class="space-y-10">
                    ${Object.entries(school.programs).map(([progName, progData]) => {
            const progBal = progData.previousBalance + progData.credits - progData.debits;
            return `
                        <div class="border border-slate-200 rounded-[2rem] overflow-hidden no-break shadow-sm">
                            <div class="bg-slate-50 px-8 py-5 flex justify-between items-center border-b border-slate-200">
                                <div>
                                    <h4 class="text-sm font-black text-slate-900 uppercase tracking-tight">${progName}</h4>
                                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Programa de Financiamento</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-[10px] font-black text-slate-400 uppercase">Saldo do Programa</span>
                                    <p class="text-sm font-black text-slate-900">${formatCurrency(progBal)}</p>
                                </div>
                            </div>
                            
                            <table class="w-full text-left text-[11px] border-collapse">
                                <thead>
                                    <tr class="bg-slate-100/30 text-slate-400 uppercase font-black text-[9px] tracking-widest border-b border-slate-100">
                                        <th class="px-8 py-3">Data</th>
                                        <th class="px-4 py-3">Histórico / Descrição</th>
                                        <th class="px-4 py-3">Rubrica</th>
                                        <th class="px-8 py-3 text-right">Valor (R$)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${progData.entries.map(e => `
                                        <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td class="px-8 py-4 font-bold text-slate-400">${new Date(e.date).toLocaleDateString('pt-BR')}</td>
                                            <td class="px-4 py-4">
                                                <span class="font-extrabold text-slate-900 uppercase block">${e.description}</span>
                                                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">${e.nature}</span>
                                            </td>
                                            <td class="px-4 py-4 text-slate-500 font-semibold italic text-[10px]">${e.rubric || 'Recurso Direto'}</td>
                                            <td class="px-8 py-4 text-right font-black ${e.type === 'Entrada' ? 'text-emerald-600' : 'text-red-500'}">
                                                ${e.type === 'Entrada' ? '+' : '-'} ${formatCurrency(e.value)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
        }).join('')}
                </div>
            </div>
            `;
    }).join('')}

        <footer class="mt-20 pt-12 border-t border-slate-100 no-break">
            <div class="grid grid-cols-2 gap-20">
                <div class="text-center">
                    <div class="mb-12 h-px bg-slate-300 w-full"></div>
                    <p class="text-[10px] font-black uppercase text-slate-900 tracking-widest">Responsável pela Prestação</p>
                    <p class="text-[9px] text-slate-400 uppercase italic">Diretor(a) / Presidente</p>
                </div>
                <div class="text-center">
                    <div class="mb-12 h-px bg-slate-300 w-full"></div>
                    <p class="text-[10px] font-black uppercase text-slate-900 tracking-widest">Contador / Equipe Técnica</p>
                    <p class="text-[9px] text-slate-400 uppercase italic">Registro / CRC</p>
                </div>
            </div>
            <p class="text-center text-[8px] text-slate-300 font-bold uppercase tracking-[0.5em] mt-20">BRN Suite Escolas • Gestão Inteligente de Recursos Públicos</p>
        </footer>
    </div>
</body>
</html>`;
};

