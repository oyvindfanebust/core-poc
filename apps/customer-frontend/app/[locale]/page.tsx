import { getTranslations } from 'next-intl/server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const t = await getTranslations('login');
  
  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    customerIdLabel: t('customerIdLabel'),
    customerIdPlaceholder: t('customerIdPlaceholder'),
    signInButton: t('signInButton'),
    useTestCustomer: t('useTestCustomer'),
    demoText: t('demoText'),
    instructionText: t('instructionText'),
    errors: {
      customerIdRequired: t('errors.customerIdRequired'),
      invalidFormat: t('errors.invalidFormat')
    }
  };

  return <LoginForm translations={translations} />;
}