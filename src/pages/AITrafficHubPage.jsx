import { AITrafficHub } from '../components/AITrafficHub';

export function AITrafficHubPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex-1">
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary">AI Traffic Hub</h1>
        <p className="text-on-surface-variant/70 text-sm">Advanced AI predictive modeling and intelligent traffic control algorithms.</p>
      </div>
      <AITrafficHub />
    </div>
  );
}
