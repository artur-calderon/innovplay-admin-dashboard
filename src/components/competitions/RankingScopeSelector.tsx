import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MapPin, Globe2, School as SchoolIcon, ChevronDown } from 'lucide-react';

export type RankingScope = 'global' | 'state' | 'municipality' | 'school';

export interface RankingScopeSelection {
  scope: RankingScope;
  state?: string;
  city_id?: string;
  school_id?: string;
}

interface RankingScopeSelectorProps {
  value: RankingScopeSelection;
  onChange: (value: RankingScopeSelection) => void;
  disabled?: boolean;
}

export function RankingScopeSelector({ value, onChange, disabled }: RankingScopeSelectorProps) {
  const labelForScope = (scope: RankingScope) => {
    switch (scope) {
      case 'global':
        return 'Global';
      case 'state':
        return 'Estado';
      case 'municipality':
        return 'Município';
      case 'school':
        return 'Escola';
      default:
        return 'Global';
    }
  };

  const iconForScope = (scope: RankingScope) => {
    switch (scope) {
      case 'global':
        return <Globe2 className="h-4 w-4" />;
      case 'state':
      case 'municipality':
        return <MapPin className="h-4 w-4" />;
      case 'school':
        return <SchoolIcon className="h-4 w-4" />;
      default:
        return <Globe2 className="h-4 w-4" />;
    }
  };

  const currentLabel = labelForScope(value.scope);

  const handleScopeChange = (scope: RankingScope) => {
    // Mantém filtros existentes quando possível
    onChange({
      scope,
      state: value.state,
      city_id: value.city_id,
      school_id: value.school_id,
    });
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Escopo do ranking
      </span>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-full border-muted-foreground/20 px-3"
            >
              {iconForScope(value.scope)}
              <span>{currentLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleScopeChange('global')}>
              <Globe2 className="mr-2 h-4 w-4" />
              <span>Global</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleScopeChange('state')}>
              <MapPin className="mr-2 h-4 w-4" />
              <span>Estado</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleScopeChange('municipality')}>
              <MapPin className="mr-2 h-4 w-4" />
              <span>Município</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleScopeChange('school')}>
              <SchoolIcon className="mr-2 h-4 w-4" />
              <span>Escola</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

