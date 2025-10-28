import Link from "next/link";
import LoginGate from "./components/LoginGate";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://ub-fsw-server.onrender.com/api/digit-classifier";

export default function Home() {
  return (
    <div className="min-h-screen p-8 sm:p-20 flex flex-col items-center gap-8 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col items-center gap-2">
        {/* <Image src="/next.svg" alt="logo" width={180} height={38} /> */}
        <h1 className="text-2xl font-semibold">Digit Recognition — Draw a digit</h1>
        <p className="text-sm text-gray-600">Draw a single digit (0–9) in the box and click Predict.</p>
      </header>

        <main className="flex flex-col items-center gap-6">
          <div className="w-full max-w-3xl flex justify-end">
            <Link href="/leaderboard" className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500">
              View Leaderboard
            </Link>
          </div>

          <LoginGate apiUrl={API_URL} />
      </main>

    </div>
  );
}
