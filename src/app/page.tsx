import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-background flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-16 px-4 sm:py-32 sm:px-16">
        <div className="card-surface rounded-2xl p-6 text-center max-w-lg w-full sm:rounded-3xl sm:p-12">
          <h1 className="font-body text-3xl font-bold tracking-tight mb-3 sm:text-5xl">
            Littlefinger
          </h1>
          <p className="text-muted-foreground text-lg mb-8 leading-7">
            Personal finance tracker that removes the friction of logging
            expenses.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/expenses"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80 active:scale-[0.97]"
            >
              Go to Expenses
            </Link>
            <Link
              href="/debts"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.97]"
            >
              I Owe You
            </Link>
            <span className="accent-strip rounded-full px-4 py-1.5 text-xs font-medium">
              Dashboard coming soon
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
