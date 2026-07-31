import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Snapshot, listSnapshots, takeSnapshot } from "@/config/api";

export default function SnapshotsPage() {
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await listSnapshots());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await takeSnapshot(name.trim());
      toast.success("Snapshot taken");
      setOpen(false);
      setName("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot failed");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Snapshots</CardTitle>
          <CardDescription>
            Frozen point-in-time copies of the active pack. Useful for
            reproducibility when running evaluations.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Camera className="h-4 w-4 mr-2" />
              Take Snapshot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take snapshot of current pack</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="snap-name">Name</Label>
              <Input
                id="snap-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="v2-with-status-rule-tweak"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Snapshot</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32">Items</TableHead>
              <TableHead className="w-48">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No snapshots yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.items?.length ?? 0}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.created_at}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
