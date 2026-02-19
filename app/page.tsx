import { syncUser } from "@/lib/syncUser";


export default async function Home() {
  const user = await syncUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Please sign in to continue.</p>
      </div>
    );
  }

  const botUsername = "Karanaji_bot";


  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
  

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              Your Digital Shop Assistant is Ready.
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Manage your sales, credits, and payments directly from Telegram. Quick, easy, and always syncronized with your shop.
            </p>

            <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Your Identification ID</span>
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <code className="flex-1 font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200 break-all">{user.clerkId}</code>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="font-semibold text-lg">Quick Setup:</h3>
                <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Click the <b>Connect</b> button below</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">2</span>
                    <span>Tap on <b>Start</b> in Telegram</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">3</span>
                    <span>Boom! You&apos;re ready to record transactions</span>
                  </li>
                </ul>
              </div>

              <a
                href={`https://t.me/${botUsername}?start=${user.clerkId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full gap-3 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.89.03-.24.36-.49.99-.75 3.88-1.69 6.47-2.8 7.76-3.34 3.69-1.54 4.45-1.81 4.95-1.82.11 0 .35.03.5.16.13.1.17.24.18.33.01.07.02.21 0 .35z" />
                </svg>
                Connect to Telegram Bot
              </a>
            </div>
          </div>

          <div className="hidden md:block relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
            <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                <div className="space-y-1">
                  <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                  <div className="w-20 h-3 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none text-sm shadow-sm">
                    &quot;Maggie sale ₹20&quot;
                  </div>
                  <span className="text-[10px] text-zinc-400">12:45 PM</span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-5 py-3 rounded-2xl rounded-tl-none text-sm border border-zinc-200 dark:border-zinc-700">
                    Theek hai! ✅ <b>sale</b> record ho gayi hai.<br />
                    Item: Maggie<br />
                    Amount: ₹20
                  </div>
                  <span className="text-[10px] text-zinc-400">12:45 PM</span>
                </div>
                <div className="flex flex-col items-end gap-1 pt-2">
                  <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-none text-sm shadow-sm">
                    &quot;Total sale aaj ki&quot;
                  </div>
                  <span className="text-[10px] text-zinc-400">01:10 PM</span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-5 py-3 rounded-2xl rounded-tl-none text-sm border border-zinc-200 dark:border-zinc-700">
                    Aaj ki total sale ₹240 hui hai. 📈
                  </div>
                  <span className="text-[10px] text-zinc-400">01:10 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-zinc-500 text-xs border-t border-zinc-200 dark:border-zinc-800">
        © {new Date().getFullYear()} KiranaBot • Powered by Gemini AI • Built with Next.js
      </footer>
    </div>
  );
}
