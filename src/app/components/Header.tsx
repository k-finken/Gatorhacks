export default function Header({ className }: { className?: string }) {
  return (
    <header
      className={`flex items-center justify-center text-gray-200 text-2xl ${className}`}
    >
      <h1 className="text-4xl font-semibold">Verizon GPT</h1>
    </header>
  );
}
