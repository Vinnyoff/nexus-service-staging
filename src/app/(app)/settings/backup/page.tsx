
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Database, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type CollectionName = 'clients' | 'serviceContracts' | 'external-tickets' | 'internal-tickets' | 'users' | 'technicians' | 'sectors';

interface ExportConfig {
    collectionName: CollectionName;
    label: string;
}

const collectionsToExport: ExportConfig[] = [
    { collectionName: 'clients', label: 'Clientes' },
    { collectionName: 'serviceContracts', label: 'Contratos' },
    { collectionName: 'external-tickets', label: 'Chamados Externos' },
    { collectionName: 'internal-tickets', label: 'Atendimentos Internos' },
    { collectionName: 'users', label: 'Usuários' },
    { collectionName: 'technicians', label: 'Técnicos' },
    { collectionName: 'sectors', label: 'Setores' },
];

export default function BackupPage() {
  const { toast } = useToast();
  const [loadingCollection, setLoadingCollection] = useState<CollectionName | null>(null);

  const handleExport = async (collectionName: CollectionName, label: string) => {
    setLoadingCollection(collectionName);
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data.length === 0) {
        toast({
          title: `Nenhum dado encontrado`,
          description: `A coleção "${label}" está vazia.`,
        });
        return;
      }

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      link.download = `backup_${collectionName}_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação Concluída!',
        description: `${data.length} documentos da coleção "${label}" foram exportados.`,
      });

    } catch (error) {
      console.error(`Error exporting collection ${collectionName}:`, error);
      toast({
        variant: 'destructive',
        title: 'Erro na Exportação',
        description: `Não foi possível exportar os dados da coleção "${label}".`,
      });
    } finally {
      setLoadingCollection(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Backup e Exportação"
        description="Baixe cópias de segurança dos dados do sistema em formato JSON."
      />
      <div className="mt-6">
        <Card>
            <CardHeader>
                <CardTitle>Exportar Coleções do Banco de Dados</CardTitle>
                <CardDescription>
                    Clique em um botão para baixar todos os documentos da coleção correspondente. 
                    Isso pode levar alguns instantes dependendo do volume de dados.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collectionsToExport.map(config => (
                    <Button
                        key={config.collectionName}
                        variant="outline"
                        className="w-full justify-start p-6 text-left h-auto"
                        disabled={loadingCollection !== null}
                        onClick={() => handleExport(config.collectionName, config.label)}
                    >
                        {loadingCollection === config.collectionName ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-5 w-5" />
                        )}
                        <span className="font-semibold">{config.label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
      </div>
    </>
  );
}

