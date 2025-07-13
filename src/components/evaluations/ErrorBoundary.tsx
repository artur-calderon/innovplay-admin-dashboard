import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Ops! Algo deu errado</h2>
          </div>
          
          <p className="text-gray-600 text-center max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte.
          </p>

          {this.state.error && (
            <details className="mt-4 text-sm text-gray-500">
              <summary className="cursor-pointer">Detalhes do erro</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex space-x-2">
            <Button onClick={this.handleRetry} variant="outline">
              Tentar Novamente
            </Button>
            <Button onClick={this.handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 