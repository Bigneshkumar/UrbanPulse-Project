import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const OfficerDashboard = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isOfficer, setIsOfficer] = useState<boolean>(false);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Officer Dashboard – UrbanPulse";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Review citizen issues, resolve with proof and remark, and update status.");
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const officer = (roles || []).some((r: any) => r.role === 'officer' || r.role === 'admin');
      setIsOfficer(officer);
      if (!officer) return;
      const { data: reps, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error) console.error(error);
      if (reps) setReports(reps);
    });
  }, []);

  const handleResolve = async (reportId: string, file: File | null, remark: string) => {
    if (!userId) return;
    if (!file || file.type !== 'image/jpeg') {
      toast({ description: "Upload a JPG proof image.", variant: "destructive" as any });
      return;
    }
    try {
      const path = `${userId}/resolved-${reportId}.jpg`;
      const { error: upErr } = await supabase.storage.from("reports").upload(path, file, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("reports").getPublicUrl(path);
      const resolved_image_url = pub.publicUrl;
      const { error: up } = await supabase
        .from("reports")
        .update({ status: 'resolved', resolved_image_url, resolved_remark: remark })
        .eq('id', reportId);
      if (up) throw up;
      toast({ description: "Report marked as resolved." });
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved', resolved_image_url, resolved_remark: remark } : r)));
    } catch (e: any) {
      console.error(e);
      toast({ description: e.message || "Failed to resolve.", variant: "destructive" as any });
    }
  };

  if (!userId) {
    return (
      <main className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-2">Officer Dashboard</h1>
        <p className="text-muted-foreground">Please sign in to view and resolve reports.</p>
      </main>
    );
  }

  if (!isOfficer) {
    return (
      <main className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-2">Officer Dashboard</h1>
        <p className="text-muted-foreground">Access restricted. Your account is not assigned the officer role.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">All reports</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Card key={r.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                <span className="px-2 py-1 rounded text-xs border">{r.status}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.image_url && <img src={r.image_url} alt="Citizen report image" className="w-full h-48 object-cover rounded" loading="lazy" />}
              <p className="text-sm">{r.description}</p>
              {r.latitude && r.longitude && (
                <a className="text-sm text-primary underline" href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer">View location</a>
              )}
              {r.status !== 'resolved' ? (
                <ResolveForm onResolve={(file, remark) => handleResolve(r.id, file, remark)} />
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium mt-2">Resolution</div>
                  {r.resolved_image_url && <img src={r.resolved_image_url} alt="Resolved proof image" className="w-full h-48 object-cover rounded" loading="lazy" />}
                  <p className="text-sm text-muted-foreground">{r.resolved_remark}</p>
                </div>
              )}
            </CardContent>
            <CardFooter />
          </Card>
        ))}
      </div>
    </main>
  );
};

const ResolveForm = ({ onResolve }: { onResolve: (file: File | null, remark: string) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [remark, setRemark] = useState("");
  const can = useMemo(() => !!file && remark.trim().length > 0, [file, remark]);
  return (
    <div className="space-y-2">
      <Input type="file" accept="image/jpeg,.jpg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Input placeholder="Resolution remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
      <Button onClick={() => onResolve(file, remark)} disabled={!can}>Mark as done</Button>
    </div>
  );
};

export default OfficerDashboard;
