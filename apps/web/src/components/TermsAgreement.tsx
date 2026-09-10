import { Link } from "react-router-dom";

export function TermsAgreement({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>
        I agree to the{" "}
        <Link to="/terms" target="_blank" className="text-indigo-600 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" target="_blank" className="text-indigo-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
