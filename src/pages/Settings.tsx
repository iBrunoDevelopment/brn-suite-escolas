import React, { useEffect } from 'react';
import { User } from '../types';
import { useSettings } from '../hooks/useSettings';

// Sections
import ProfileSection from '../components/settings/ProfileSection';
import SecuritySection from '../components/settings/SecuritySection';
import RubricsSection from '../components/settings/RubricsSection';
import BanksSection from '../components/settings/BanksSection';
import SuppliersSection from '../components/settings/SuppliersSection';
import PeriodsSection from '../components/settings/PeriodsSection';
import PaymentMethodsSection from '../components/settings/PaymentMethodsSection';
import StatusSection from '../components/settings/StatusSection';
import SupportContactsSection from '../components/settings/SupportContactsSection';
import WebsitePlansSection from '../components/settings/WebsitePlansSection';
import AssetsSection from '../components/settings/AssetsSection';
import BillingSection from '../components/settings/BillingSection';

const Settings: React.FC<{ user: User }> = ({ user }) => {
  const settings = useSettings(user);

  const { activeTab, setActiveTab } = settings;

  const configTabs = [
    { id: 'profile', label: 'Minha Conta', icon: 'person', roles: [] },
    { id: 'security', label: 'Segurança', icon: 'lock', roles: [] },
    { id: 'general', label: 'Configurações Gerais', icon: 'tune', roles: ['Administrador', 'Operador'] },
    { id: 'rubrics', label: 'Recursos & Rubricas', icon: 'category', roles: ['Administrador', 'Operador'] },
    { id: 'status', label: 'Status de Movimentação', icon: 'sync_alt', roles: ['Administrador', 'Operador'] },
    { id: 'payment', label: 'Tipos de Pagamento', icon: 'payments', roles: ['Administrador', 'Operador'] },
    { id: 'periods', label: 'Períodos / Semestres', icon: 'calendar_month', roles: ['Administrador', 'Operador'] },
    { id: 'banks', label: 'Contas Bancárias', icon: 'account_balance', roles: ['Administrador', 'Operador'] },
    { id: 'suppliers', label: 'Fornecedores', icon: 'local_shipping', roles: ['Administrador', 'Operador'] },
    { id: 'assets', label: 'Arquivos & Modelos', icon: 'folder_open', roles: ['Administrador', 'Operador'] },
    { id: 'contacts', label: 'Contatos de Suporte', icon: 'contact_support', roles: ['Administrador'] },
    { id: 'website', label: 'Web Site / Planos', icon: 'public', roles: ['Administrador'] },
    { id: 'billing', label: 'Faturamento BRN', icon: 'receipt_long', roles: ['Administrador'] }
  ].filter((tab: any) => tab.roles.length === 0 || tab.roles.includes(user.role));

  useEffect(() => {
    if (activeTab === 'rubrics' || activeTab === 'banks') settings.fetchAuxOptions();
    if (activeTab === 'rubrics') settings.fetchRubricData();
    if (activeTab === 'suppliers') settings.fetchSupplierData();
    if (activeTab === 'banks') settings.fetchBankData();
    if (activeTab === 'payment') settings.fetchPaymentData();
    if (activeTab === 'periods') settings.fetchPeriodData();
    if (activeTab === 'contacts') settings.fetchSupportContacts();
    if (activeTab === 'website') settings.fetchPlans();
    if (activeTab === 'assets') settings.fetchAssets();
  }, [activeTab]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Configurações do Sistema</h1>
        <p className="text-text-secondary text-sm">Gerencie parâmetros, cadastros base e regras de negócio do BRN Suite.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Mini - Improved Responsiveness for Mobile */}
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide">
          {configTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left whitespace-nowrap min-w-fit md:min-w-0 ${activeTab === tab.id
                ? 'bg-primary/10 text-white border-b-2 md:border-b-0 md:border-l-4 border-primary font-bold'
                : 'text-text-secondary hover:bg-surface-dark hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 flex flex-col gap-6 bg-surface-dark border border-surface-border rounded-xl p-4 md:p-8">
          <div className="flex flex-col gap-6">
            {activeTab === 'profile' && (
              <ProfileSection
                profileData={settings.profileData}
                setProfileData={settings.setProfileData}
                updatingProfile={settings.updatingProfile}
                onUpdate={settings.handleUpdateProfile}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySection
                passwords={settings.passwords}
                setPasswords={settings.setPasswords}
                updatingPassword={settings.updatingPassword}
                onUpdate={settings.handleChangePassword}
              />
            )}

            {activeTab === 'rubrics' && (
              <RubricsSection
                rubrics={settings.rubrics}
                programs={settings.programs}
                schools={settings.schools}
                newRubric={settings.newRubric}
                setNewRubric={settings.setNewRubric}
                editingRubricId={settings.editingRubricId}
                setEditingRubricId={settings.setEditingRubricId}
                onSave={settings.handleSaveRubric}
                onEdit={settings.handleEditRubric}
                onDelete={settings.handleDeleteRubric}
                newProgram={settings.newProgram}
                setNewProgram={settings.setNewProgram}
                onCreateProgram={settings.handleCreateProgram}
                onDeleteProgram={settings.handleDeleteProgram}
                search={settings.rubricSearch}
                setSearch={settings.setRubricSearch}
                filterProgram={settings.rubricFilterProgram}
                setFilterProgram={settings.setRubricFilterProgram}
                filterSchool={settings.rubricFilterSchool}
                setFilterSchool={settings.setRubricFilterSchool}
                loading={settings.loading}
              />
            )}

            {activeTab === 'suppliers' && (
              <SuppliersSection
                suppliers={settings.suppliers}
                newSupplier={settings.newSupplier}
                setNewSupplier={settings.setNewSupplier}
                editingSupplierId={settings.editingSupplierId}
                setEditingSupplierId={settings.setEditingSupplierId}
                onSave={settings.handleCreateSupplier}
                onEdit={settings.handleEditSupplier}
                onDelete={settings.handleDeleteSupplier}
                onStampUpload={settings.handleStampUpload}
                isUploadingStamp={settings.isUploadingStamp}
                cities={settings.cities}
                loadingCities={settings.loadingCities}
                fetchCities={settings.fetchCities}
              />
            )}

            {activeTab === 'banks' && (
              <BanksSection
                bankAccounts={settings.bankAccounts}
                programs={settings.programs}
                schools={settings.schools}
                newBank={settings.newBank}
                setNewBank={settings.setNewBank}
                editingBankId={settings.editingBankId}
                setEditingBankId={settings.setEditingBankId}
                onSave={settings.handleCreateBank}
                onEdit={settings.handleEditBank}
                onDelete={settings.handleDeleteBank}
                search={settings.bankSearch}
                setSearch={settings.setBankSearch}
                filterProgram={settings.bankFilterProgram}
                setFilterProgram={settings.setBankFilterProgram}
                filterSchool={settings.bankFilterSchool}
                setFilterSchool={settings.setBankFilterSchool}
                loading={settings.loading}
              />
            )}

            {activeTab === 'periods' && (
              <PeriodsSection
                periods={settings.periods}
                newPeriod={settings.newPeriod}
                setNewPeriod={settings.setNewPeriod}
                isSavingPeriod={settings.isSavingPeriod}
                onSave={settings.handleCreatePeriod}
                onToggle={settings.handleTogglePeriod}
                onDelete={settings.handleDeletePeriod}
                loading={settings.loading}
              />
            )}

            {activeTab === 'payment' && (
              <PaymentMethodsSection
                paymentMethods={settings.paymentMethods}
                newPaymentMethod={settings.newPaymentMethod}
                setNewPaymentMethod={settings.setNewPaymentMethod}
                onSave={settings.handleCreatePaymentMethod}
                onDelete={settings.handleDeletePaymentMethod}
              />
            )}

            {activeTab === 'status' && <StatusSection />}

            {activeTab === 'contacts' && (
              <SupportContactsSection
                supportContacts={settings.supportContacts}
                setSupportContacts={settings.setSupportContacts}
                loadingContacts={settings.loadingContacts}
                savingContacts={settings.savingContacts}
                onSave={settings.handleSaveContacts}
              />
            )}

            {activeTab === 'website' && (
              <WebsitePlansSection
                plans={settings.plans}
                savingPlans={settings.savingPlans}
                onSavePlans={settings.handleSavePlans}
                updatePlanField={settings.updatePlanField}
                onAddFeature={settings.handleAddFeature}
                onRemoveFeature={settings.handleRemoveFeature}
                onUpdateFeature={settings.handleUpdateFeature}
                onAddPlan={settings.handleAddPlan}
              />
            )}

            {activeTab === 'assets' && (
              <AssetsSection
                templateUrl={settings.templateUrl}
                loadingAssets={settings.loadingAssets}
                isUploadingTemplate={settings.isUploadingTemplate}
                onUpload={settings.handleTemplateUpload}
              />
            )}

            {activeTab === 'billing' && (
              <BillingSection
                billingRecords={settings.billingRecords}
                schools={settings.schools}
                loading={settings.loadingBilling}
                onUpdateStatus={settings.handleUpdateBilling}
                onGenerate={settings.handleGenerateBilling}
                onCreate={settings.handleCreateBilling}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
