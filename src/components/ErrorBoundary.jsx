import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * ErrorBoundary Component - FASE 15: Error Handling
 * Catches React component errors and displays fallback UI
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ErrorBoundary caught error:', error);
    console.error('📋 Component stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo
    });

    // Log to error reporting service (Sentry, etc)
    if (window.__errorReporting) {
      window.__errorReporting.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Algo deu errado</h1>
            </div>

            {/* Error Message */}
            <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm font-mono text-gray-700 break-words">
                {this.state.error?.message || 'Um erro inesperado ocorreu'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 cursor-pointer">
                  <summary className="text-xs font-semibold text-gray-600 hover:text-gray-800">
                    Detalhes (Dev Only)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40 bg-white p-2 rounded border border-gray-200">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-6">
              Desculpe-nos pelos inconvenientes. Você pode tentar:
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar página
              </button>

              <button
                onClick={this.handleGoBack}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>

            {/* Support Info */}
            <p className="text-xs text-gray-500 text-center mt-6">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary Wrapper for specific sections
 * Usage: <ErrorBoundarySection fallback={<CustomFallback />}><Component /></ErrorBoundarySection>
 */
export function ErrorBoundarySection({ children, fallback = null, onError = null }) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}
