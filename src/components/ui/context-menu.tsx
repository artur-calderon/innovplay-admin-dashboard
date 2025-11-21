import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Eye } from 'lucide-react';

interface ContextMenuProps {
  children: React.ReactNode;
  onOpenInNewTab: () => void;
  onViewDetails: () => void;
  studentName: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  onOpenInNewTab,
  onViewDetails,
  studentName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = event.clientX;
      const y = event.clientY;
      
      // Ajustar posição para não sair da tela
      const menuWidth = 200;
      const menuHeight = 120;
      const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
      const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
      
      setPosition({ x: adjustedX, y: adjustedY });
      setIsOpen(true);
    }
  };

  const handleMenuItemClick = (event: React.MouseEvent, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
    setIsOpen(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        onClick={(event) => event.stopPropagation()}
        className="relative"
      >
    {children}
      </div>
      
      {isOpen && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{
            left: position.x,
            top: position.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            {studentName}
          </div>
          
          <button
            onClick={(event) => handleMenuItemClick(event, onViewDetails)}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver detalhes
          </button>
          
          <button
            onClick={(event) => handleMenuItemClick(event, onOpenInNewTab)}
            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir em nova guia
          </button>
        </div>
      )}
    </>
  );
};