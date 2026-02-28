import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          M.U.S.T.Learn
        </h1>
        <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
          AI-powered Universal Learning Layer — synthesize materials, find gaps, get a study plan and narration.
        </p>
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900 px-6 py-3 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Open dashboard
        </Link>
      </main>
    </div>
  );
}
