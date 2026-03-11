import React, { Component, ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Error info:', errorInfo);
    console.error('🚨 Component stack:', errorInfo.componentStack);
    
    // Log les détails de l'erreur pour le débogage
    if (error.message.includes('Objects are not valid')) {
      console.error('🔍 Erreur de rendu d\'objet détectée');
      console.error('🔍 Message:', error.message);
      console.error('🔍 Stack:', error.stack);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-ink/5 p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl border border-ink/10 p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Erreur inattendue de l'application!
            </h1>
            <p className="text-sm text-ink/70 mb-4">{this.state.error?.message}</p>
            
            {this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink mb-2">
                  Détails de l'erreur (cliquez pour développer)
                </summary>
                <div className="mt-2 p-4 bg-ink/5 rounded-lg overflow-auto max-h-96">
                  <pre className="text-xs text-ink/80 whitespace-pre-wrap">
                    {this.state.error?.stack}
                  </pre>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink mb-2">Component Stack:</p>
                    <pre className="text-xs text-ink/80 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              </details>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

