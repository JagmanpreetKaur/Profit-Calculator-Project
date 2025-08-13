import React, { useEffect, useMemo, useRef, useState } from "react";
import heroImage from "@/assets/aura-hero.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Wallet, ReceiptText, Trash2 } from "lucide-react";

// Types
type Category = "Rent" | "Water Bill" | "Electricity Bill" | "Products & Items";

type Earning = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
};

type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  category: Category;
  amount: number;
  description?: string; // only for Products & Items
};

type MonthlySummary = {
  id: string;
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g., August 2025
  totalEarned: number;
  totalSpent: number;
  totalProfit: number;
};

// Storage keys
const STORAGE_KEYS = {
  earnings: "aura_daily_earnings",
  expenses: "aura_daily_expenses",
  summaries: "aura_monthly_summaries",
} as const;

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKeyOf = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabelOf = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
};
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Math.round(n)
  );
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

const Index = () => {
  // Signature gradient interaction
  const heroRef = useRef<HTMLDivElement | null>(null);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    heroRef.current.style.setProperty("--x", `${x}%`);
    heroRef.current.style.setProperty("--y", `${y}%`);
  };

  // Data state
  const [earnings, setEarnings] = useState<Earning[]>(() => load<Earning[]>(STORAGE_KEYS.earnings, []));
  const [expenses, setExpenses] = useState<Expense[]>(() => load<Expense[]>(STORAGE_KEYS.expenses, []));
  const [summaries, setSummaries] = useState<MonthlySummary[]>(() =>
    load<MonthlySummary[]>(STORAGE_KEYS.summaries, [])
  );

  // Forms
  const [eDate, setEDate] = useState<string>(todayStr());
  const [eDesc, setEDesc] = useState<string>("");
  const [eAmt, setEAmt] = useState<string>("");

  const [xDate, setXDate] = useState<string>(todayStr());
  const [xCat, setXCat] = useState<Category | "">("");
  const [xDesc, setXDesc] = useState<string>("");
  const [xAmt, setXAmt] = useState<string>("");

  const currentMonthKey = monthKeyOf(new Date());

  // Persist changes
  useEffect(() => save(STORAGE_KEYS.earnings, earnings), [earnings]);
  useEffect(() => save(STORAGE_KEYS.expenses, expenses), [expenses]);
  useEffect(() => save(STORAGE_KEYS.summaries, summaries), [summaries]);

  // Roll over any past months to Monthly Summary automatically
  useEffect(() => {
    const monthsToSummarize = new Set<string>();
    const consider = (dateStr: string) => {
      const mk = monthKeyOf(dateStr);
      if (mk < currentMonthKey) monthsToSummarize.add(mk);
    };
    earnings.forEach((e) => consider(e.date));
    expenses.forEach((x) => consider(x.date));

    if (monthsToSummarize.size === 0) return;

    const newSummaries: MonthlySummary[] = [];
    const remainingE: Earning[] = [];
    const remainingX: Expense[] = [];

    const monthsArray = Array.from(monthsToSummarize);

    // Partition and summarize
    for (const e of earnings) {
      const mk = monthKeyOf(e.date);
      if (!monthsToSummarize.has(mk)) remainingE.push(e);
    }
    for (const x of expenses) {
      const mk = monthKeyOf(x.date);
      if (!monthsToSummarize.has(mk)) remainingX.push(x);
    }

    for (const mk of monthsArray) {
      const eMonth = earnings.filter((e) => monthKeyOf(e.date) === mk);
      const xMonth = expenses.filter((x) => monthKeyOf(x.date) === mk);
      const totalEarned = eMonth.reduce((s, v) => s + v.amount, 0);
      const totalSpent = xMonth.reduce((s, v) => s + v.amount, 0);
      const totalProfit = totalEarned - totalSpent;
      const sampleDate = mk + "-01";
      newSummaries.push({
        id: uid(),
        monthKey: mk,
        monthLabel: monthLabelOf(sampleDate),
        totalEarned,
        totalSpent,
        totalProfit,
      });
    }

    if (newSummaries.length > 0) {
      setSummaries((prev) => {
        const merged = [...prev, ...newSummaries]
          .sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1));
        return merged;
      });
      setEarnings(remainingE);
      setExpenses(remainingX);
      toast({ title: "Monthly summary saved", description: `Archived ${monthsArray.length} month(s).` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived for current month
  const currentEarnings = useMemo(
    () => earnings.filter((e) => monthKeyOf(e.date) === currentMonthKey),
    [earnings, currentMonthKey]
  );
  const currentExpenses = useMemo(
    () => expenses.filter((x) => monthKeyOf(x.date) === currentMonthKey),
    [expenses, currentMonthKey]
  );

  const totals = useMemo(() => {
    const earned = currentEarnings.reduce((s, v) => s + v.amount, 0);
    const spent = currentExpenses.reduce((s, v) => s + v.amount, 0);
    return { earned, spent, profit: earned - spent };
  }, [currentEarnings, currentExpenses]);

  // Handlers
  const addEarning = () => {
    const amount = Number(eAmt);
    if (!eDate || !eDesc || !amount || amount <= 0) {
      toast({ title: "Missing details", description: "Please enter description and a valid amount." });
      return;
    }
    const next = [...earnings, { id: uid(), date: eDate, description: eDesc.trim(), amount }];
    setEarnings(next);
    setEDesc("");
    setEAmt("");
    toast({ title: "Earning added", description: `${formatINR(amount)} added.` });
  };

  const addExpense = () => {
    const amount = Number(xAmt);
    if (!xDate || !xCat || !amount || amount <= 0) {
      toast({ title: "Missing details", description: "Please select category and enter a valid amount." });
      return;
    }
    const desc = xCat === "Products & Items" ? xDesc.trim() : undefined;
    if (xCat === "Products & Items" && !desc) {
      toast({ title: "Add description", description: "Please describe the product or item." });
      return;
    }
    const next = [...expenses, { id: uid(), date: xDate, category: xCat as Category, amount, description: desc }];
    setExpenses(next);
    setXDesc("");
    setXAmt("");
    toast({ title: "Expenditure added", description: `${formatINR(amount)} recorded.` });
  };

  const delEarning = (id: string) => {
    setEarnings((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Deleted", description: "Earning entry removed." });
  };
  const delExpense = (id: string) => {
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    toast({ title: "Deleted", description: "Expenditure entry removed." });
  };

  const completeCurrentMonth = () => {
    const mk = currentMonthKey;
    // Prevent duplicate summaries
    if (summaries.some((s) => s.monthKey === mk)) {
      toast({ title: "Already completed", description: "This month has already been summarized." });
      return;
    }

    const eMonth = earnings.filter((e) => monthKeyOf(e.date) === mk);
    const xMonth = expenses.filter((x) => monthKeyOf(x.date) === mk);

    if (eMonth.length === 0 && xMonth.length === 0) {
      toast({ title: "No data", description: "No entries for the current month to summarize." });
      return;
    }

    const totalEarned = eMonth.reduce((s, v) => s + v.amount, 0);
    const totalSpent = xMonth.reduce((s, v) => s + v.amount, 0);
    const totalProfit = totalEarned - totalSpent;

    const sampleDate = mk + "-01";
    const newSummary: MonthlySummary = {
      id: uid(),
      monthKey: mk,
      monthLabel: monthLabelOf(sampleDate),
      totalEarned,
      totalSpent,
      totalProfit,
    };

    setSummaries((prev) => [...prev, newSummary].sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1)));
    setEarnings((prev) => prev.filter((e) => monthKeyOf(e.date) !== mk));
    setExpenses((prev) => prev.filter((x) => monthKeyOf(x.date) !== mk));

    toast({ title: "Month completed", description: "Current month archived into summary." });
  };

  // SEO structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: "Deep’s Aura – Daily Profit Tracker",
    description:
      'Private daily profit tracker for Deep’s Aura Beauty Care and Spa. Manage earnings, expenses, and monthly summaries in INR.',
    applicationCategory: 'FinanceApplication',
    creator: {
      '@type': 'Organization',
      name: "Deep's Aura Beauty Care and Spa",
    },
  };

  return (
    <div>
      <header
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="bg-aura-hero"
      >
        <section className="container mx-auto px-6 pt-10 pb-8 md:pt-16 md:pb-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 animate-enter">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Deep’s Aura – Daily Profit Tracker
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-prose">
                A private, elegant workspace to record daily earnings and expenditures, and automatically track monthly profit in INR.
              </p>
              <div className="flex items-center gap-3">
                <Button variant="secondary" asChild className="hover-scale">
                  <a href="#tracker">Scroll to tracker</a>
                </Button>
                <Button variant="outline" onClick={completeCurrentMonth} className="hover-scale">
                  Complete month now
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4"/> Earned</div>
                    <div className="text-xl font-semibold">{formatINR(totals.earned)}</div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><ReceiptText className="h-4 w-4"/> Spent</div>
                    <div className="text-xl font-semibold">{formatINR(totals.spent)}</div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4"/> Profit</div>
                    <div className="text-xl font-semibold">{formatINR(totals.profit)}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="relative rounded-lg overflow-hidden shadow-[var(--shadow-elegant)] animate-scale-in">
              <img src={heroImage} alt="Radiant beauty spa ambience for Deep's Aura" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      </header>

      <main id="tracker" className="container mx-auto px-6 pb-16">
        <Separator className="my-8" />

        {/* Forms */}
        <section className="grid md:grid-cols-2 gap-6">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Record Earning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-date">Date</Label>
                  <Input id="e-date" type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="e-desc">Description</Label>
                  <Input id="e-desc" placeholder="e.g., Facial, Hair Treatment" value={eDesc} onChange={(e) => setEDesc(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="e-amt">Amount (INR)</Label>
                  <Input id="e-amt" inputMode="numeric" placeholder="e.g., 1500" value={eAmt} onChange={(e) => setEAmt(e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                <Button onClick={addEarning} className="w-full">Add Earning</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Record Expenditure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="x-date">Date</Label>
                  <Input id="x-date" type="date" value={xDate} onChange={(e) => setXDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={xCat} onValueChange={(v) => setXCat(v as Category)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Water Bill">Water Bill</SelectItem>
                      <SelectItem value="Electricity Bill">Electricity Bill</SelectItem>
                      <SelectItem value="Products & Items">Products & Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="x-amt">Amount (INR)</Label>
                  <Input id="x-amt" inputMode="numeric" placeholder="e.g., 800" value={xAmt} onChange={(e) => setXAmt(e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
              </div>
              {xCat === "Products & Items" && (
                <div className="space-y-2">
                  <Label htmlFor="x-desc">Description (Products & Items)</Label>
                  <Input id="x-desc" placeholder="e.g., Hair Dryer" value={xDesc} onChange={(e) => setXDesc(e.target.value)} />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={addExpense}>Add Expenditure</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tables */}
        <section className="mt-10 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Earnings (Current Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEarnings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No earnings yet.</TableCell>
                      </TableRow>
                    ) : (
                      currentEarnings
                        .slice()
                        .sort((a, b) => (a.date < b.date ? -1 : 1))
                        .map((e) => (
                          <TableRow key={e.id} className="animate-fade-in">
                            <TableCell>{e.date}</TableCell>
                            <TableCell>{e.description}</TableCell>
                            <TableCell className="text-right font-medium">{formatINR(e.amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => delEarning(e.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Expenditures (Current Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No expenditures yet.</TableCell>
                      </TableRow>
                    ) : (
                      currentExpenses
                        .slice()
                        .sort((a, b) => (a.date < b.date ? -1 : 1))
                        .map((x) => (
                          <TableRow key={x.id} className="animate-fade-in">
                            <TableCell>{x.date}</TableCell>
                            <TableCell>
                              {x.category}
                              {x.category === "Products & Items" && x.description ? ` – ${x.description}` : ""}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatINR(x.amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => delExpense(x.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Monthly summary */}
        <section className="mt-10">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total Earned</TableHead>
                      <TableHead className="text-right">Total Expenditure</TableHead>
                      <TableHead className="text-right">Total Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No summaries yet. They will appear automatically at month end.</TableCell>
                      </TableRow>
                    ) : (
                      summaries
                        .slice()
                        .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
                        .map((m) => (
                          <TableRow key={m.id} className="animate-fade-in">
                            <TableCell>{m.monthLabel}</TableCell>
                            <TableCell className="text-right">{formatINR(m.totalEarned)}</TableCell>
                            <TableCell className="text-right">{formatINR(m.totalSpent)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatINR(m.totalProfit)}</TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
};

export default Index;