export function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#0d0e13] flex justify-center overflow-x-hidden relative">
      <div className="w-full max-w-[430px] min-h-[100dvh] bg-background relative flex flex-col sm:border-x sm:border-[#2a2340] sm:shadow-2xl">
        <main className="flex-1 flex flex-col pb-16 relative overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
