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
  type SchemaDef,
  createSchema,
  deleteSchema,
  listSchemas,
  updateSchema,
} from "@/config/api";

export default function SchemasPage() {
  const [rows, setRows] = useState<SchemaDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SchemaDef | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await listSchemas());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load schemas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setDraft({ name: "", description: "" });
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (row: SchemaDef) => {
    setDraft({ name: row.name, description: row.description });
    setEditing(row);
    setCreating(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await updateSchema(editing.id, draft);
        toast.success("Schema updated");
      } else {
        await createSchema(draft);
        toast.success("Schema created");
      }
      setCreating(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const toggleActive = async (row: SchemaDef) => {
    try {
      if (row.is_active) {
        await deleteSchema(row.id);
      } else {
        await updateSchema(row.id, { is_active: true });
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
          <CardTitle>Schemas</CardTitle>
          <CardDescription>
            Prompt-facing descriptions of each entity. Edits invalidate the pack
            cache on the next transform.
          </CardDescription>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Schema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit schema" : "New schema"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schema-name">Name</Label>
                <Input
                  id="schema-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="practitioner"
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schema-desc">Description</Label>
                <Textarea
                  id="schema-desc"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  rows={8}
                  placeholder="Schema: practitioner (users table). Required: ..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>
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
              <TableHead className="w-32">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
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
                  No schemas yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground line-clamp-2">
                  {row.description}
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
