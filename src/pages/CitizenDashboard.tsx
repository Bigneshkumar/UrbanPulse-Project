import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import MapPicker, { Coords } from "@/components/MapPicker";

const CitizenDashboard = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Citizen Dashboard – UrbanPulse";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Submit issues with photo and location, and track their resolution.");
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      supabase
        .from("reports")
        .select("*")
        .eq("created_by", uid)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) console.error(error);
          if (data) setReports(data);
        });
    });
  }, []);

  const canSubmit = useMemo(() => !!userId && !!file && description.trim().length > 5 && !!coords, [userId, file, description, coords]);

  const handleSubmit = async () => {
    if (!userId || !file || !coords) return;
    if (file.type !== "image/jpeg") {
      toast({ description: "Please upload a JPG image.", variant: "destructive" as any });
      return;
    }

    try {
      setLoading(true);
      const filePath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("reports").upload(filePath, file, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("reports").getPublicUrl(filePath);
      const image_url = pub.publicUrl;

      const { error: insErr, data } = await supabase
        .from("reports")
        .insert({
          created_by: userId,
          description,
          image_url,
          latitude: coords.lat,
          longitude: coords.lng,
          address: address ?? null,
        })
        .select();

      if (insErr) throw insErr;
      toast({ description: "Report submitted successfully." });
      setDescription("");
      setFile(null);
      setCoords(null);
      setAddress(undefined);
      if (data) setReports((prev) => [...data, ...prev]);
    } catch (e: any) {
      console.error(e);
      toast({ description: e.message || "Failed to submit report.", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedback = async (reportId: string, rating: number, remark: string) => {
    try {
      const { error } = await supabase.from("reports").update({ rating, citizen_remark: remark }).eq("id", reportId);
      if (error) throw error;
      toast({ description: "Feedback submitted." });
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, rating, citizen_remark: remark } : r)));
    } catch (e: any) {
      console.error(e);
      toast({ description: e.message || "Failed to submit feedback.", variant: "destructive" as any });
    }
  };

  if (!userId) {
    return (
      <main className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-2">Citizen Dashboard</h1>
        <p className="text-muted-foreground">Please sign in to submit and view your reports.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 space-y-8">
      <section aria-labelledby="create-report">
        <h1 id="create-report" className="text-2xl font-semibold mb-4">Create a new report</h1>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Upload a JPG image, add details and pin the location.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm">Problem image (JPG)</label>
                <Input type="file" accept="image/jpeg,.jpg" onChange={(e) => setFile(e.target.files?.[0] || null)} />

                <label className="text-sm">Details</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe the problem in detail..." />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Latitude</label>
                    <Input value={coords?.lat ?? ""} onChange={(e) => setCoords({ lat: Number(e.target.value), lng: coords?.lng ?? 0 })} placeholder="e.g. 22.57" />
                  </div>
                  <div>
                    <label className="text-xs">Longitude</label>
                    <Input value={coords?.lng ?? ""} onChange={(e) => setCoords({ lng: Number(e.target.value), lat: coords?.lat ?? 0 })} placeholder="e.g. 88.36" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <MapPicker
                  value={coords ?? undefined}
                  onChange={(c) => { setCoords({ lat: c.lat, lng: c.lng }); setAddress(c.address); }}
                />
                {address && <div className="text-xs text-muted-foreground">Address: {address}</div>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleSubmit} disabled={!canSubmit || loading}>{loading ? "Submitting..." : "Submit report"}</Button>
          </CardFooter>
        </Card>
      </section>

      <section aria-labelledby="my-reports" className="space-y-4">
        <h2 id="my-reports" className="text-xl font-semibold">My reports</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  <span className="px-2 py-1 rounded text-xs border">{r.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.image_url && (
                  <img src={r.image_url} alt="Citizen report image" className="w-full h-48 object-cover rounded" loading="lazy" />
                )}
                <p className="text-sm">{r.description}</p>
                {r.latitude && r.longitude && (
                  <a className="text-sm text-primary underline" href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noreferrer">View location</a>
                )}
                {r.status === 'resolved' && r.resolved_image_url && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium mt-2">Resolution</div>
                    <img src={r.resolved_image_url} alt="Resolved proof image" className="w-full h-48 object-cover rounded" loading="lazy" />
                    <p className="text-sm text-muted-foreground">{r.resolved_remark}</p>
                  </div>
                )}
              </CardContent>
              {r.status === 'resolved' && !r.rating && (
                <CardFooter>
                  <FeedbackForm onSubmit={(rating, remark) => updateFeedback(r.id, rating, remark)} />
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
};

const FeedbackForm = ({ onSubmit }: { onSubmit: (rating: number, remark: string) => void }) => {
  const [rating, setRating] = useState(5);
  const [remark, setRemark] = useState("");
  return (
    <div className="w-full flex flex-col sm:flex-row gap-2 items-start">
      <select
        aria-label="Rating"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
      >
        {[5,4,3,2,1].map((n) => (
          <option key={n} value={n}>{n} ★</option>
        ))}
      </select>
      <Input placeholder="Your remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
      <Button onClick={() => onSubmit(rating, remark)} disabled={remark.trim().length === 0}>Submit feedback</Button>
    </div>
  );
};

export default CitizenDashboard;
