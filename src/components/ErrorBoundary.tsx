import React from "react";

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // You could send this to an external logging service
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white/5 p-8 text-center">
            <h2 className="text-lg font-semibold">Algo deu errado</h2>
            <p className="mt-2 text-sm text-[color:var(--sinaxys-ink)]/70">Ocorreu um erro enquanto carregávamos a interface.</p>
            <div className="mt-4 text-sm text-[color:var(--sinaxys-ink)]/70">{this.state.error?.message}</div>
            <div className="mt-6 flex justify-center">
              <button
                className="rounded-full bg-[color:var(--sinaxys-primary)] px-4 py-2 text-white"
                onClick={() => window.location.reload()}
              >
                Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
