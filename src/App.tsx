import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Receipt, 
  Settings, 
  LogOut, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  ChevronRight,
  CreditCard,
  PieChart,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Box,
  ShieldCheck,
  Building2,
  History,
  Database,
  X,
  Terminal
} from "lucide-react";
import { 
  db 
} from "./firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
  deleteField
} from "firebase/firestore";
import { 
  UserProfile, 
  Organization, 
  Customer, 
  Product, 
  Invoice, 
  Expense, 
  Payment,
  InvoiceItem,
  InventoryLog,
  Inventory
} from "./types";
import { generateInvoicePDF } from "./services/invoiceService";
import { format, addDays } from "date-fns";
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = "dashboard" | "customers" | "products" | "inventory" | "invoices" | "expenses" | "team" | "settings" | "admin";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [showSignup, setShowSignup] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

  const [twoFactorVerified, setTwoFactorVerified] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: otp, 3: success

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginType, setLoginType] = useState<"consumer" | "developer">("consumer");
  const isPlatformOwner = user?.uid === "master";

  useEffect(() => {
    // Check local storage for session
    const savedSession = localStorage.getItem("aculedger_session");
    if (savedSession === "master") {
      const masterUser = { uid: "master", email: "shiftx.gg@gmail.com", displayName: "Master Admin" };
      setUser(masterUser);
      setProfile({
        uid: "master",
        name: "Master Admin",
        email: "shiftx.gg@gmail.com",
        role: "admin",
        organizationId: "master_org",
        onboardingCompleted: true
      });
      setOrg({
        id: "master_org",
        name: "AcuLedger Master Org",
        businessType: "Other",
        primaryContactName: "Master Admin",
        email: "shiftx.gg@gmail.com",
        phoneNumber: "",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        ownerUid: "master",
        createdAt: new Date().toISOString(),
        subscriptionStatus: "active",
        onboardingStatus: "completed",
        accountStatus: "active"
      });
      setTwoFactorVerified(true);
      setEmailOtpVerified(true);
      setLoading(false);
    } else if (savedSession) {
      const fetchUser = async () => {
        try {
          const profileDoc = await getDoc(doc(db, "users", savedSession));
          if (profileDoc.exists()) {
            const p = profileDoc.data() as UserProfile;
            setUser({ uid: savedSession, email: p.email, displayName: p.name });
            setProfile(p);
            const orgDoc = await getDoc(doc(db, "organizations", p.organizationId));
            if (orgDoc.exists()) {
              const o = { id: orgDoc.id, ...orgDoc.data() } as Organization;
              setOrg(o);
              if (!o.twoFactorEnabled) setTwoFactorVerified(true);
              if (!o.emailOtpEnabled) {
                setEmailOtpVerified(true);
              } else {
                sendEmailOtp(p.email, "login");
              }
              if (!p.onboardingCompleted) setOnboardingStep(1);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Real-time data listeners
  useEffect(() => {
    if (!profile?.organizationId) return;

    const qCustomers = query(collection(db, "customers"), where("organizationId", "==", profile.organizationId));
    const unsubCustomers = onSnapshot(qCustomers, (s) => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));

    const qProducts = query(collection(db, "products"), where("organizationId", "==", profile.organizationId));
    const unsubProducts = onSnapshot(qProducts, (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product))));

    const qInventory = query(collection(db, "inventory"), where("organizationId", "==", profile.organizationId));
    const unsubInventory = onSnapshot(qInventory, (s) => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() } as Inventory))));

    const qInvoices = query(collection(db, "invoices"), where("organizationId", "==", profile.organizationId));
    const unsubInvoices = onSnapshot(qInvoices, (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))));

    const qExpenses = query(collection(db, "expenses"), where("organizationId", "==", profile.organizationId));
    const unsubExpenses = onSnapshot(qExpenses, (s) => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))));

    const qTeam = query(collection(db, "users"), where("organizationId", "==", profile.organizationId));
    const unsubTeam = onSnapshot(qTeam, (s) => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as any as UserProfile))));

    const qLogs = query(collection(db, "inventory_logs"), where("organizationId", "==", profile.organizationId), orderBy("date", "desc"), limit(50));
    const unsubLogs = onSnapshot(qLogs, (s) => setInventoryLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as InventoryLog))));

    let unsubOrgs = () => {};
    if (isPlatformOwner) {
      unsubOrgs = onSnapshot(collection(db, "organizations"), (s) => setAllOrgs(s.docs.map(d => ({ id: d.id, ...d.data() } as Organization))));
    }

    return () => {
      unsubCustomers();
      unsubProducts();
      unsubInventory();
      unsubInvoices();
      unsubExpenses();
      unsubTeam();
      unsubLogs();
      unsubOrgs();
    };
  }, [profile?.organizationId, isPlatformOwner]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginType === "developer") {
      if (loginEmail === "shiftx.gg@gmail.com" && loginPassword === "Adithya@ruas2024") {
        localStorage.setItem("aculedger_session", "master");
        const masterUser = { uid: "master", email: "shiftx.gg@gmail.com", displayName: "Master Admin" };
        setUser(masterUser);
        setProfile({
          uid: "master",
          name: "Master Admin",
          email: "shiftx.gg@gmail.com",
          role: "admin",
          organizationId: "master_org",
          onboardingCompleted: true
        });
        setOrg({
          id: "master_org",
          name: "AcuLedger Master Org",
          businessType: "Other",
          primaryContactName: "Master Admin",
          email: "shiftx.gg@gmail.com",
          phoneNumber: "",
          termsAccepted: true,
          privacyPolicyAccepted: true,
          ownerUid: "master",
          createdAt: new Date().toISOString(),
          subscriptionStatus: "active",
          onboardingStatus: "completed",
          accountStatus: "active"
        });
        setTwoFactorVerified(true);
        setEmailOtpVerified(true);
        setOnboardingStep(null);
      } else {
        alert("Invalid Developer Credentials. Please try again.");
      }
    } else {
      try {
        const q = query(collection(db, "users"), where("email", "==", loginEmail), where("password", "==", loginPassword), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const p = userDoc.data() as UserProfile;
          localStorage.setItem("aculedger_session", userDoc.id);
          setUser({ uid: userDoc.id, email: p.email, displayName: p.name });
          setProfile(p);
          
          const orgDoc = await getDoc(doc(db, "organizations", p.organizationId));
          if (orgDoc.exists()) {
            const o = { id: orgDoc.id, ...orgDoc.data() } as Organization;
            setOrg(o);
            if (!o.twoFactorEnabled) setTwoFactorVerified(true);
            if (!o.emailOtpEnabled) {
              setEmailOtpVerified(true);
            } else {
              sendEmailOtp(p.email, "login");
            }
            if (!p.onboardingCompleted) setOnboardingStep(1);
          }
        } else {
          alert("Invalid email or password.");
        }
      } catch (e) {
        console.error("Login failed", e);
        alert("Login failed. Please try again.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aculedger_session");
    setUser(null);
    setProfile(null);
    setOrg(null);
    setTwoFactorVerified(false);
    setEmailOtpVerified(false);
    setOnboardingStep(null);
  };

  const handleSignupComplete = async (signupData: any) => {
    const newUid = "user_" + Math.random().toString(36).substring(2, 15);
    
    const orgRef = await addDoc(collection(db, "organizations"), {
      name: signupData.businessName,
      businessType: signupData.businessType,
      primaryContactName: signupData.primaryContactName,
      email: signupData.email,
      phoneNumber: signupData.phoneNumber,
      termsAccepted: signupData.termsAccepted,
      privacyPolicyAccepted: signupData.privacyPolicyAccepted,
      ownerUid: newUid,
      createdAt: new Date().toISOString(),
      subscriptionStatus: "pending_approval",
      onboardingStatus: "in_progress",
      accountStatus: "pending_verification",
      twoFactorEnabled: false,
      emailOtpEnabled: false,
      razorpaySkipped: false
    });
    
    const newProfile: any = {
      uid: newUid,
      name: signupData.primaryContactName,
      email: signupData.email,
      password: signupData.password,
      role: "admin",
      organizationId: orgRef.id,
      onboardingCompleted: false
    };
    
    await setDoc(doc(db, "users", newUid), newProfile);
    
    localStorage.setItem("aculedger_session", newUid);
    setUser({ uid: newUid, email: signupData.email, displayName: signupData.primaryContactName });
    setProfile(newProfile);
    const orgDoc = await getDoc(doc(db, "organizations", orgRef.id));
    if (orgDoc.exists()) {
      setOrg({ id: orgDoc.id, ...orgDoc.data() } as Organization);
    }
    
    setShowSignup(false);
    setTempUser(null);
    setOnboardingStep(1);
    setTwoFactorVerified(true);
    setEmailOtpVerified(true);
  };

  const sendEmailOtp = async (email: string, type: "login" | "password_reset" | "email_verification") => {
    setSendingOtp(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins
    
    await addDoc(collection(db, "otps"), {
      email,
      otp,
      expiresAt,
      type
    });
    
    // In a real app, you'd trigger a cloud function to send the email.
    // For this demo, we'll log it and show a toast/alert.
    console.log(`[MOCK EMAIL] To: ${email}, OTP: ${otp}, Type: ${type}`);
    alert(`A verification code has been sent to ${email}. (Check console for code in this demo)`);
    setSendingOtp(false);
  };

  const verifyEmailOtp = async () => {
    if (!user?.email) return;
    const q = query(
      collection(db, "otps"), 
      where("email", "==", user.email), 
      where("otp", "==", otpInput),
      where("type", "==", "login"),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const otpDoc = snapshot.docs[0];
      const data = otpDoc.data();
      if (new Date(data.expiresAt) > new Date()) {
        setEmailOtpVerified(true);
        await deleteDoc(doc(db, "otps", otpDoc.id));
      } else {
        alert("OTP expired");
      }
    } else {
      alert("Invalid OTP");
    }
  };

  const verifyPin = () => {
    if (pinInput === org?.twoFactorPin) {
      setTwoFactorVerified(true);
    } else {
      alert("Invalid PIN");
    }
  };

  const verifyResetOtp = async () => {
    const q = query(
      collection(db, "otps"), 
      where("email", "==", resetEmail), 
      where("otp", "==", resetOtp),
      where("type", "==", "password_reset"),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setResetStep(3);
      await deleteDoc(doc(db, "otps", snapshot.docs[0].id));
    } else {
      alert("Invalid OTP");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-stone-50">Loading AcuLedger...</div>;

  if (showSignup) {
    return <SignupView onComplete={handleSignupComplete} onCancel={() => { setShowSignup(false); setTempUser(null); handleLogout(); }} />;
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <div className="max-w-[450px] w-full bg-white p-10 rounded-lg border border-stone-200 text-center shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-[#1a73e8] rounded-full flex items-center justify-center">
              <Receipt className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Sign in</h1>
          <p className="text-stone-600 mb-6">to continue to AcuLedger</p>
          
          <div className="flex bg-stone-100 p-1 rounded-lg mb-6">
            <button 
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${loginType === 'consumer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              onClick={() => setLoginType('consumer')}
            >
              Consumer
            </button>
            <button 
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${loginType === 'developer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
              onClick={() => setLoginType('developer')}
            >
              Developer
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Email Address" 
              className="w-full p-3 border border-stone-200 rounded-xl"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full p-3 border border-stone-200 rounded-xl"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="w-full py-2.5 px-4 bg-[#1a73e8] text-white rounded font-medium hover:bg-[#1557b0] transition-colors flex items-center justify-center gap-3"
            >
              Sign in
            </button>
          </form>

          {loginType === 'consumer' && (
            <div className="mt-6 flex flex-col gap-3">
              <button 
                onClick={() => setShowSignup(true)}
                className="text-sm text-stone-600 font-medium hover:text-stone-900"
              >
                Don't have an account? Register
              </button>
              <button 
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#1a73e8] font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {showForgotPassword && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-left">
                <h4 className="text-xl font-bold mb-4">Password Reset</h4>
                
                {resetStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-stone-500">Enter your email to receive a password reset OTP.</p>
                    <input 
                      type="email" 
                      placeholder="Email address" 
                      className="w-full p-3 border border-stone-200 rounded-xl"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <button onClick={() => setShowForgotPassword(false)} className="flex-1 py-3 border border-stone-200 rounded-xl">Cancel</button>
                      <button 
                        onClick={() => {
                          if (resetEmail) {
                            sendEmailOtp(resetEmail, "password_reset");
                            setResetStep(2);
                          }
                        }}
                        className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl"
                      >
                        Send OTP
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-stone-500">Enter the 6-digit OTP sent to {resetEmail}</p>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      className="w-full p-3 border border-stone-200 rounded-xl text-center text-2xl tracking-widest"
                      value={resetOtp}
                      onChange={e => setResetOtp(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <button onClick={() => setResetStep(1)} className="flex-1 py-3 border border-stone-200 rounded-xl">Back</button>
                      <button 
                        onClick={verifyResetOtp}
                        className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl"
                      >
                        Verify OTP
                      </button>
                    </div>
                  </div>
                )}

                {resetStep === 3 && (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <TrendingUp size={24} />
                    </div>
                    <p className="text-stone-900 font-medium">OTP Verified!</p>
                    <p className="text-sm text-stone-500">In a real app, you would now be prompted to enter a new password.</p>
                    <button 
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetStep(1);
                        setResetEmail("");
                        setResetOtp("");
                      }}
                      className="w-full py-3 bg-[#1a73e8] text-white rounded-xl"
                    >
                      Back to Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-10 text-left">
            <p className="text-xs text-stone-500 leading-relaxed">
              Not your computer? Use Guest mode to sign in privately.
              <a href="#" className="text-[#1a73e8] font-medium ml-1">Learn more</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (org?.subscriptionStatus === "pending_approval" && !isPlatformOwner) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <div className="max-w-[450px] w-full bg-white p-10 rounded-lg border border-stone-200 text-center shadow-sm">
          <AlertCircle className="text-[#f29900] w-12 h-12 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Awaiting Approval</h1>
          <p className="text-stone-600 mb-8">Your account is currently under review. You will receive an email once your trial is active.</p>
          <button onClick={handleLogout} className="text-[#1a73e8] font-medium hover:underline">Sign Out</button>
        </div>
      </div>
    );
  }

  if (onboardingStep !== null) {
    return (
      <OnboardingModule 
        user={user} 
        org={org!} 
        step={onboardingStep} 
        setStep={setOnboardingStep} 
        onComplete={async () => {
          await updateDoc(doc(db, "users", user.uid), { onboardingCompleted: true });
          setProfile(prev => prev ? { ...prev, onboardingCompleted: true } : null);
          setOnboardingStep(null);
        }}
      />
    );
  }

  if (org?.emailOtpEnabled && !emailOtpVerified) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <div className="max-w-[450px] w-full bg-white p-10 rounded-lg border border-stone-200 text-center shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-[#1a73e8] rounded-full flex items-center justify-center">
              <FileText className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Email Verification</h1>
          <p className="text-stone-600 mb-8">Enter the 6-digit code sent to <strong>{user.email}</strong></p>
          
          <div className="space-y-4 mb-8">
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              className="w-full h-14 text-center text-3xl tracking-[0.5em] border border-stone-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
            />
            <button 
              onClick={() => sendEmailOtp(user.email, "login")}
              disabled={sendingOtp}
              className="text-sm text-[#1a73e8] font-medium hover:underline disabled:opacity-50"
            >
              {sendingOtp ? "Sending..." : "Resend code"}
            </button>
          </div>

          <button 
            onClick={verifyEmailOtp} 
            className="w-full py-2.5 bg-[#1a73e8] text-white rounded font-medium hover:bg-[#1557b0] transition-colors mb-4"
          >
            Verify
          </button>
          
          <button onClick={handleLogout} className="text-stone-500 hover:text-stone-700 text-sm">Sign Out</button>
        </div>
      </div>
    );
  }

  if (org?.twoFactorEnabled && !twoFactorVerified) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
        <div className="max-w-[450px] w-full bg-white p-10 rounded-lg border border-stone-200 text-center shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-[#1a73e8] rounded-full flex items-center justify-center">
              <Settings className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">2-Step Verification</h1>
          <p className="text-stone-600 mb-8">AcuLedger wants to make sure it's really you. Enter your 4-digit security PIN.</p>
          
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                type="password"
                maxLength={1}
                className="w-12 h-14 text-center text-2xl border border-stone-300 rounded-lg focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none"
                value={pinInput[i] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d?$/.test(val)) {
                    const newPin = pinInput.split("");
                    newPin[i] = val;
                    setPinInput(newPin.join(""));
                    if (val && e.target.nextSibling) {
                      (e.target.nextSibling as HTMLInputElement).focus();
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !pinInput[i] && (e.target as HTMLInputElement).previousSibling) {
                    ((e.target as HTMLInputElement).previousSibling as HTMLInputElement).focus();
                  }
                }}
              />
            ))}
          </div>

          <button 
            onClick={verifyPin} 
            className="w-full py-2.5 bg-[#1a73e8] text-white rounded font-medium hover:bg-[#1557b0] transition-colors mb-4"
          >
            Verify
          </button>
          
          <div className="flex justify-between items-center text-sm">
            <button className="text-[#1a73e8] font-medium hover:underline">Try another way</button>
            <button onClick={handleLogout} className="text-stone-500 hover:text-stone-700">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-stone-200 flex flex-col pt-4">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a73e8] rounded flex items-center justify-center">
            <Receipt className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-medium text-stone-700 tracking-tight">AcuLedger</span>
        </div>

        <nav className="flex-1 pr-4 space-y-0.5">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={currentView === "dashboard"} onClick={() => setCurrentView("dashboard")} />
          <SidebarItem icon={<Users size={20}/>} label="Customers" active={currentView === "customers"} onClick={() => setCurrentView("customers")} />
          <SidebarItem icon={<Package size={20}/>} label="Products" active={currentView === "products"} onClick={() => setCurrentView("products")} />
          <SidebarItem icon={<TrendingUp size={20}/>} label="Inventory" active={currentView === "inventory"} onClick={() => setCurrentView("inventory")} />
          <SidebarItem icon={<FileText size={20}/>} label="Invoices" active={currentView === "invoices"} onClick={() => setCurrentView("invoices")} />
          <SidebarItem icon={<Receipt size={20}/>} label="Expenses" active={currentView === "expenses"} onClick={() => setCurrentView("expenses")} />
          <SidebarItem icon={<Users size={20}/>} label="Team" active={currentView === "team"} onClick={() => setCurrentView("team")} />
          <div className="my-4 border-t border-stone-100 mx-4" />
          {isPlatformOwner && <SidebarItem icon={<Terminal size={20}/>} label="Developer Master" active={currentView === "developer"} onClick={() => setCurrentView("developer")} />}
          <SidebarItem icon={<Settings size={20}/>} label="Settings" active={currentView === "settings"} onClick={() => setCurrentView("settings")} />
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs">
              {user?.displayName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{user?.displayName}</p>
              <p className="text-xs text-stone-500 truncate">{org?.name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa]">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search AcuLedger..." 
                className="w-full bg-[#f1f3f4] border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#1a73e8] outline-none transition-all"
              />
              <Users className="absolute left-3 top-2.5 text-stone-400" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors">
              <AlertCircle size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
              {user?.displayName?.[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === "dashboard" && <DashboardView invoices={invoices} customers={customers} products={products} inventory={inventory} />}
            {currentView === "customers" && <CustomersView customers={customers} orgId={profile?.organizationId || ""} />}
            {currentView === "products" && <ProductsView products={products} orgId={profile?.organizationId || ""} />}
            {currentView === "inventory" && <InventoryView inventory={inventory} logs={inventoryLogs} products={products} orgId={profile?.organizationId || ""} />}
            {currentView === "invoices" && <InvoicesView invoices={invoices} customers={customers} products={products} org={org} orgId={profile?.organizationId || ""} />}
            {currentView === "expenses" && <ExpensesView expenses={expenses} orgId={profile?.organizationId || ""} />}
            {currentView === "team" && <TeamView org={org} />}
            {currentView === "developer" && isPlatformOwner && <DeveloperMasterView orgs={allOrgs} />}
            {currentView === "settings" && <SettingsView org={org} setOrg={setOrg} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "sidebar-item",
        active && "sidebar-active"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// --- Signup View ---
function SignupView({ onComplete, onCancel }: { onComplete: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "Sole Proprietor",
    primaryContactName: "",
    email: "",
    password: "",
    phoneNumber: "",
    termsAccepted: false,
    privacyPolicyAccepted: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termsAccepted || !formData.privacyPolicyAccepted) {
      alert("Please accept the terms and privacy policy.");
      return;
    }
    onComplete(formData);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-4">
      <div className="max-w-[500px] w-full bg-white p-10 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-[#1a73e8] rounded-full flex items-center justify-center">
            <Receipt className="text-white w-6 h-6" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 mb-2 text-center">Business Registration</h1>
        <p className="text-stone-600 mb-8 text-center text-sm">Fill in the required details to get started.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Business Name</label>
            <input 
              type="text" 
              required 
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
              value={formData.businessName}
              onChange={e => setFormData({...formData, businessName: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Business Type</label>
            <select 
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
              value={formData.businessType}
              onChange={e => setFormData({...formData, businessType: e.target.value})}
            >
              <option value="Sole Proprietor">Sole Proprietor</option>
              <option value="Partnership">Partnership</option>
              <option value="LLP">LLP</option>
              <option value="Private Limited">Private Limited</option>
              <option value="Public Limited">Public Limited</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Contact Name</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                value={formData.primaryContactName}
                onChange={e => setFormData({...formData, primaryContactName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Phone Number</label>
              <input 
                type="tel" 
                required 
                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                value={formData.phoneNumber}
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-[#1a73e8]" 
                checked={formData.termsAccepted}
                onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}
              />
              <span className="text-sm text-stone-600">I accept the <a href="#" className="text-[#1a73e8] hover:underline">Terms of Service</a></span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-[#1a73e8]" 
                checked={formData.privacyPolicyAccepted}
                onChange={e => setFormData({...formData, privacyPolicyAccepted: e.target.checked})}
              />
              <span className="text-sm text-stone-600">I accept the <a href="#" className="text-[#1a73e8] hover:underline">Privacy Policy</a></span>
            </label>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl font-medium hover:bg-[#1557b0] transition-colors shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function OnboardingModule({ user, org, step, setStep, onComplete }: { user: any, org: Organization, step: number, setStep: (s: number) => void, onComplete: () => void }) {
  const [employees, setEmployees] = useState<{name: string, email: string, role: string}[]>([]);
  const [newEmp, setNewEmp] = useState({ name: "", email: "", role: "accountant" });
  const [security, setSecurity] = useState({ pin: "", emailOtp: false });
  const [razorpay, setRazorpay] = useState({ keyId: "", keySecret: "", skip: false });
  
  // Optional Fields State
  const [optionalData, setOptionalData] = useState({
    legalBusinessName: org.legalBusinessName || "",
    industryCategory: org.industryCategory || "",
    businessDescription: org.businessDescription || "",
    gstNumber: org.gstNumber || "",
    panNumber: org.panNumber || "",
    registeredAddress: org.registeredAddress || "",
    websiteUrl: org.websiteUrl || ""
  });

  const handleNext = async () => {
    if (step === 1) {
      await updateDoc(doc(db, "organizations", org.id!), {
        legalBusinessName: optionalData.legalBusinessName,
        industryCategory: optionalData.industryCategory,
        businessDescription: optionalData.businessDescription,
        onboardingStatus: "in_progress"
      });
      setStep(2);
    } else if (step === 2) {
      await updateDoc(doc(db, "organizations", org.id!), {
        gstNumber: optionalData.gstNumber,
        panNumber: optionalData.panNumber
      });
      setStep(3);
    } else if (step === 3) {
      await updateDoc(doc(db, "organizations", org.id!), {
        registeredAddress: optionalData.registeredAddress,
        websiteUrl: optionalData.websiteUrl
      });
      setStep(4);
    } else if (step === 4) {
      // Register employees
      for (const emp of employees) {
        // Create a pending user profile for the employee
        // In a real app, this would trigger an invitation email
        const empId = `pending_${emp.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
        await setDoc(doc(db, "users", empId), {
          name: emp.name,
          email: emp.email,
          role: emp.role,
          organizationId: org.id,
          onboardingCompleted: false,
          accountStatus: "pending_invitation",
          createdAt: new Date().toISOString()
        });
        console.log(`Invited employee: ${emp.name} (${emp.email}) as ${emp.role}`);
      }
      setStep(5);
    } else if (step === 5) {
      await updateDoc(doc(db, "organizations", org.id!), {
        twoFactorEnabled: security.pin.length === 4,
        twoFactorPin: security.pin,
        emailOtpEnabled: security.emailOtp
      });
      setStep(6);
    } else if (step === 6) {
      await updateDoc(doc(db, "organizations", org.id!), {
        razorpayKeyId: razorpay.keyId,
        razorpayKeySecret: razorpay.keySecret,
        razorpaySkipped: razorpay.skip,
        onboardingStatus: "completed"
      });
      onComplete();
    }
  };

  const totalSteps = 6;

  return (
    <div className="h-screen flex items-center justify-center bg-[#f8f9fa] p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Business Onboarding</h2>
            <p className="text-sm text-stone-500">Step {step} of {totalSteps}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={cn("w-6 h-1 rounded-full", (i + 1) <= step ? "bg-[#1a73e8]" : "bg-stone-200")} />
            ))}
          </div>
        </div>

        <div className="p-8 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#e8f0fe] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="text-[#1a73e8] w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium">Business Information</h3>
                <p className="text-stone-500 text-sm">Tell us more about your company (Optional).</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Legal Business Name</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    value={optionalData.legalBusinessName}
                    onChange={e => setOptionalData({...optionalData, legalBusinessName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Industry Category</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    value={optionalData.industryCategory}
                    onChange={e => setOptionalData({...optionalData, industryCategory: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Business Description</label>
                  <textarea 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    rows={3}
                    value={optionalData.businessDescription}
                    onChange={e => setOptionalData({...optionalData, businessDescription: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Registration Details</h3>
              <p className="text-sm text-stone-500">Provide your tax and registration numbers (Optional).</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">GST Number</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    value={optionalData.gstNumber}
                    onChange={e => setOptionalData({...optionalData, gstNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">PAN Number</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    value={optionalData.panNumber}
                    onChange={e => setOptionalData({...optionalData, panNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Address & Contact</h3>
              <p className="text-sm text-stone-500">Where can customers find you? (Optional).</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Registered Address</label>
                  <textarea 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    rows={2}
                    value={optionalData.registeredAddress}
                    onChange={e => setOptionalData({...optionalData, registeredAddress: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Website URL</label>
                  <input 
                    type="url" 
                    className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a73e8] outline-none"
                    value={optionalData.websiteUrl}
                    onChange={e => setOptionalData({...optionalData, websiteUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Register Employees</h3>
              <p className="text-sm text-stone-500">Add team members and assign roles for collaborative billing.</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    className="p-2 border rounded-lg text-sm"
                    value={newEmp.name}
                    onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    className="p-2 border rounded-lg text-sm"
                    value={newEmp.email}
                    onChange={e => setNewEmp({...newEmp, email: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 p-2 border rounded-lg text-sm"
                      value={newEmp.role}
                      onChange={e => setNewEmp({...newEmp, role: e.target.value})}
                    >
                      <option value="accountant">Accountant</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button 
                      onClick={() => {
                        if (newEmp.name && newEmp.email) {
                          setEmployees([...employees, newEmp]);
                          setNewEmp({ name: "", email: "", role: "accountant" });
                        }
                      }}
                      className="p-2 bg-[#1a73e8] text-white rounded-lg"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {employees.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                        <p className="text-xs text-stone-500">{emp.email}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-stone-200 rounded-full uppercase font-bold">{emp.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Secure Your Account</h3>
              <p className="text-sm text-stone-500">Enable advanced security features to protect your financial data.</p>
              
              <div className="space-y-6">
                <div className="p-4 border border-stone-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-stone-100 rounded-lg"><Settings size={20}/></div>
                      <div>
                        <p className="text-sm font-medium">4-Digit Security PIN</p>
                        <p className="text-xs text-stone-500">Required on every login</p>
                      </div>
                    </div>
                    <input 
                      type="password" 
                      maxLength={4}
                      placeholder="PIN"
                      className="w-20 p-2 border rounded-lg text-center tracking-widest"
                      value={security.pin}
                      onChange={e => setSecurity({...security, pin: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-4 border border-stone-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-100 rounded-lg"><FileText size={20}/></div>
                    <div>
                      <p className="text-sm font-medium">Email OTP Verification</p>
                      <p className="text-xs text-stone-500">Send a code to your email on login</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSecurity({...security, emailOtp: !security.emailOtp})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      security.emailOtp ? "bg-[#1a73e8]" : "bg-stone-300"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", security.emailOtp ? "right-1" : "left-1")} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Payment Integration</h3>
              <p className="text-sm text-stone-500">Connect Razorpay to accept online payments from your customers.</p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm">
                  <AlertCircle size={16} />
                  <span>You can skip this now and set it up later in Settings.</span>
                </div>

                {!razorpay.skip && (
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Razorpay Key ID" 
                      className="w-full p-3 border border-stone-200 rounded-xl"
                      value={razorpay.keyId}
                      onChange={e => setRazorpay({...razorpay, keyId: e.target.value})}
                    />
                    <input 
                      type="password" 
                      placeholder="Razorpay Key Secret" 
                      className="w-full p-3 border border-stone-200 rounded-xl"
                      value={razorpay.keySecret}
                      onChange={e => setRazorpay({...razorpay, keySecret: e.target.value})}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="skip-razorpay"
                    checked={razorpay.skip}
                    onChange={e => setRazorpay({...razorpay, skip: e.target.checked})}
                  />
                  <label htmlFor="skip-razorpay" className="text-sm text-stone-600">I'll set up Razorpay later</label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-stone-50 border-t border-stone-100 flex justify-between">
          <button 
            onClick={() => step > 1 && setStep(step - 1)}
            className={cn("px-6 py-2 text-stone-600 font-medium", step === 1 && "invisible")}
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            className="px-8 py-2 bg-[#1a73e8] text-white rounded-full font-medium hover:bg-[#1557b0] transition-colors"
          >
            {step === totalSteps ? "Complete Setup" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Inventory View ---
function InventoryView({ inventory, logs, products, orgId }: { inventory: Inventory[], logs: InventoryLog[], products: Product[], orgId: string }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustData, setAdjustData] = useState({ productId: "", quantity: 0, type: "adjustment" as any, reason: "" });
  const [showLogs, setShowLogs] = useState(false);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const invItem = inventory.find(i => i.productId === adjustData.productId);
    if (!invItem) {
      // Create new inventory record if it doesn't exist
      const newInvRef = await addDoc(collection(db, "inventory"), {
        productId: adjustData.productId,
        organizationId: orgId,
        stockQuantity: adjustData.quantity,
        minimumStockLevel: 5,
        reorderLevel: 10,
        reorderQuantity: 20,
        warehouseLocation: "Main Warehouse"
      });
      
      await addDoc(collection(db, "inventory_logs"), {
        inventoryId: newInvRef.id,
        productId: adjustData.productId,
        organizationId: orgId,
        type: adjustData.type,
        change: adjustData.quantity,
        reason: adjustData.reason || "Initial Stock",
        date: new Date().toISOString(),
        warehouseLocation: "Main Warehouse"
      });
    } else {
      // Update existing
      const newQty = adjustData.type === "in" ? invItem.stockQuantity + adjustData.quantity : 
                     adjustData.type === "out" ? invItem.stockQuantity - adjustData.quantity :
                     adjustData.quantity; // adjustment sets absolute value in this simple logic, or we could make it relative

      await updateDoc(doc(db, "inventory", invItem.id!), { stockQuantity: newQty });
      
      await addDoc(collection(db, "inventory_logs"), {
        inventoryId: invItem.id,
        productId: adjustData.productId,
        organizationId: orgId,
        type: adjustData.type,
        change: adjustData.type === "adjustment" ? adjustData.quantity - invItem.stockQuantity : adjustData.quantity,
        reason: adjustData.reason,
        date: new Date().toISOString(),
        warehouseLocation: invItem.warehouseLocation
      });
    }
    setShowAdjust(false);
    setAdjustData({ productId: "", quantity: 0, type: "adjustment", reason: "" });
  };

  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.reorderLevel);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Inventory & Warehouse</h3>
          <p className="text-stone-500">Track stock levels, movements, and reorder points.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdjust(true)} className="bg-emerald-500 text-white px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-sm">
            <Package size={20} /> Adjust Stock
          </button>
          <button onClick={() => setShowLogs(!showLogs)} className="px-6 py-2.5 border border-stone-200 rounded-full font-medium text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2">
            <History size={20} /> {showLogs ? "Stock View" : "Activity Log"}
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && !showLogs && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 text-amber-800 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold">Low Stock Alert</p>
            <p className="text-sm">{lowStockItems.length} items have reached their reorder level.</p>
          </div>
        </div>
      )}

      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h4 className="text-xl font-bold mb-6">Stock Adjustment</h4>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Product</label>
                <select required className="w-full p-3 border border-stone-200 rounded-xl" value={adjustData.productId} onChange={e => setAdjustData({...adjustData, productId: e.target.value})}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Type</label>
                  <select className="w-full p-3 border border-stone-200 rounded-xl" value={adjustData.type} onChange={e => setAdjustData({...adjustData, type: e.target.value as any})}>
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Manual Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Quantity</label>
                  <input type="number" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setAdjustData({...adjustData, quantity: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Reason</label>
                <input type="text" placeholder="e.g. Purchase, Damage" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setAdjustData({...adjustData, reason: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAdjust(false)} className="flex-1 py-3 border border-stone-200 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white rounded-xl">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        {!showLogs ? (
          <table className="w-full text-left">
            <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Product Details</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Stock Level</th>
                <th className="px-6 py-4 font-semibold">Reorder Info</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {inventory.map(inv => {
                const p = products.find(prod => prod.id === inv.productId);
                const isLow = inv.stockQuantity <= inv.reorderLevel;
                return (
                  <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{p?.name || "Unknown"}</p>
                      <p className="text-xs text-stone-400">{p?.sku || "No SKU"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{inv.warehouseLocation}</td>
                    <td className="px-6 py-4">
                      <p className="text-lg font-bold text-stone-900">{inv.stockQuantity}</p>
                      <p className="text-[10px] text-stone-400 uppercase">{p?.uom}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-stone-600">Min: {inv.minimumStockLevel}</p>
                      <p className="text-xs text-stone-600">Reorder: {inv.reorderLevel}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        isLow ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {isLow ? "Reorder Soon" : "Healthy"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Change</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map(l => {
                const p = products.find(prod => prod.id === l.productId);
                return (
                  <tr key={l.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-stone-500">{format(new Date(l.date), "dd MMM yyyy, HH:mm")}</td>
                    <td className="px-6 py-4 font-medium text-stone-900">{p?.name || "Deleted Product"}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        l.type === "in" ? "bg-emerald-100 text-emerald-700" :
                        l.type === "out" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {l.type}
                      </span>
                    </td>
                    <td className={cn("px-6 py-4 font-bold", l.change > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {l.change > 0 ? `+${l.change}` : l.change}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">{l.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Team View ---
function TeamView({ org }: { org: Organization | null }) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteData, setInviteData] = useState({ name: "", email: "", role: "accountant" });

  useEffect(() => {
    if (!org?.id) return;
    const q = query(collection(db, "users"), where("organizationId", "==", org.id));
    return onSnapshot(q, (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as any as UserProfile)));
    });
  }, [org?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id) return;
    const empId = `pending_${inviteData.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    await setDoc(doc(db, "users", empId), {
      name: inviteData.name,
      email: inviteData.email,
      role: inviteData.role,
      organizationId: org.id,
      onboardingCompleted: false,
      accountStatus: "pending_invitation",
      createdAt: new Date().toISOString()
    });
    setShowInvite(false);
    setInviteData({ name: "", email: "", role: "accountant" });
    alert("Invitation sent!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Team Members</h3>
          <p className="text-stone-500">Manage your organization's users and roles.</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)}
          className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-full font-medium hover:bg-[#1557b0] transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h4 className="text-xl font-bold mb-6">Invite New Member</h4>
            <form onSubmit={handleInvite} className="space-y-4">
              <input 
                type="text" 
                placeholder="Full Name" 
                required 
                className="w-full p-3 border border-stone-200 rounded-xl"
                value={inviteData.name}
                onChange={e => setInviteData({...inviteData, name: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                className="w-full p-3 border border-stone-200 rounded-xl"
                value={inviteData.email}
                onChange={e => setInviteData({...inviteData, email: e.target.value})}
              />
              <select 
                className="w-full p-3 border border-stone-200 rounded-xl"
                value={inviteData.role}
                onChange={e => setInviteData({...inviteData, role: e.target.value})}
              >
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer</option>
              </select>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-3 border border-stone-200 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Member</th>
              <th className="px-6 py-4 font-semibold">Role</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {members.map(m => (
              <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs uppercase">
                      {m.name?.[0] || m.email?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{m.name || "Pending Invitation"}</p>
                      <p className="text-xs text-stone-400">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium px-2 py-1 bg-stone-100 rounded uppercase tracking-wider">
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                    m.accountStatus === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {m.accountStatus || "Active"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => deleteDoc(doc(db, "users", m.id!))}
                    className="p-2 text-stone-400 hover:text-rose-500"
                  >
                    <Trash2 size={18}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Developer Master View ---
function DeveloperMasterView({ orgs }: { orgs: Organization[] }) {
  const [activeTab, setActiveTab] = useState("database");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Developer Master</h3>
          <p className="text-stone-500">Manage platform data, organizations, and features.</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-stone-200">
        <button onClick={() => setActiveTab("database")} className={cn("pb-3 font-medium text-sm transition-colors", activeTab === "database" ? "text-[#1a73e8] border-b-2 border-[#1a73e8]" : "text-stone-500 hover:text-stone-700")}>Database Explorer</button>
        <button onClick={() => setActiveTab("features")} className={cn("pb-3 font-medium text-sm transition-colors", activeTab === "features" ? "text-[#1a73e8] border-b-2 border-[#1a73e8]" : "text-stone-500 hover:text-stone-700")}>Feature Manager</button>
        <button onClick={() => setActiveTab("organizations")} className={cn("pb-3 font-medium text-sm transition-colors", activeTab === "organizations" ? "text-[#1a73e8] border-b-2 border-[#1a73e8]" : "text-stone-500 hover:text-stone-700")}>Organizations</button>
      </div>

      <div className="pt-2">
        {activeTab === "database" && <DatabaseExplorerView />}
        {activeTab === "features" && <FeatureManagerView />}
        {activeTab === "organizations" && <AdminPanelView orgs={orgs} />}
      </div>
    </div>
  );
}

// --- Feature Manager View ---
function FeatureManagerView() {
  const [features, setFeatures] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", key: "", isEnabled: true });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "platform_features"), (snapshot) => {
      setFeatures(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "platform_features"), {
      ...formData,
      createdAt: new Date().toISOString()
    });
    setShowForm(false);
    setFormData({ name: "", description: "", key: "", isEnabled: true });
  };

  const toggleFeature = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "platform_features", id), { isEnabled: !current });
  };

  const deleteFeature = async (id: string) => {
    if (confirm("Delete this feature?")) {
      await deleteDoc(doc(db, "platform_features", id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <button onClick={() => setShowForm(true)} className="bg-[#1a73e8] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1557b0] transition-colors shadow-sm text-sm font-medium">
          <Plus size={18} /> Add Feature
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.length === 0 && (
          <div className="col-span-full p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
            No custom features added yet. Click "Add Feature" to create one.
          </div>
        )}
        {features.map(f => (
          <div key={f.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg text-stone-900">{f.name}</h4>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", f.isEnabled ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500")}>
                  {f.isEnabled ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-stone-500 mb-4">{f.description}</p>
              <p className="text-xs font-mono text-stone-400 bg-stone-50 p-2 rounded">Key: {f.key}</p>
            </div>
            <div className="mt-6 flex justify-between items-center border-t border-stone-100 pt-4">
              <button onClick={() => toggleFeature(f.id, f.isEnabled)} className={cn("text-sm font-medium", f.isEnabled ? "text-amber-600" : "text-emerald-600")}>
                {f.isEnabled ? "Disable" : "Enable"}
              </button>
              <button onClick={() => deleteFeature(f.id)} className="text-rose-500 hover:text-rose-600"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold">Add New Feature</h4>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Feature Name</label>
                <input required type="text" className="w-full p-3 border border-stone-200 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Feature Key (e.g. ENABLE_AI)</label>
                <input required type="text" className="w-full p-3 border border-stone-200 rounded-xl font-mono text-sm" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Description</label>
                <textarea required className="w-full p-3 border border-stone-200 rounded-xl" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.isEnabled} onChange={e => setFormData({...formData, isEnabled: e.target.checked})} className="w-4 h-4 rounded text-[#1a73e8]" />
                <span className="text-sm font-medium text-stone-600">Enable by default</span>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] font-medium">Save Feature</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Database Explorer View ---
function DatabaseExplorerView() {
  const [collections] = useState([
    "organizations", "users", "customers", "products", "inventory", "invoices", "expenses", "inventory_logs", "otps"
  ]);
  const [selectedCollection, setSelectedCollection] = useState("organizations");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [editJson, setEditJson] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!selectedCollection) return;
    setLoading(true);
    const unsub = onSnapshot(collection(db, selectedCollection), (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedCollection]);

  const handleSaveDoc = async () => {
    try {
      setSaveError("");
      const parsed = JSON.parse(editJson);
      const { id, ...dataToSave } = parsed;
      await setDoc(doc(db, selectedCollection, id), dataToSave);
      setSelectedDoc(null);
    } catch (e: any) {
      setSaveError(e.message);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await deleteDoc(doc(db, selectedCollection, id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <select 
          className="p-2 border border-stone-200 rounded-lg bg-white"
          value={selectedCollection}
          onChange={e => setSelectedCollection(e.target.value)}
        >
          {collections.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-stone-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No documents found in {selectedCollection}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Data Preview</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {documents.map(d => (
                  <tr key={d.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{d.id}</td>
                    <td className="px-4 py-3 text-stone-500 truncate max-w-md">
                      {JSON.stringify(d).substring(0, 100)}...
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button 
                        onClick={() => { setSelectedDoc(d); setEditJson(JSON.stringify(d, null, 2)); }}
                        className="text-[#1a73e8] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteDoc(d.id)}
                        className="text-red-500 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold">Edit Document: {selectedDoc.id}</h4>
              <button onClick={() => setSelectedDoc(null)} className="text-stone-400 hover:text-stone-600"><X size={20}/></button>
            </div>
            
            {saveError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{saveError}</div>}
            
            <textarea 
              className="flex-1 w-full p-4 border border-stone-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none resize-none"
              value={editJson}
              onChange={e => setEditJson(e.target.value)}
            />
            
            <div className="mt-4 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveDoc}
                className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Admin Panel View ---
function AdminPanelView({ orgs }: { orgs: Organization[] }) {
  const approveOrg = async (id: string) => {
    await updateDoc(doc(db, "organizations", id), { subscriptionStatus: "trial" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Organization</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Created</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orgs.map(o => (
              <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">{o.name}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    o.subscriptionStatus === "pending_approval" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {o.subscriptionStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-stone-400">{format(new Date(o.createdAt), "dd MMM yyyy")}</td>
                <td className="px-6 py-4">
                  {o.subscriptionStatus === "pending_approval" && (
                    <button onClick={() => approveOrg(o.id!)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Approve Trial</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function DashboardView({ invoices, customers, products, inventory }: { invoices: Invoice[], customers: Customer[], products: Product[], inventory: Inventory[] }) {
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((acc, i) => acc + i.grandTotal, 0);
  const totalOutstanding = invoices.filter(i => i.status === "unpaid").reduce((acc, i) => acc + i.grandTotal, 0);
  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.reorderLevel);

  const revenueData = invoices
    .filter(i => i.status === "paid")
    .reduce((acc: any[], inv) => {
      const date = format(new Date(inv.date), "MMM dd");
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.amount += inv.grandTotal;
      } else {
        acc.push({ date, amount: inv.grandTotal });
      }
      return acc;
    }, [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-stone-900">Business Overview</h3>
        <p className="text-stone-500">Real-time insights into your business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="google-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24}/></div>
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-stone-900">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-medium mt-2">+12% from last month</p>
        </div>

        <div className="google-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><CreditCard size={24}/></div>
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Outstanding</p>
          </div>
          <p className="text-3xl font-bold text-stone-900">₹{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-amber-600 font-medium mt-2">{invoices.filter(i => i.status === "unpaid").length} pending invoices</p>
        </div>

        <div className="google-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Users size={24}/></div>
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Total Customers</p>
          </div>
          <p className="text-3xl font-bold text-stone-900">{customers.length}</p>
          <p className="text-xs text-blue-600 font-medium mt-2">{customers.filter(c => c.segmentation === "Corporate").length} corporate accounts</p>
        </div>

        <div className="google-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Low Stock</p>
          </div>
          <p className="text-3xl font-bold text-stone-900">{lowStockItems.length}</p>
          <p className="text-xs text-rose-600 font-medium mt-2">Items need restocking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 google-card p-8">
          <h4 className="text-lg font-bold text-stone-900 mb-8">Revenue Trend (Last 7 Days)</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#70757a', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#70757a', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#1a73e8" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="google-card p-8">
          <h4 className="text-lg font-bold text-stone-900 mb-6">Recent Activity</h4>
          <div className="space-y-6">
            {invoices.slice(0, 5).map(inv => (
              <div key={inv.id} className="flex gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  inv.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {inv.status === "paid" ? <CheckCircle2 size={18}/> : <Clock size={18}/>}
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Invoice {inv.invoiceNumber} {inv.status === "paid" ? "Paid" : "Generated"}</p>
                  <p className="text-xs text-stone-500">{format(new Date(inv.date), "MMM dd, hh:mm a")}</p>
                  <p className="text-xs font-bold text-stone-900 mt-1">₹{inv.grandTotal.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="google-card p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-stone-50 rounded-lg">{icon}</div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
          trend.includes("+") || trend === "Positive" ? "bg-[#e6f4ea] text-[#1e8e3e]" : "bg-[#fce8e6] text-[#d93025]"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-sm text-stone-500 mb-1">{title}</p>
      <p className="text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

// --- Customers View ---
function CustomersView({ customers, orgId }: { customers: Customer[], orgId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    segmentation: "Retail",
    paymentTerms: "Net 30",
    creditLimit: 0,
    lifetimeValue: 0,
    outstandingBalance: 0,
    contactPersons: [],
    activityLog: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "customers"), { 
      ...formData, 
      organizationId: orgId,
      createdAt: new Date().toISOString()
    });
    setShowForm(false);
    setFormData({
      segmentation: "Retail",
      paymentTerms: "Net 30",
      creditLimit: 0,
      lifetimeValue: 0,
      outstandingBalance: 0,
      contactPersons: [],
      activityLog: []
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Advanced Customer Management</h3>
          <p className="text-stone-500">Manage segments, credit limits, and lifetime value.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-[#1557b0] transition-colors shadow-sm">
          <Plus size={20} /> Add Customer
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-6">New Customer Onboarding</h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Customer Name</label>
                  <input type="text" placeholder="Full Name" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Company Name</label>
                  <input type="text" placeholder="Company" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, companyName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Email</label>
                  <input type="email" placeholder="Email" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Phone</label>
                  <input type="text" placeholder="Phone" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Segmentation</label>
                  <select className="w-full p-3 border border-stone-200 rounded-xl" value={formData.segmentation} onChange={e => setFormData({...formData, segmentation: e.target.value as any})}>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Payment Terms</label>
                  <select className="w-full p-3 border border-stone-200 rounded-xl" value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value as any})}>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Credit Limit (INR)</label>
                  <input type="number" placeholder="0.00" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">GST Number</label>
                  <input type="text" placeholder="GSTIN" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Billing Address</label>
                  <textarea placeholder="Address" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, billingAddress: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Shipping Address</label>
                  <textarea placeholder="Address" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, shippingAddress: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl font-medium hover:bg-[#1557b0] transition-colors">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Customer / Company</th>
              <th className="px-6 py-4 font-semibold">Segment</th>
              <th className="px-6 py-4 font-semibold">Financials</th>
              <th className="px-6 py-4 font-semibold">Terms</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-bold text-sm">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{c.name}</p>
                      <p className="text-xs text-stone-400">{c.companyName || "Individual"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    c.segmentation === "Corporate" ? "bg-purple-100 text-purple-700" :
                    c.segmentation === "Wholesale" ? "bg-blue-100 text-blue-700" :
                    "bg-stone-100 text-stone-700"
                  )}>
                    {c.segmentation}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-stone-900">LTV: ₹{c.lifetimeValue?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-rose-600 font-bold">Bal: ₹{c.outstandingBalance?.toLocaleString() || 0}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-xs text-stone-600">{c.paymentTerms}</p>
                  <p className="text-[10px] text-stone-400">Limit: ₹{c.creditLimit?.toLocaleString() || 0}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-2 text-stone-400 hover:text-[#1a73e8]"><Edit size={18}/></button>
                    <button onClick={() => deleteDoc(doc(db, "customers", c.id!))} className="p-2 text-stone-400 hover:text-rose-500"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Products View ---
function ProductsView({ products, orgId }: { products: Product[], orgId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    status: "active",
    taxRate: 18,
    discountAllowed: 0,
    variants: [],
    bulkPricing: [],
    images: [],
    tags: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "products"), { 
      ...formData, 
      organizationId: orgId,
      createdAt: new Date().toISOString()
    });
    setShowForm(false);
    setFormData({
      status: "active",
      taxRate: 18,
      discountAllowed: 0,
      variants: [],
      bulkPricing: [],
      images: [],
      tags: []
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Advanced Product Catalog</h3>
          <p className="text-stone-500">Manage variants, pricing tiers, and stock status.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-[#1557b0] transition-colors shadow-sm">
          <Plus size={20} /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-6">New Product Specification</h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Product Name</label>
                  <input type="text" placeholder="Name" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">SKU Code</label>
                  <input type="text" placeholder="SKU" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Category</label>
                  <input type="text" placeholder="Category" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Unit of Measure</label>
                  <input type="text" placeholder="e.g. Pcs, Kg, Box" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, uom: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cost Price</label>
                  <input type="number" placeholder="0.00" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Selling Price</label>
                  <input type="number" placeholder="0.00" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Wholesale Price</label>
                  <input type="number" placeholder="0.00" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, wholesalePrice: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Tax Rate (%)</label>
                  <input type="number" placeholder="18" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Status</label>
                  <select className="w-full p-3 border border-stone-200 rounded-xl" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Description</label>
                <textarea placeholder="Product details..." className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl font-medium hover:bg-[#1557b0] transition-colors">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Product / SKU</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Pricing</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-stone-900">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.sku}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-stone-600">{p.category}</p>
                  <p className="text-[10px] text-stone-400 uppercase font-bold">{p.uom}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-stone-900">₹{p.sellingPrice?.toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400">Cost: ₹{p.costPrice?.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-700"
                  )}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-2 text-stone-400 hover:text-[#1a73e8]"><Edit size={18}/></button>
                    <button onClick={() => deleteDoc(doc(db, "products", p.id!))} className="p-2 text-stone-400 hover:text-rose-500"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const calculateGST = (items: InvoiceItem[], orgState: string, custState: string) => {
  const subtotal = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  let cgst = 0, sgst = 0, igst = 0;

  items.forEach(item => {
    const tax = (item.unitPrice * item.quantity * item.taxRate) / 100;
    if (orgState === custState) {
      cgst += tax / 2;
      sgst += tax / 2;
    } else {
      igst += tax;
    }
  });

  return { subtotal, cgst, sgst, igst, total: subtotal + cgst + sgst + igst };
};

// --- Invoices View ---
function InvoicesView({ invoices, customers, products, org, orgId }: { invoices: Invoice[], customers: Customer[], products: Product[], org: Organization | null, orgId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 15), "yyyy-MM-dd"));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  const addItem = (productId: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    setItems([...items, { 
      productId: p.id!, 
      name: p.name, 
      quantity: 1, 
      unitPrice: p.sellingPrice, 
      taxAmount: (p.sellingPrice * p.taxRate) / 100,
      discount: 0,
      subtotal: p.sellingPrice
    }]);
  };

  const calculateTotals = () => {
    const totalTax = items.reduce((acc, item) => acc + (item.taxAmount * item.quantity), 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.discount * item.quantity), 0);
    const subtotal = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const grandTotal = subtotal + totalTax - totalDiscount;
    return { subtotal, totalTax, totalDiscount, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomer);
    if (!cust || !org) return;

    const { subtotal, totalTax, totalDiscount, grandTotal } = calculateTotals();

    const invoiceData = {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      customerId: selectedCustomer,
      date: new Date().toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      status: "unpaid",
      subtotal,
      totalTax,
      totalDiscount,
      grandTotal,
      items,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      organizationId: orgId,
      createdAt: new Date().toISOString()
    };

    const invRef = await addDoc(collection(db, "invoices"), invoiceData);

    // Update Inventory using the new Inventory entity
    for (const item of items) {
      const q = query(collection(db, "inventory"), where("productId", "==", item.productId), where("organizationId", "==", orgId));
      const invSnap = await getDocs(q);
      
      if (!invSnap.empty) {
        const invDoc = invSnap.docs[0];
        const currentStock = invDoc.data().stockQuantity;
        await updateDoc(doc(db, "inventory", invDoc.id), {
          stockQuantity: currentStock - item.quantity
        });

        await addDoc(collection(db, "inventory_logs"), {
          inventoryId: invDoc.id,
          productId: item.productId,
          organizationId: orgId,
          type: "out",
          change: item.quantity,
          reason: `Invoice ${invoiceData.invoiceNumber}`,
          date: new Date().toISOString(),
          warehouseLocation: invDoc.data().warehouseLocation
        });
      }
    }

    setShowForm(false);
    setItems([]);
    setSelectedCustomer("");
  };

  const handlePayment = async (inv: Invoice) => {
    if (!org?.razorpayKeyId || !org?.razorpayKeySecret) {
      alert("Please configure your Razorpay API keys in Settings first.");
      return;
    }

    try {
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: inv.grandTotal,
          currency: "INR",
          keyId: org.razorpayKeyId,
          keySecret: org.razorpayKeySecret
        }),
      });

      const order = await response.json();

      const options = {
        key: org.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: org.name,
        description: `Payment for Invoice ${inv.invoiceNumber}`,
        order_id: order.id,
        handler: async (response: any) => {
          await updateDoc(doc(db, "invoices", inv.id!), { status: "paid" });
          alert("Payment successful!");
          const cust = customers.find(c => c.id === inv.customerId);
          if (cust && org) {
            generateInvoicePDF({ ...inv, status: "paid" }, cust, org);
          }
        },
        prefill: {
          name: customers.find(c => c.id === inv.customerId)?.name,
          email: customers.find(c => c.id === inv.customerId)?.email,
        },
        theme: { color: "#1a73e8" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment failed", error);
      alert("Payment failed. Check console for details.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-stone-900">Invoices & Billing</h3>
          <p className="text-stone-500">Generate professional invoices and track payments.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-[#1557b0] transition-colors shadow-sm">
          <Plus size={20} /> Create Invoice
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold mb-6">Create New Invoice</h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Customer</label>
                  <select required className="w-full p-3 border border-stone-200 rounded-xl" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName || "Individual"})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Due Date</label>
                    <input type="date" required className="w-full p-3 border border-stone-200 rounded-xl" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded text-[#1a73e8]" />
                      <span className="text-sm font-medium text-stone-600">Recurring</span>
                    </label>
                  </div>
                </div>
              </div>

              {isRecurring && (
                <div className="bg-stone-50 p-4 rounded-xl">
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Recurring Interval</label>
                  <div className="flex gap-4">
                    {["monthly", "quarterly", "yearly"].map(interval => (
                      <label key={interval} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="interval" checked={recurringInterval === interval} onChange={() => setRecurringInterval(interval as any)} />
                        <span className="text-sm capitalize">{interval}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-stone-900">Line Items</h5>
                  <select className="p-2 border border-stone-200 rounded-lg text-sm" onChange={e => { if(e.target.value) addItem(e.target.value); e.target.value = ""; }}>
                    <option value="">Add Product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.sellingPrice}</option>)}
                  </select>
                </div>
                
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 w-24">Qty</th>
                        <th className="px-4 py-3 w-32">Price</th>
                        <th className="px-4 py-3 w-32">Tax</th>
                        <th className="px-4 py-3 w-32">Total</th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3">
                            <input type="number" value={item.quantity} min="1" className="w-full p-1 border border-stone-200 rounded" onChange={e => {
                              const newItems = [...items];
                              newItems[idx].quantity = Number(e.target.value);
                              setItems(newItems);
                            }} />
                          </td>
                          <td className="px-4 py-3">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 text-stone-400">₹{(item.taxAmount * item.quantity).toLocaleString()}</td>
                          <td className="px-4 py-3 font-bold">₹{((item.unitPrice + item.taxAmount) * item.quantity).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-stone-300 hover:text-rose-500"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-stone-500">
                    <span>Subtotal</span>
                    <span>₹{calculateTotals().subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Tax Total</span>
                    <span>₹{calculateTotals().totalTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 border-b border-stone-100 pb-2">
                    <span>Discount</span>
                    <span className="text-rose-500">- ₹{calculateTotals().totalDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-stone-900 pt-2">
                    <span>Grand Total</span>
                    <span>₹{calculateTotals().grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl font-medium text-stone-600 hover:bg-stone-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#1a73e8] text-white rounded-xl font-medium hover:bg-[#1557b0] transition-colors shadow-lg">Generate Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Invoice #</th>
              <th className="px-6 py-4 font-semibold">Customer</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Due Date</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {invoices.map(inv => {
              const cust = customers.find(c => c.id === inv.customerId);
              const isOverdue = new Date(inv.dueDate) < new Date() && inv.status === "unpaid";
              return (
                <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-stone-900">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-stone-400">{format(new Date(inv.date), "dd MMM yyyy")}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-stone-900">{cust?.name || "Unknown"}</p>
                    <p className="text-xs text-stone-400">{cust?.companyName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-stone-900">₹{inv.grandTotal?.toLocaleString()}</p>
                    {inv.isRecurring && <p className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1"><History size={10}/> {inv.recurringInterval}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                      inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                      isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {isOverdue ? "Overdue" : inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-stone-500">
                    {format(new Date(inv.dueDate), "dd MMM yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {inv.status === "unpaid" && (
                        <button onClick={() => handlePayment(inv)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Pay Now">
                          <CreditCard size={18}/>
                        </button>
                      )}
                      <button onClick={() => {
                        if (cust && org) generateInvoicePDF(inv, cust, org);
                      }} className="p-2 text-stone-400 hover:text-[#1a73e8]"><Download size={18}/></button>
                      <button onClick={() => deleteDoc(doc(db, "invoices", inv.id!))} className="p-2 text-stone-400 hover:text-rose-500"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// --- Expenses View ---
function ExpensesView({ expenses, orgId }: { expenses: Expense[], orgId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({ date: new Date().toISOString().split('T')[0] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "expenses"), { ...formData, organizationId: orgId });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-medium text-stone-900">Expenses</h3>
        <button onClick={() => setShowForm(true)} className="bg-[#1a73e8] text-white px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-[#1557b0] transition-all shadow-sm hover:shadow-md font-medium">
          <Plus size={20} /> Add Expense
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h4 className="text-xl font-bold mb-6">New Expense</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Category (e.g. Rent, Salary)" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, category: e.target.value})} />
              <input type="number" placeholder="Amount" required className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
              <input type="date" required className="w-full p-3 border border-stone-200 rounded-xl" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              <textarea placeholder="Description" className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-stone-200 rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="google-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f8f9fa] border-b border-stone-200 text-stone-500 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-stone-900">{e.category}</p>
                  <p className="text-xs text-stone-400">{e.description}</p>
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">{format(new Date(e.date), "dd MMM yyyy")}</td>
                <td className="px-6 py-4 font-semibold text-rose-600">INR {e.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <button onClick={() => deleteDoc(doc(db, "expenses", e.id!))} className="p-2 text-stone-400 hover:text-rose-500"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Settings View ---
function SettingsView({ org, setOrg }: { org: Organization | null, setOrg: (o: Organization) => void }) {
  const [formData, setFormData] = useState<Partial<Organization>>(org || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.id) return;
    await updateDoc(doc(db, "organizations", org.id), formData);
    setOrg({ ...org, ...formData } as Organization);
    alert("Settings updated!");
  };

  return (
    <div className="max-w-2xl space-y-8 pb-12">
      <h3 className="text-2xl font-bold text-stone-900">Organization Settings</h3>
      
      <div className="space-y-6">
        <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h4 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Business Profile</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Organization Name</label>
              <input type="text" value={formData.name} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Legal Business Name</label>
              <input type="text" value={formData.legalBusinessName} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, legalBusinessName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Industry Category</label>
              <input type="text" value={formData.industryCategory} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, industryCategory: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Website URL</label>
              <input type="url" value={formData.websiteUrl} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, websiteUrl: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-2">Business Description</label>
              <textarea value={formData.businessDescription} className="w-full p-3 border border-stone-200 rounded-xl" rows={3} onChange={e => setFormData({...formData, businessDescription: e.target.value})} />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h4 className="font-bold text-lg flex items-center gap-2"><FileText size={20}/> Registration & Compliance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">GST Number</label>
              <input type="text" value={formData.gstNumber} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">PAN Number</label>
              <input type="text" value={formData.panNumber} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, panNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">CIN Number</label>
              <input type="text" value={formData.cinNumber} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, cinNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Business State</label>
              <input type="text" value={formData.state} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, state: e.target.value})} />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h4 className="font-bold text-lg flex items-center gap-2"><AlertCircle size={20}/> Document Verification</h4>
          <p className="text-sm text-stone-500">Upload documents to verify your business and increase limits.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl text-center">
              <p className="text-sm font-medium mb-2">Registration Certificate</p>
              <button className="text-xs text-[#1a73e8] font-bold uppercase">Upload File</button>
            </div>
            <div className="p-4 border-2 border-dashed border-stone-200 rounded-xl text-center">
              <p className="text-sm font-medium mb-2">Trade License</p>
              <button className="text-xs text-[#1a73e8] font-bold uppercase">Upload File</button>
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h4 className="font-bold text-lg flex items-center gap-2"><CreditCard size={20}/> Payment Gateway (Razorpay)</h4>
          <p className="text-sm text-stone-500">Enter your own Razorpay credentials to accept payments directly.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Razorpay Key ID</label>
              <input type="text" value={formData.razorpayKeyId} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, razorpayKeyId: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Razorpay Key Secret</label>
              <input type="password" value={formData.razorpayKeySecret} className="w-full p-3 border border-stone-200 rounded-xl" onChange={e => setFormData({...formData, razorpayKeySecret: e.target.value})} />
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h4 className="font-bold text-lg flex items-center gap-2"><AlertCircle size={20}/> Security & 2FA</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">PIN-based 2FA</p>
              <p className="text-xs text-stone-500">Require a 4-digit PIN on every login.</p>
            </div>
            <button 
              onClick={() => setFormData({...formData, twoFactorEnabled: !formData.twoFactorEnabled})}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                formData.twoFactorEnabled ? "bg-emerald-500" : "bg-stone-300"
              )}
            >
              <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", formData.twoFactorEnabled ? "right-1" : "left-1")} />
            </button>
          </div>
          
          {formData.twoFactorEnabled && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">4-Digit PIN</label>
              <input type="password" maxLength={4} value={formData.twoFactorPin} className="w-32 p-3 border border-stone-200 rounded-xl text-center tracking-widest" onChange={e => setFormData({...formData, twoFactorPin: e.target.value})} />
            </div>
          )}

          <div className="border-t border-stone-100 pt-6 flex items-center justify-between">
            <div>
              <p className="font-medium">Email OTP Verification</p>
              <p className="text-xs text-stone-500">Send a 6-digit code to your email on login.</p>
            </div>
            <button 
              onClick={() => setFormData({...formData, emailOtpEnabled: !formData.emailOtpEnabled})}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                formData.emailOtpEnabled ? "bg-emerald-500" : "bg-stone-300"
              )}
            >
              <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", formData.emailOtpEnabled ? "right-1" : "left-1")} />
            </button>
          </div>
        </section>

        <button onClick={handleSubmit} className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
          Save All Settings
        </button>
      </div>
    </div>
  );
}
