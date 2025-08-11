import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ThreeBackground from "@/components/ThreeBackground";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthForm = ({ role }: { role: "citizen" | "officer" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in!");
      navigate(role === "officer" ? "/officer" : "/citizen");
    } catch (e: any) {
      toast.error(e.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Sign up successful. Check your email to confirm.");
    } catch (e: any) {
      toast.error(e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${role}-email`}>{t("email")}</Label>
        <Input id={`${role}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${role}-password`}>{t("password")}</Label>
        <Input id={`${role}-password`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="flex gap-2">
        <Button onClick={signIn} disabled={loading} className="flex-1">{t("sign_in")}</Button>
        <Button onClick={signUp} variant="secondary" disabled={loading} className="flex-1">{t("sign_up")}</Button>
      </div>
    </div>
  );
};

const PhoneAuth = ({ redirectPath = "/" }: { redirectPath?: string }) => {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setOtpSent(true);
      toast.success("OTP sent via SMS");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (error) throw error;
      toast.success("Logged in");
      navigate(redirectPath);
    } catch (e: any) {
      toast.error(e.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="phone">Phone (with country code)</Label>
        <Input id="phone" placeholder="+8801XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {otpSent && (
        <div className="space-y-1">
          <Label htmlFor="otp">OTP Code</Label>
          <Input id="otp" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}
      <div className="flex gap-2">
        {!otpSent ? (
          <Button onClick={requestOtp} disabled={loading || !phone} className="flex-1">Send OTP</Button>
        ) : (
          <Button onClick={verifyOtp} disabled={loading || code.length < 4} className="flex-1">Verify & Login</Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-amber-600">⚠️ SMS provider must be configured in Supabase for OTP to work. For testing, use email login above.</p>
    </div>
  );
};

const Login = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Login – UrbanPulse";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Login to UrbanPulse: citizen and officer access.");
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] relative flex items-center justify-center py-10">
      <ThreeBackground />
      <Card className="glass-surface w-full max-w-md animate-enter">
        <CardHeader>
          <CardTitle className="text-center">{t("login_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="citizen">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="citizen">{t("tab_citizen")}</TabsTrigger>
              <TabsTrigger value="officer">{t("tab_officer")}</TabsTrigger>
            </TabsList>
            <TabsContent value="citizen" className="mt-4">
              <AuthForm role="citizen" />
              <div className="relative my-6">
                <hr className="border-border" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">or</div>
              </div>
              <PhoneAuth redirectPath="/citizen" />
            </TabsContent>
            <TabsContent value="officer" className="mt-4">
              <AuthForm role="officer" />
              <div className="relative my-6">
                <hr className="border-border" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">or</div>
              </div>
              <PhoneAuth redirectPath="/officer" />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground justify-center">
          {t("tagline")}
        </CardFooter>
      </Card>
    </main>
  );
};

export default Login;
