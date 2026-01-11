
export enum UserRole {
    ADMIN = 'Administrador',
    OPERADOR = 'Operador',
    DIRETOR = 'Diretor',
    TECNICO_GEE = 'Técnico GEE',
    CLIENTE = 'Cliente'
}

export enum TransactionStatus {
    PENDENTE = 'Pendente',
    PAGO = 'Pago',
    RECEBIDO = 'Recebido',
    AGENDADO = 'Agendado',
    ESTORNADO = 'Estornado',
    CONCILIADO = 'Conciliado',
    CONSOLIDADO = 'Consolidado'
}

export enum TransactionNature {
    CUSTEIO = 'Custeio',
    CAPITAL = 'Capital'
}

export interface User {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
    schoolId?: string;
    assignedSchools?: string[];
    active?: boolean; // Status do usuário (ativo/inativo)
    gee?: string; // GEE do técnico (apenas para Técnico GEE)
    avatar_url?: string; // URL da foto do usuário
}

export interface AuditLog {
    id: string;
    entry_id: string;
    user_name: string;
    action: string;
    changes: any;
    timestamp: string;
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: number;
    category?: 'Nota Fiscal' | 'Comprovante' | 'Certidão Municipal' | 'Certidão Estadual' | 'Certidão Federal' | 'FGTS' | 'Trabalhista' | 'Outros';
}

export interface Supplier {
    id: string;
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    cep?: string;
    address?: string;
    city?: string;
    uf?: string;
    bank_info?: {
        bank: string;
        agency: string;
        account: string;
    };
    stamp_url?: string;
}

export interface FinancialEntry {
    id: string;
    school_id: string;
    school: string; // Display name
    date: string;
    description: string;
    value: number;
    status: TransactionStatus;
    type: 'Entrada' | 'Saída';
    program_id: string;
    program: string; // Display name
    rubric_id?: string;
    rubric: string; // Display name
    supplier_id?: string;
    supplier?: string; // Display name
    nature: TransactionNature;
    category?: string;
    batch_id?: string;
    invoice_date?: string;
    document_number?: string; // Número da Nota
    payment_date?: string;
    auth_number?: string; // Número do Pagamento/Doc
    attachment_url?: string;
    attachments?: Attachment[];
    bank_account_id?: string;
    bank_account?: string; // Display name
    payment_method_id?: string;
    payment_method?: string; // Display name
    is_reconciled?: boolean;
    reconciled_at?: string;
    bank_transaction_ref?: string;
    logs?: any[];
}

export interface Alert {
    id: string;
    title: string;
    description: string;
    severity: 'Crítico' | 'Médio' | 'Atenção' | 'Informativo';
    timestamp?: string;
    school_id?: string;
    school_name?: string;
}

export interface School {
    id: string;
    name: string;
    inep?: string;
    seec?: string;
    conselho_escolar?: string;
    cnpj?: string;
    phone?: string;
    director?: string;
    secretary?: string;
    address?: string;
    city?: string;
    uf?: string;
    image_url?: string;
    gee?: string; // Gerência Executiva de Educação
    gee_id?: string;
}

export interface Program {
    id: string;
    name: string;
    description?: string;
}

export interface Rubric {
    id: string;
    program_id: string;
    name: string;
    default_nature?: TransactionNature;
    school_id?: string;
}

export interface BankAccount {
    id: string;
    school_id?: string;
    program_id?: string;
    name: string;
    bank_name: string;
    agency?: string;
    account_number?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
}

export interface AccountabilityProcess {
    id: string;
    financial_entry_id: string;
    school_id: string;
    status: 'Em Andamento' | 'Concluído';
    discount?: number;
    checklist?: { id: string, label: string, checked: boolean }[];
    attachments?: Attachment[];
    created_at: string;
    updated_at: string;
    financial_entry?: FinancialEntry;
    items?: AccountabilityItem[];
    quotes?: AccountabilityQuote[];
}

export interface AccountabilityItem {
    id: string;
    process_id: string;
    description: string;
    quantity: number;
    unit: string;
    winner_unit_price: number;
}

export interface AccountabilityQuote {
    id: string;
    process_id: string;
    supplier_id?: string;
    supplier_name: string;
    supplier_cnpj?: string;
    is_winner: boolean;
    total_value: number;
    items?: AccountabilityQuoteItem[];
}

export interface AccountabilityQuoteItem {
    id: string;
    quote_id: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    is_read: boolean;
    link?: string;
    created_at: string;
}

export interface RolePermission {
    id: string;
    role: UserRole;
    resource: 'entries' | 'schools' | 'reports' | 'settings' | 'users';
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

export interface Permission {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface ReprogrammedBalance {
    id: string;
    school_id: string;
    program_id: string;
    rubric_id?: string;
    nature: TransactionNature;
    period: string; // e.g. '2025'
    value: number;
}
