import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Power } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  type Rule,
  createRule,
  deleteRule,
  listRules,
  updateRule,
} from "@/config/api";

export default function RulesPage() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    schema_name: string;
    name: string;
    text: string;
  }>({ schema_name: "", name: "", text: "" });

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await listRules());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setDraft({ schema_name: "", name: "", text: "" });
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (row: Rule) => {
    setDraft({
      schema_name: row.schema_name ?? "",
      name: row.name,
      text: row.text,
    });
    setEditing(row);
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        schema_name: draft.schema_name.trim() || null,
        name: draft.name,
        text: draft.text,
      };
      if (editing) {
        await updateRule(editing.id, payload);
        toast.success("Rule updated");
      } else {
        await createRule(payload);
        toast.success("Rule created");
      }
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const toggleActive = async (row: Rule) => {
    try {
      if (row.is_active) {
        await deleteRule(row.id);
      } else {
        await updateRule(row.id, { is_active: true });
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Rules</CardTitle>
          <CardDescription>
            Transformation rules injected into the LLM prompt. Leave Schema
            blank to apply to all schemas.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit rule" : "New rule"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rule-schema">Schema (optional)</Label>
                  <Input
                    id="rule-schema"
                    value={draft.schema_name}
                    onChange={(e) =>
                      setDraft({ ...draft, schema_name: e.target.value })
                    }
                    placeholder="practitioner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Name</Label>
                  <Input
                    id="rule-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="title_normalization"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-text">Text</Label>
                <Textarea
                  id="rule-text"
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  rows={6}
                  placeholder="Valid titles: Mr,Mrs,Miss,Ms... Remove trailing '.' before validation."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Schema</TableHead>
              <TableHead className="w-40">Name</TableHead>
              <TableHead>Text</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No rules yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">
                  {row.schema_name ?? <span className="text-muted-foreground">all</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">{row.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground line-clamp-2">
                  {row.text}
                </TableCell>
                <TableCell>
                  <Badge variant={row.is_active ? "default" : "secondary"}>
                    {row.is_active ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(row)}
                    title={row.is_active ? "Deactivate" : "Activate"}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
