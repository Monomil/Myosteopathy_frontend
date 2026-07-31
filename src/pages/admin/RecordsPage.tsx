import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AppointmentRecord,
  type PractitionerRecord,
  listAppointments,
  listPractitioners,
} from "@/config/api";

const PAGE_SIZE = 50;

export default function RecordsPage() {
  const [tab, setTab] = useState<"practitioners" | "appointments">("practitioners");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persisted Records</CardTitle>
        <CardDescription>
          Transformed practitioner and appointment records saved to the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
          </TabsList>
          <TabsContent value="practitioners" className="pt-4">
            <PractitionersTable />
          </TabsContent>
          <TabsContent value="appointments" className="pt-4">
            <AppointmentsTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PractitionersTable() {
  const [rows, setRows] = useState<PractitionerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [pendingQuery, setPendingQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PractitionerRecord | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const page = await listPractitioners({
        limit: PAGE_SIZE,
        offset,
        q: pendingQuery || undefined,
      });
      setRows(page.items);
      setTotal(page.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load practitioners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, pendingQuery]);

  const applySearch = () => {
    setOffset(0);
    setPendingQuery(search.trim());
  };

  return (
    <RecordsListShell
      total={total}
      offset={offset}
      onOffset={setOffset}
      loading={loading}
      searchBar={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-24">Practice</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-44">Created</TableHead>
            <TableHead className="w-16 text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No practitioners.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell>
                {[r.first_name, r.last_name].filter(Boolean).join(" ") || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs">{r.email ?? <Muted />}</TableCell>
              <TableCell className="font-mono text-xs">{r.practice_id ?? <Muted />}</TableCell>
              <TableCell className="text-xs">{r.phone_number ?? <Muted />}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.created_at?.replace("T", " ").slice(0, 19)}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <JsonViewerDialog
        open={!!viewing}
        title={viewing ? `Practitioner #${viewing.id}` : ""}
        record={viewing}
        onClose={() => setViewing(null)}
      />
    </RecordsListShell>
  );
}

function AppointmentsTable() {
  const [rows, setRows] = useState<AppointmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<AppointmentRecord | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const page = await listAppointments({
        limit: PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
      });
      setRows(page.items);
      setTotal(page.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, statusFilter]);

  return (
    <RecordsListShell
      total={total}
      offset={offset}
      onOffset={setOffset}
      loading={loading}
      searchBar={
        <Input
          placeholder="Filter by status (draft, completed, ...)"
          value={statusFilter}
          onChange={(e) => {
            setOffset(0);
            setStatusFilter(e.target.value);
          }}
          className="w-72"
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead className="w-24">Practitioner</TableHead>
            <TableHead className="w-24">Patient</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-44">Created</TableHead>
            <TableHead className="w-16 text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                No appointments.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.id}</TableCell>
              <TableCell className="font-mono text-xs">{r.practitioner_id ?? <Muted />}</TableCell>
              <TableCell className="font-mono text-xs">{r.patient_id ?? <Muted />}</TableCell>
              <TableCell className="text-xs">{r.status ?? <Muted />}</TableCell>
              <TableCell className="text-xs">{r.start_time ?? <Muted />}</TableCell>
              <TableCell className="text-xs">{r.title ?? <Muted />}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.created_at?.replace("T", " ").slice(0, 19)}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <JsonViewerDialog
        open={!!viewing}
        title={viewing ? `Appointment #${viewing.id}` : ""}
        record={viewing}
        onClose={() => setViewing(null)}
      />
    </RecordsListShell>
  );
}

interface RecordsListShellProps {
  total: number;
  offset: number;
  onOffset: (v: number) => void;
  loading: boolean;
  searchBar: React.ReactNode;
  children: React.ReactNode;
}

function RecordsListShell({
  total,
  offset,
  onOffset,
  loading,
  searchBar,
  children,
}: RecordsListShellProps) {
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {searchBar}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {loading ? "…" : `${pageStart}–${pageEnd} of ${total}`}
          </span>
          <div className="flex">
            <Button
              size="sm"
              variant="outline"
              disabled={!canPrev}
              onClick={() => onOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canNext}
              onClick={() => onOffset(offset + PAGE_SIZE)}
              className="ml-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Muted() {
  return <span className="text-muted-foreground">—</span>;
}

interface JsonViewerDialogProps {
  open: boolean;
  title: string;
  record: PractitionerRecord | AppointmentRecord | null;
  onClose: () => void;
}

function JsonViewerDialog({ open, title, record, onClose }: JsonViewerDialogProps) {
  const text = useMemo(
    () => (record ? JSON.stringify(record.transformed_json, null, 2) : ""),
    [record]
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="text-xs font-mono bg-muted p-3 rounded max-h-[60vh] overflow-auto">
          {text}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
