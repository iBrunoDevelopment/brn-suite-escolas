const fs = require('fs');

const files = [
    'src/components/financial/EntryFormModal.tsx',
    'src/components/financial/ReprogrammedBalancesModal.tsx',
    'src/pages/DocumentSafe.tsx'
];

let totalSelects = 0;
let selectsWithTitle = 0;
let selectsWithAriaLabel = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const selects = content.match(/<select[^>]*>/g) || [];

    totalSelects += selects.length;
    selectsWithTitle += selects.filter(s => s.includes('title=')).length;
    selectsWithAriaLabel += selects.filter(s => s.includes('aria-label=')).length;

    console.log(`\n📄 ${file}:`);
    console.log(`   Total selects: ${selects.length}`);
    console.log(`   With title: ${selects.filter(s => s.includes('title=')).length}`);
    console.log(`   With aria-label: ${selects.filter(s => s.includes('aria-label=')).length}`);
});

console.log('\n📊 RESUMO GERAL:');
console.log(`   Total de <select> no projeto: ${totalSelects}`);
console.log(`   Com atributo 'title': ${selectsWithTitle} (${(selectsWithTitle / totalSelects * 100).toFixed(1)}%)`);
console.log(`   Com atributo 'aria-label': ${selectsWithAriaLabel} (${(selectsWithAriaLabel / totalSelects * 100).toFixed(1)}%)`);
console.log(`\n${selectsWithTitle === totalSelects ? '✅ TODOS os selects possuem nomes acessíveis!' : '❌ Alguns selects ainda precisam de correção'}`);
