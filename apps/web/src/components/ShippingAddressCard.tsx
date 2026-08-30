import { useEffect, useState, type FormEvent } from "react";
import type { MyAddress } from "@todays-merit/shared-types";
import { ApiClientError, meApi } from "../api/client";
import { Button, Card, Input } from "./ui";

export function ShippingAddressCard() {
  const [address, setAddress] = useState<MyAddress | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    meApi.address().then((a) => {
      setAddress(a);
      setName(a.shippingName ?? "");
      setLine1(a.shippingAddressLine1 ?? "");
      setLine2(a.shippingAddressLine2 ?? "");
      setCity(a.shippingCity ?? "");
      setState(a.shippingState ?? "");
      setPostalCode(a.shippingPostalCode ?? "");
      setCountry(a.shippingCountry ?? "");
      if (!a.isComplete) setIsEditing(true);
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const updated = await meApi.updateAddress({
        shippingName: name,
        shippingAddressLine1: line1,
        shippingAddressLine2: line2 || undefined,
        shippingCity: city,
        shippingState: state || undefined,
        shippingPostalCode: postalCode,
        shippingCountry: country,
      });
      setAddress(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  if (!address) return null;

  return (
    <Card className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Shipping address</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-indigo-600 hover:underline">
            Edit
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Used to send you physical swag when an organization sends you something.
      </p>

      {!isEditing && (
        <div className="mt-3 text-sm text-slate-700">
          {address.isComplete ? (
            <>
              <div>{address.shippingName}</div>
              <div>{address.shippingAddressLine1}</div>
              {address.shippingAddressLine2 && <div>{address.shippingAddressLine2}</div>}
              <div>
                {address.shippingCity}
                {address.shippingState ? `, ${address.shippingState}` : ""} {address.shippingPostalCode}
              </div>
              <div>{address.shippingCountry}</div>
            </>
          ) : (
            <p className="text-slate-500">No shipping address on file yet.</p>
          )}
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSave} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            placeholder="Address line 1"
            required
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            placeholder="Address line 2 (optional)"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            className="sm:col-span-2"
          />
          <Input placeholder="City" required value={city} onChange={(e) => setCity(e.target.value)} />
          <Input placeholder="State / province" value={state} onChange={(e) => setState(e.target.value)} />
          <Input placeholder="Postal code" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          <Input placeholder="Country" required value={country} onChange={(e) => setCountry(e.target.value)} />
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save address"}
            </Button>
            {address.isComplete && (
              <Button type="button" variant="text" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        </form>
      )}
    </Card>
  );
}
