import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

export interface BrandingConfig {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  primaryColor: string; // HSL string e.g. "217 71% 45%"
  accentColor: string;  // HSL string e.g. "217 91% 60%"
  sidebarBg: string;    // HSL string e.g. "222 47% 11%"
}

const DEFAULTS: BrandingConfig = {
  brandName: 'Accounting System',
  brandTagline: 'Accounts',
  logoUrl: '',
  primaryColor: '217 71% 45%',
  accentColor: '217 91% 60%',
  sidebarBg: '222 47% 11%',
};

interface BrandingContextType {
  branding: BrandingConfig;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULTS,
  refreshBranding: async () => {},
});

function applyBrandingToDom(branding: BrandingConfig) {
  const root = document.documentElement;
  if (branding.primaryColor) {
    root.style.setProperty('--primary', branding.primaryColor);
    root.style.setProperty('--ring', branding.primaryColor);
    root.style.setProperty('--sidebar-accent', branding.primaryColor);
  }
  if (branding.accentColor) {
    root.style.setProperty('--accent', branding.accentColor);
  }
  if (branding.sidebarBg) {
    root.style.setProperty('--sidebar-bg', branding.sidebarBg);
  }
  // Update page title
  if (branding.brandName) {
    document.title = branding.brandName;
  }
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULTS);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/settings/company`);
      const data = res.data;

      const config: BrandingConfig = {
        brandName: data.brandName || data.companyName || DEFAULTS.brandName,
        brandTagline: data.brandTagline || DEFAULTS.brandTagline,
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || DEFAULTS.primaryColor,
        accentColor: data.accentColor || DEFAULTS.accentColor,
        sidebarBg: data.sidebarBg || DEFAULTS.sidebarBg,
      };

      setBranding(config);
      applyBrandingToDom(config);
    } catch {
      // Silently fall back to defaults (unauthenticated on login page, etc.)
      applyBrandingToDom(DEFAULTS);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
