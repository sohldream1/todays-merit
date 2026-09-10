import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Today's Merit</span>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-slate-700">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-slate-700">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
