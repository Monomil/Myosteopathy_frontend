import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  type Example,
  type SchemaDef,
  deleteExample,
  listExamples,
  listSchemas,
} from "@/config/api";

const SOURCES: Array<Example["source"] | "all"> = ["all", "seed", "manual", "transform_approved"];

export default function ExamplesPage() {
  const [rows, setRows] = useState<Example[]>([]);
  const [schemas, setSchemas] = useState<SchemaDef[]>([]);
  const [schemaFilter, setSchemaFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [exRows, schRows] = await Promise.all([
        listExamples(schemaFilter !== "all" ? schemaFilter : undefined),
        listSchemas(),
      ]);
      const filtered =
        sourceFilter === "all" ? exRows : exRows.filter((r) => r.source === sourceFilter);
      setRows(filtered);
      setSchemas(schRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load examples");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaFilter, sourceFilter]);

  const remove = async (id: number) => {
    if (!confirm("Delete this example? This cannot be undone.")) return;
    try {
      await deleteExample(id);
      toast.success("Example deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Examples</CardTitle>
            <CardDescription>
              Before/after pairs used as few-shot context. Up to N most-recent
              per schema are injected into every transform.
            </CardDescription>
          </div>
        </div>
        <div className="flex gap-3 pt-3">
          <Select value={schemaFilter} onValueChange={setSchemaFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by schema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schemas</SelectItem>
              {schemas.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-32">Schema</TableHead>
              <TableHead className="w-40">Source</TableHead>
              <TableHead>Before → After (preview)</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
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
                  No examples match the current filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id}</TableCell>
                <TableCell className="font-mono text-xs">{row.schema_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.source}</Badge>
                  {row.approved_by && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {row.approved_by}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <pre className="line-clamp-2 whitespace-pre-wrap font-mono">
                    {JSON.stringify(row.before_json).slice(0, 80)}…
                    {" → "}
                    {JSON.stringify(row.after_json).slice(0, 80)}…
                  </pre>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                    <Trash2 className="h-4 w-4" />
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
