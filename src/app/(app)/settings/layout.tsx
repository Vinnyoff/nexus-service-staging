
"use client";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { value: "profile", label: "Perfil", href: "/settings" },
  { value: "security", label: "Segurança", href: "/settings/security" },
  { value: "appearance", label: "Aparência", href: "/settings/appearance" },
  { value: "mobile", label: "Mobile", href: "/settings/mobile" },
  { value: "backup", label: "Backup e Exportação", href: "/settings/backup" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine the active tab based on the current path
  const activeTab = tabs.find(tab => tab.href === pathname)?.value || 
                    (pathname.startsWith("/settings/") ? pathname.split("/")[2] : "profile");


  const onTabChange = (value: string) => {
    const href = tabs.find(tab => tab.value === value)?.href;
    if (href) {
      router.push(href);
    }
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações da sua conta e preferências."
      />
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="mt-6">
            {children}
        </div>
      </Tabs>
    </>
  );
}
