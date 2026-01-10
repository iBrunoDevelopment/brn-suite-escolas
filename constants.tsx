
import React from 'react';
import { FinancialEntry, TransactionStatus, TransactionNature, UserRole, Alert } from './types';

export const MOCK_ENTRIES: FinancialEntry[] = [
  {
    id: '1',
    date: '2023-10-12',
    school: 'Escola Primária Central',
    program: 'Ensino Fundamental',
    description: 'Compra de Material de Escritório',
    rubric: 'Material de Consumo',
    value: -450.00,
    status: TransactionStatus.PAGO,
    nature: TransactionNature.CUSTEIO,
    type: 'Saída'
  },
  {
    id: '2',
    date: '2023-10-11',
    school: 'Colégio São Marcos',
    program: 'Extracurricular',
    description: 'Mensalidade - Outubro/23',
    rubric: 'Receita de Mensalidades',
    value: 1200.00,
    status: TransactionStatus.RECEBIDO,
    nature: TransactionNature.CUSTEIO,
    type: 'Entrada'
  },
  {
    id: '3',
    date: '2023-10-10',
    school: 'Instituto Saber',
    program: 'Administrativo',
    description: 'Serviço de Manutenção Predial',
    rubric: 'Serviços de Terceiros',
    value: -2800.00,
    status: TransactionStatus.PENDENTE,
    nature: TransactionNature.CUSTEIO,
    type: 'Saída'
  },
  {
    id: '4',
    date: '2023-10-09',
    school: 'Escola Primária Central',
    program: 'Ensino Fundamental',
    description: 'Aquisição de Livros Didáticos',
    rubric: 'Material Didático',
    value: -5430.50,
    status: TransactionStatus.PAGO,
    nature: TransactionNature.CUSTEIO,
    type: 'Saída'
  },
  {
    id: '5',
    date: '2023-10-08',
    school: 'Colégio São Marcos',
    program: 'Administrativo',
    description: 'Repasse Prefeitura',
    rubric: 'Subvenções Governamentais',
    value: 15000.00,
    status: TransactionStatus.RECEBIDO,
    nature: TransactionNature.CUSTEIO,
    type: 'Entrada'
  }
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'A1',
    title: 'Saldo Baixo: Conta Operacional',
    description: 'Saldo atual (R$ 1.250,00) abaixo do limite mínimo.',
    severity: 'Crítico',
    timestamp: '12 min atrás',
    school: 'Escola Sul'
  },
  {
    id: 'A2',
    title: 'Programa sem Execução',
    description: 'Inovação Tech sem gastos registrados nos últimos 45 dias.',
    severity: 'Atenção',
    timestamp: '2h atrás',
    school: 'Instituto Central'
  },
  {
    id: 'A3',
    title: 'Lançamento Atrasado: Fatura #9921',
    description: 'Vencida há 3 dias. Fornecedor: Tech Solutions.',
    severity: 'Atenção',
    timestamp: '3 dias atrás',
    school: 'Administrativo'
  }
];

export const SCHOOL_LIST = [
  'Escola Primária Central',
  'Colégio São Marcos',
  'Instituto Saber',
  'Escola Sul',
  'Instituto Central',
  'Escola Norte'
];
