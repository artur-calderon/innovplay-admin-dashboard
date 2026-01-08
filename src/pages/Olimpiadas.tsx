import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, Search, Loader2, Medal, Eye, Edit, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { OlimpiadaCardData, OlimpiadaStatus } from '@/types/olimpiada-types';
import { OlimpiadaCard } from '@/components/olimpiadas/OlimpiadaCard';
import { CreateOlimpiadaModal } from '@/components/olimpiadas/CreateOlimpiadaModal';
import { OlimpiadaResultsModal } from '@/components/olimpiadas/OlimpiadaResultsModal';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Olimpiadas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [olimpiadas, setOlimpiadas] = useState<OlimpiadaCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedOlimpiadaId, setSelectedOlimpiadaId] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyingOlimpiadaId, setApplyingOlimpiadaId] = useState<string | null>(null);

  useEffect(() => {
    loadOlimpiadas();
  }, []);

  const loadOlimpiadas = async () => {
    setLoading(true);
    try {
      const response = await OlimpiadasApiService.getOlimpiadas();
      const olimpiadasData = response.data.map((olimpiada: any) => ({
        id: olimpiada.id,
        title: olimpiada.title,
        description: olimpiada.description,
        status: getStatus(olimpiada),
        startDateTime: olimpiada.startDateTime || olimpiada.time_limit,
        endDateTime: olimpiada.endDateTime || olimpiada.end_time,
        totalStudents: olimpiada.total_students || 0,
        completedStudents: olimpiada.completed_students || 0,
        subjects: olimpiada.subjects || olimpiada.subjects_info || [],
        created_at: olimpiada.created_at || olimpiada.createdAt,
      }));
      setOlimpiadas(olimpiadasData);
    } catch (error) {
      console.error('Erro ao carregar olimpíadas:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíadas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (olimpiada: any): OlimpiadaStatus => {
    if (olimpiada.is_applied || olimpiada.is_active) {
      const now = new Date();
      const startDate = olimpiada.startDateTime || olimpiada.time_limit;
      const endDate = olimpiada.endDateTime || olimpiada.end_time;
      
      if (startDate && new Date(startDate) > now) {
        return 'scheduled';
      }
      if (endDate && new Date(endDate) < now) {
        return 'completed';
      }
      return 'active';
    }
    return 'draft';
  };

  const filteredOlimpiadas = olimpiadas.filter(olimpiada =>
    olimpiada.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    olimpiada.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setSelectedOlimpiadaId(id);
    setShowCreateModal(true);
  };

  const handleView = (id: string) => {
    navigate(`/app/olimpiada/${id}`);
  };

  const handleViewResults = (id: string) => {
    setSelectedOlimpiadaId(id);
    setShowResultsModal(true);
  };

  const handleApply = (id: string) => {
    setApplyingOlimpiadaId(id);
    setShowApplyDialog(true);
  };

  const confirmApply = async () => {
    if (!applyingOlimpiadaId) return;

    try {
      await OlimpiadasApiService.applyOlimpiada(applyingOlimpiadaId);
      toast({
        title: 'Olimpíada aplicada!',
        description: 'A olimpíada foi enviada para os alunos',
      });
      setShowApplyDialog(false);
      setApplyingOlimpiadaId(null);
      loadOlimpiadas();
    } catch (error) {
      console.error('Erro ao aplicar olimpíada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aplicar olimpíada',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSuccess = () => {
    loadOlimpiadas();
    setShowCreateModal(false);
    setSelectedOlimpiadaId(null);
  };

  const stats = {
    total: olimpiadas.length,
    active: olimpiadas.filter(o => o.status === 'active').length,
    completed: olimpiadas.filter(o => o.status === 'completed').length,
    draft: olimpiadas.filter(o => o.status === 'draft').length,
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Olimpíadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie olimpíadas para treinamento de alunos
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedOlimpiadaId(undefined);
            setShowCreateModal(true);
          }}
          className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Olimpíada
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Total de Olimpíadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Rascunhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.draft}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar olimpíadas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Olimpíadas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        </div>
      ) : filteredOlimpiadas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma olimpíada encontrada' : 'Nenhuma olimpíada criada ainda'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Olimpíada
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOlimpiadas.map((olimpiada) => (
            <OlimpiadaCard
              key={olimpiada.id}
              olimpiada={olimpiada}
              onEdit={handleEdit}
              onView={handleView}
              onViewResults={handleViewResults}
              onApply={handleApply}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateOlimpiadaModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedOlimpiadaId(null);
        }}
        onSuccess={handleCreateSuccess}
        olimpiadaId={selectedOlimpiadaId || undefined}
      />

      {selectedOlimpiadaId && (
        <OlimpiadaResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedOlimpiadaId(null);
          }}
          olimpiadaId={selectedOlimpiadaId}
        />
      )}

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Olimpíada</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja enviar esta olimpíada para os alunos? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Medal className="h-4 w-4" />
            <AlertDescription>
              A olimpíada será enviada para todos os alunos das turmas selecionadas.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmApply}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
