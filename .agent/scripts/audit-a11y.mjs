import * as fs from 'fs';

const files = [
    'src/components/financial/EntryFormModal.tsx',
    'src/components/financial/ReprogrammedBalancesModal.tsx',
    'src/pages/DocumentSafe.tsx'
];

let total = 0;
let withTitle = 0;
let withAriaLabel = 0;

console.log('🔍 AUDITORIA DE ACESSIBILIDADE - SELECT ELEMENTS\n');
console.log('='.repeat(60));

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const selects = content.match(/<select[^>]*>/g) || [];

    const hasTitle = selects.filter(s => s.includes('title=')).length;
    const hasAria = selects.filter(s => s.includes('aria-label=')).length;

    total += selects.length;
    withTitle += hasTitle;
    withAriaLabel += hasAria;

    console.log(`\n📄 ${file}`);
    console.log(`   Selects encontrados: ${selects.length}`);
    console.log(`   ✓ Com 'title': ${hasTitle}`);
    console.log(`   ✓ Com 'aria-label': ${hasAria}`);
});

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO FINAL:\n');
console.log(`   Total de <select>: ${total}`);
console.log(`   Com 'title': ${withTitle} (${(withTitle / total * 100).toFixed(1)}%)`);
console.log(`   Com 'aria-label': ${withAriaLabel} (${(withAriaLabel / total * 100).toFixed(1)}%)`);
console.log('\n' + (withTitle === total ? '✅ SUCESSO! Todos os <select> são acessíveis!' : '⚠️  Alguns <select> precisam de correção'));
console.log('='.repeat(60));
