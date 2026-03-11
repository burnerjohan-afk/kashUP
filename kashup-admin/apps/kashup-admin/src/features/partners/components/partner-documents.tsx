import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, TrendingUp, Receipt, Upload, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPartnerDocuments, uploadPartnerDocument, deletePartnerDocument } from '../api';
import type { PartnerDocument } from '../api';
import { formatDate } from '@/lib/utils/format';

type PartnerDocumentsProps = {
  partnerId: string;
};

const documentTypeIcons = {
  invoice: Receipt,
  commercial_analysis: TrendingUp,
  contract: FileText,
  other: FileText,
};

const documentTypeLabels = {
  invoice: 'Facture',
  commercial_analysis: 'Analyse commerciale',
  contract: 'Contrat',
  other: 'Document',
};

export const PartnerDocuments = ({ partnerId }: PartnerDocumentsProps) => {
  const queryClient = useQueryClient();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<'invoice' | 'commercial_analysis' | 'contract' | 'other'>('invoice');

  const documentsQuery = useQuery({
    queryKey: ['partner-documents', partnerId],
    queryFn: () => fetchPartnerDocuments(partnerId),
    enabled: !!partnerId,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Aucun fichier sélectionné');
      return uploadPartnerDocument(partnerId, selectedFile, documentName, documentType);
    },
    onSuccess: () => {
      toast.success('Document ajouté avec succès');
      setShowUploadForm(false);
      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('invoice');
      void queryClient.invalidateQueries({ queryKey: ['partner-documents', partnerId] });
    },
    onError: (error) => {
      toast.error(error.message || 'Impossible d\'ajouter le document');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deletePartnerDocument(partnerId, documentId),
    onSuccess: () => {
      toast.success('Document supprimé');
      void queryClient.invalidateQueries({ queryKey: ['partner-documents', partnerId] });
    },
    onError: () => toast.error('Impossible de supprimer le document'),
  });

  if (documentsQuery.isLoading) {
    return (
      <Card title="Documents du partenaire" description="Factures, analyses commerciales et autres documents">
        <Skeleton className="h-32" />
      </Card>
    );
  }

  if (documentsQuery.error || !documentsQuery.data) {
    return (
      <Card title="Documents du partenaire" description="Factures, analyses commerciales et autres documents">
        <p className="text-sm text-red-500">Erreur lors du chargement des documents</p>
      </Card>
    );
  }

  const documents = documentsQuery.data || [];

  // Grouper les documents par type
  const groupedDocuments = documents.reduce(
    (acc, doc) => {
      if (!acc[doc.type]) {
        acc[doc.type] = [];
      }
      acc[doc.type].push(doc);
      return acc;
    },
    {} as Record<string, PartnerDocument[]>,
  );

  return (
    <Card title="Documents du partenaire" description="Factures, analyses commerciales et autres documents">
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setShowUploadForm(!showUploadForm)}
          variant={showUploadForm ? 'secondary' : 'default'}
        >
          <Upload className="mr-2 h-4 w-4" />
          {showUploadForm ? 'Annuler' : 'Ajouter un document'}
        </Button>
      </div>

      {showUploadForm && (
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Nom du document *</label>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ex: Facture janvier 2024"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Type de document *</label>
              <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as PartnerDocument['type'])}>
                <option value="invoice">Facture</option>
                <option value="commercial_analysis">Analyse commerciale</option>
                <option value="contract">Contrat</option>
                <option value="other">Autre</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Fichier *</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4,.webm,.mov,.avi"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    if (!documentName) {
                      setDocumentName(file.name);
                    }
                  }
                }}
              />
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-ink/70">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-xs text-ink/50">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowUploadForm(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (!documentName || !documentType || !selectedFile) {
                    toast.error('Veuillez remplir tous les champs');
                    return;
                  }
                  uploadMutation.mutate();
                }}
                isLoading={uploadMutation.isPending}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {documents.length === 0 && !showUploadForm && (
        <p className="text-sm text-ink/50">Aucun document disponible</p>
      )}

      <div className="space-y-6">
        {Object.entries(groupedDocuments).map(([type, docs]) => {
          const Icon = documentTypeIcons[type as keyof typeof documentTypeIcons] || FileText;
          const label = documentTypeLabels[type as keyof typeof documentTypeLabels] || 'Document';

          return (
            <div key={type}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-primary">{label}</h4>
                <span className="text-xs text-ink/50">({docs.length})</span>
              </div>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-ink/10 bg-ink/2 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{doc.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-ink/50">
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.size && <span>{doc.size}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          // Télécharger le document
                          if (doc.url.startsWith('data:')) {
                            // Pour les data URLs, créer un lien de téléchargement
                            const link = document.createElement('a');
                            link.href = doc.url;
                            link.download = doc.name;
                            link.click();
                          } else {
                            window.open(doc.url, '_blank');
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Êtes-vous sûr de vouloir supprimer "${doc.name}" ?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        isLoading={deleteMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

