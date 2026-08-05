import { BarChart3 } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="page-surface min-h-screen">
      <div className="mx-auto max-w-screen-xl px-6 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your spending, income, and balances
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center sm:py-20">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <BarChart3 size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Coming soon</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Charts and insights for your finances are on the way.
          </p>
        </div>
      </div>
    </div>
  );
}