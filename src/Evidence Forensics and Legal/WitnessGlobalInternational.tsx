// WitnessGlobalInternational.tsx
import React, { useState, useEffect } from "react";

// ------------------------------
// SECTION: Types & Interfaces
// ------------------------------
export interface RightsContent {
  country: string;
  code: string;
  summary: string;
  details: string;
  citation: string;
}

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
}

export interface InternationalLawyer {
  id: string;
  name: string;
  country: string;
  city: string;
  phone: string;
  specialties: string[];
}

// Mock rights data
const rightsData: RightsContent[] = [
  {
    country: "Canada",
    code: "CA",
    summary: "Right to record police in public",
    details: "Canadian courts recognize the right to film police as long as you do not interfere.",
    citation: "R. v. Jarvis, 2019 SCC 10",
  },
  {
    country: "United Kingdom",
    code: "GB",
    summary: "Public recording generally permitted",
    details: "You may record in public, but may be stopped if causing an actual obstruction.",
    citation: "Section 43 Terrorism Act (misuse caution)",
  },
  {
    country: "France",
    code: "FR",
    summary: "Recording with privacy restrictions",
    details:
      "Recording is permitted, but publishing images of officers' faces can be legally complex.",
    citation: "Loi sécurité globale",
  },
  {
    country: "United States",
    code: "US",
    summary: "First Amendment Right to Record",
    details: "Citizens have a clear right to record police performing duties in public spaces.",
    citation: "Glik v. Cunniffe",
  },
];

const mockLawyers: InternationalLawyer[] = [
  {
    id: "1",
    name: "Jane Smith",
    country: "Canada",
    city: "Toronto",
    phone: "+14165551234",
    specialties: ["Civil Rights"],
  },
  {
    id: "2",
    name: "David Jones",
    country: "United Kingdom",
    city: "London",
    phone: "+442079460123",
    specialties: ["Human Rights"],
  },
];

const isValidPhone = (phone: string): boolean => /^\+[1-9]\d{1,14}$/.test(phone);

// ------------------------------
// SECTION: Jurisdiction Engine (Location & Laws)
// ------------------------------
export function JurisdictionEngine() {
  const [rights, setRights] = useState<RightsContent>(rightsData[3]); // Default to US
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("United States");

  const handleCountryChange = (name: string) => {
    setCountry(name);
    const found = rightsData.find((r) => r.country === name) || rightsData[3];
    setRights(found);
  };

  const detectLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Mock logic for detection
        const lat = pos.coords.latitude;
        let detected = "United States";
        if (lat > 43 && lat < 50) detected = "Canada";
        if (lat > 50 && lat < 60) detected = "United Kingdom";

        handleCountryChange(detected);
        setLoading(false);
      },
      () => {
        alert("Location access denied. Please select manually.");
        setLoading(false);
      },
    );
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Local Jurisdiction Laws</h3>
      <div className="flex gap-2">
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="flex-1 bg-black border border-gray-700 rounded-lg px-2 py-1 text-sm"
        >
          {rightsData.map((r) => (
            <option key={r.code} value={r.country}>
              {r.country}
            </option>
          ))}
        </select>
        <button onClick={detectLocation} className="bg-gray-800 px-3 py-1 rounded-lg text-xs">
          {loading ? "..." : "GPS"}
        </button>
      </div>

      <div className="bg-black p-3 rounded-lg border border-gray-800">
        <div className="font-bold text-red-400">{rights.summary}</div>
        <p className="text-xs text-gray-400 mt-1">{rights.details}</p>
        <p className="text-[10px] text-gray-600 mt-2 italic">Ref: {rights.citation}</p>
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: International Utilities
// ------------------------------
export function MultiCurrencyDonation() {
  const currencies: Currency[] = [
    { code: "USD", symbol: "$", rate: 1 },
    { code: "EUR", symbol: "€", rate: 0.92 },
    { code: "GBP", symbol: "£", rate: 0.78 },
    { code: "CAD", symbol: "C$", rate: 1.36 },
  ];
  const [amountUSD, setAmountUSD] = useState(10);
  const [currencyCode, setCurrencyCode] = useState("USD");

  const selectedCurrency = currencies.find((c) => c.code === currencyCode) || currencies[0];
  const convertedAmount = amountUSD * selectedCurrency.rate;

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">Support Witness Global</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amountUSD}
          onChange={(e) => setAmountUSD(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-sm"
        />
        <span className="text-xs text-gray-400">USD =</span>
        <select
          value={currencyCode}
          onChange={(e) => setCurrencyCode(e.target.value)}
          className="bg-black border border-gray-700 rounded px-1 py-1 text-sm"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <span className="font-bold text-red-500">
          {selectedCurrency.symbol}
          {convertedAmount.toFixed(2)}
        </span>
      </div>
      <button className="w-full bg-red-600 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition-colors">
        Donate in {selectedCurrency.code}
      </button>
    </div>
  );
}

export function InternationalPhoneValidator() {
  const [phone, setPhone] = useState("");
  const [contacts, setContacts] = useState<string[]>(() => {
    const stored = localStorage.getItem("intl_contacts");
    return stored ? JSON.parse(stored) : [];
  });

  const addContact = () => {
    if (isValidPhone(phone)) {
      const updated = [...contacts, phone];
      setContacts(updated);
      localStorage.setItem("intl_contacts", JSON.stringify(updated));
      setPhone("");
    } else {
      alert("Please use full international format: +[CountryCode][Number]");
    }
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    localStorage.setItem("intl_contacts", JSON.stringify(updated));
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600 space-y-3 text-white">
      <h3 className="font-bold text-red-500">SOS Global Contacts</h3>
      <div className="flex gap-2">
        <input
          placeholder="+1 555 000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 bg-black border border-gray-700 rounded px-3 py-1 text-sm"
        />
        <button onClick={addContact} className="bg-red-600 px-4 py-1 rounded-lg text-sm">
          Add
        </button>
      </div>
      <div className="space-y-2">
        {contacts.map((c, i) => (
          <div
            key={i}
            className="flex justify-between bg-black p-2 rounded text-xs border border-gray-800"
          >
            <span>{c}</span>
            <button onClick={() => removeContact(i)} className="text-red-500 font-bold">
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------
// SECTION: Main Application
// ------------------------------
export default function MainApp() {
  const [tab, setTab] = useState<"laws" | "map" | "donate">("laws");

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-md mx-auto pb-24">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-black text-red-600 tracking-tighter">WITNESS GLOBAL</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest">International Protection</p>
      </header>

      <div className="space-y-6">
        {tab === "laws" && (
          <>
            <JurisdictionEngine />
            <InternationalPhoneValidator />
          </>
        )}

        {tab === "map" && (
          <div className="bg-gray-900 p-6 rounded-xl border-l-4 border-red-600 text-center">
            <div className="text-4xl mb-2">🌍</div>
            <h3 className="font-bold text-red-500">Global Incident Map</h3>
            <p className="text-sm text-gray-400">Map view is loading... (Simulated)</p>
            <div className="mt-4 space-y-2">
              <div className="bg-black p-2 rounded text-xs flex justify-between">
                <span>Toronto, CA</span> <span className="text-red-500">23 Reports</span>
              </div>
              <div className="bg-black p-2 rounded text-xs flex justify-between">
                <span>London, UK</span> <span className="text-red-500">45 Reports</span>
              </div>
            </div>
          </div>
        )}

        {tab === "donate" && (
          <>
            <MultiCurrencyDonation />
            <div className="bg-gray-900 p-4 rounded-xl border-l-4 border-red-600">
              <h3 className="font-bold text-red-500 mb-2 text-sm text-center">
                CERTIFICATE TRANSLATION
              </h3>
              <div className="flex justify-around text-xs">
                <button className="bg-red-600 px-2 py-1 rounded">EN</button>
                <button className="bg-gray-800 px-2 py-1 rounded">ES</button>
                <button className="bg-gray-800 px-2 py-1 rounded">FR</button>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-red-600 flex justify-around py-4">
        <button
          onClick={() => setTab("laws")}
          className={tab === "laws" ? "text-red-500" : "text-gray-500"}
        >
          ⚖️ Laws
        </button>
        <button
          onClick={() => setTab("map")}
          className={tab === "map" ? "text-red-500" : "text-gray-500"}
        >
          🌍 Map
        </button>
        <button
          onClick={() => setTab("donate")}
          className={tab === "donate" ? "text-red-500" : "text-gray-500"}
        >
          💰 Donate
        </button>
      </nav>
    </div>
  );
}
