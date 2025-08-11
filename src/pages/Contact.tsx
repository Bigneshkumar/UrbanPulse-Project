import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, MapPin } from "lucide-react";

const OFFICER_CONTACTS: Record<string, { name: string; phone: string; email: string }> = {
  Dhaka: { name: "Duty Officer - Dhaka", phone: "+880 1XXX-XXXXXX", email: "officer.dhaka@example.gov" },
  Chattogram: { name: "Duty Officer - Chattogram", phone: "+880 1XXX-XXXXXX", email: "officer.ctg@example.gov" },
  Sylhet: { name: "Duty Officer - Sylhet", phone: "+880 1XXX-XXXXXX", email: "officer.sylhet@example.gov" },
};

const MAINTENANCE = {
  name: "Website Maintenance Team",
  phone: "+880 1XXX-XXXXXX",
  email: "maintenance@city.gov.example",
};

const Contact = () => {
  const [locality, setLocality] = useState<keyof typeof OFFICER_CONTACTS>("Dhaka");
  const officer = useMemo(() => OFFICER_CONTACTS[locality], [locality]);

  useEffect(() => {
    document.title = `Contact | Civic Services Portal`;
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Contact – City Services</h1>
        <p className="text-muted-foreground mt-2">Find maintenance team details and your locality officer contacts.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border p-6 bg-background/60">
          <h2 className="text-xl font-medium mb-4">Website Maintenance Team</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {MAINTENANCE.phone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {MAINTENANCE.email}</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">For technical issues with the portal.</p>
        </article>

        <article className="rounded-lg border p-6 bg-background/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Officer Contact by Locality</h2>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <select
                aria-label="Select locality"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={locality}
                onChange={(e) => setLocality(e.target.value as keyof typeof OFFICER_CONTACTS)}
              >
                {Object.keys(OFFICER_CONTACTS).map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="font-medium">{officer.name}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {officer.phone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {officer.email}</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Need real contacts for your regions? Share them and I’ll wire them in.</p>
        </article>
      </section>
    </main>
  );
};

export default Contact;
