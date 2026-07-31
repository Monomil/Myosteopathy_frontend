import { useCallback, useMemo, useRef, useState } from "react";
import { Download, Play, Loader2, CheckCircle, XCircle, ThumbsUp, ThumbsDown, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./FileUpload";
import { toast } from "sonner";
import { approveTransform, transformRecord } from "@/config/api";

type RecordStatus = "pending" | "transforming" | "transformed" | "failed" | "approved" | "rejected" | "cancelled";

// Cap simultaneous Ollama calls. Local Ollama processes one inference at a
// time; sending more in parallel just queues them and risks 408s under load.
const CONCURRENCY = 3;
const BULK_WARN_THRESHOLD = 100;

interface RecordState {
  raw: Record<string, unknown>;
  status: RecordStatus;
  schema?: string;
  after?: Record<string, unknown>;
  afterText: string;
  afterValid: boolean;
  error?: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function JsonMapper() {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [records, setRecords] = useState<RecordState[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleFilesProcessed = useCallback(
    (data: Record<string, unknown>[], _fields: string[], names: string[]) => {
      setFileNames(names);
      setRecords(
        data.map((raw) => ({
          raw,
          status: "pending",
          afterText: "",
          afterValid: false,
        }))
      );
    },
    []
  );

  const processAll = useCallback(async () => {
    if (records.length === 0) {
      toast.error("Upload a file first");
      return;
    }
    if (records.length > BULK_WARN_THRESHOLD) {
      const minutes = Math.ceil((records.length * 25) / CONCURRENCY / 60);
      const ok = confirm(
        `Processing ${records.length} records may take ~${minutes} min ` +
          `(local Ollama, ~25s/record, ${CONCURRENCY} at a time). Continue?`
      );
      if (!ok) return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);

    setRecords((prev) =>
      prev.map((r) =>
        r.status === "approved" || r.status === "rejected"
          ? r
          : { ...r, status: "transforming" }
      )
    );

    const updateOne = (idx: number, patch: Partial<RecordState>) => {
      setRecords((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const snapshot = records;
    const queue = snapshot
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status !== "approved" && r.status !== "rejected");

    let cursor = 0;
    const next = () => {
      if (controller.signal.aborted) return null;
      if (cursor >= queue.length) return null;
      return queue[cursor++];
    };

    const worker = async () => {
      while (true) {
        const item = next();
        if (!item) return;
        const { r, i } = item;
        try {
          const resp = await transformRecord(r.raw, { signal: controller.signal });
          const after = (resp.transformed as Record<string, unknown>) ?? {};
          updateOne(i, {
            status: "transformed",
            schema: (resp.schema as string | undefined) ?? "unknown",
            after,
            afterText: safeStringify(after),
            afterValid: true,
            error: undefined,
          });
        } catch (e) {
          if (controller.signal.aborted) {
            updateOne(i, { status: "cancelled", error: "Cancelled" });
          } else {
            updateOne(i, {
              status: "failed",
              error: e instanceof Error ? e.message : "Transform failed",
            });
          }
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    setRunning(false);
    abortRef.current = null;

    setRecords((prev) => {
      const ok = prev.filter((r) => r.status === "transformed").length;
      const failed = prev.filter((r) => r.status === "failed").length;
      const cancelled = prev.filter((r) => r.status === "cancelled").length;
      if (cancelled > 0) {
        toast.warning(`Cancelled. Transformed ${ok}, ${failed} failed, ${cancelled} cancelled`);
      } else if (failed === 0) {
        toast.success(`Transformed ${ok} records`);
      } else {
        toast.warning(`Transformed ${ok}, ${failed} failed`);
      }
      return prev;
    });
  }, [records]);

  const cancelProcessing = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const updateAfterText = useCallback((idx: number, text: string) => {
    setRecords((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        try {
          const parsed = JSON.parse(text);
          return { ...r, afterText: text, after: parsed, afterValid: true };
        } catch {
          return { ...r, afterText: text, afterValid: false };
        }
      })
    );
  }, []);

  const approve = useCallback(
    async (idx: number) => {
      const r = records[idx];
      if (!r || !r.schema || !r.afterValid || !r.after) {
        toast.error("Fix invalid JSON before approving");
        return;
      }
      try {
        await approveTransform({
          schema_name: r.schema,
          before: r.raw,
          after: r.after,
        });
        setRecords((prev) =>
          prev.map((row, i) => (i === idx ? { ...row, status: "approved" } : row))
        );
        toast.success("Approved → added to examples");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Approve failed");
      }
    },
    [records]
  );

  const reject = useCallback((idx: number) => {
    setRecords((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, status: "rejected" } : r))
    );
  }, []);

  const downloadJson = useCallback(() => {
    const transformed = records
      .filter((r) => r.after)
      .map((r) => r.after);
    if (transformed.length === 0) {
      toast.error("Nothing to download");
      return;
    }
    const blob = new Blob([JSON.stringify(transformed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transformed_${fileNames.join("_").replace(/\.[^.]+$/g, "") || "records"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [records, fileNames]);

  const summary = useMemo(() => {
    const total = records.length;
    const transforming = records.filter((r) => r.status === "transforming").length;
    const ok = records.filter((r) => r.status === "transformed").length;
    const approved = records.filter((r) => r.status === "approved").length;
    const rejected = records.filter((r) => r.status === "rejected").length;
    const failed = records.filter((r) => r.status === "failed").length;
    const cancelled = records.filter((r) => r.status === "cancelled").length;
    return { total, transforming, ok, approved, rejected, failed, cancelled };
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Transform & Review</h1>
        <p className="text-muted-foreground mt-1">
          Upload clinical records, let the LLM normalise them, then approve good
          outputs to teach the system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">File Ingestion</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onFilesProcessed={handleFilesProcessed} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-9">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Run</CardTitle>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {summary.total} record{summary.total === 1 ? "" : "s"}
              </span>
              {summary.transforming > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {summary.transforming} running
                </Badge>
              )}
              {summary.ok > 0 && (
                <Badge variant="default">{summary.ok} transformed</Badge>
              )}
              {summary.approved > 0 && (
                <Badge className="bg-green-600 hover:bg-green-700">
                  {summary.approved} approved
                </Badge>
              )}
              {summary.rejected > 0 && (
                <Badge variant="secondary">{summary.rejected} rejected</Badge>
              )}
              {summary.failed > 0 && (
                <Badge variant="destructive">{summary.failed} failed</Badge>
              )}
              {summary.cancelled > 0 && (
                <Badge variant="secondary">{summary.cancelled} cancelled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Each record is processed independently. After processing, review
              each one and approve to add it as a training example.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadJson}
                disabled={summary.ok === 0 && summary.approved === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {running ? (
                <Button variant="destructive" onClick={cancelProcessing}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              ) : (
                <Button onClick={processAll} disabled={records.length === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  Process &amp; Validate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {records.length > 0 && (
        <div className="space-y-4">
          {records.map((r, idx) => (
            <RecordCard
              key={idx}
              index={idx}
              record={r}
              onAfterTextChange={(text) => updateAfterText(idx, text)}
              onApprove={() => approve(idx)}
              onReject={() => reject(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RecordCardProps {
  index: number;
  record: RecordState;
  onAfterTextChange: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

function RecordCard({ index, record, onAfterTextChange, onApprove, onReject }: RecordCardProps) {
  const statusBadge = () => {
    switch (record.status) {
      case "pending":
        return <Badge variant="outline">pending</Badge>;
      case "transforming":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> transforming
          </Badge>
        );
      case "transformed":
        return <Badge>transformed</Badge>;
      case "failed":
        return <Badge variant="destructive">failed</Badge>;
      case "approved":
        return <Badge className="bg-green-600 hover:bg-green-700">approved</Badge>;
      case "rejected":
        return <Badge variant="secondary">rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">cancelled</Badge>;
    }
  };

  const reviewable = record.status === "transformed";

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm">Record #{index + 1}</CardTitle>
          {record.schema && (
            <Badge variant="outline" className="font-mono text-xs">
              {record.schema}
            </Badge>
          )}
          {statusBadge()}
        </div>
        {reviewable && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReject}>
              <ThumbsDown className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={!record.afterValid}
              className="bg-green-600 hover:bg-green-700"
            >
              <ThumbsUp className="h-4 w-4 mr-1" /> Approve
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {record.status === "failed" && (
          <div className="flex items-start gap-2 text-sm text-destructive mb-3">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{record.error}</span>
          </div>
        )}
        {record.status === "approved" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-3">
            <CheckCircle className="h-4 w-4" />
            <span>Added to examples — future transforms will use this.</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">BEFORE (raw)</div>
            <pre className="text-xs font-mono bg-muted p-3 rounded max-h-64 overflow-auto">
              {safeStringify(record.raw)}
            </pre>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center justify-between">
              <span>AFTER (editable)</span>
              {record.status === "transformed" && !record.afterValid && (
                <span className="text-destructive">Invalid JSON</span>
              )}
            </div>
            {record.status === "transformed" || record.status === "approved" ? (
              <Textarea
                value={record.afterText}
                onChange={(e) => onAfterTextChange(e.target.value)}
                className="font-mono text-xs h-64"
                disabled={record.status === "approved"}
              />
            ) : (
              <pre className="text-xs font-mono bg-muted p-3 rounded max-h-64 overflow-auto text-muted-foreground">
                {record.status === "pending" ? "(not yet processed)" : ""}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
