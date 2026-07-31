import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

// Common wrapper keys used when a JSON file isn't a bare array.
// Order matters: we pick the first wrapper key that resolves to an array.
const WRAPPER_KEYS = ["results", "data", "items", "records"] as const;

function extractRecords(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of WRAPPER_KEYS) {
      const val = obj[key];
      if (Array.isArray(val)) {
        return val as Record<string, unknown>[];
      }
    }
    // No wrapper match — treat the object itself as a single record.
    return [obj];
  }
  return [];
}

interface ProcessedFile {
  name: string;
  data: Record<string, unknown>[];
  fields: string[];
  status: "valid" | "error";
  error?: string;
}

interface FileUploadProps {
  onFilesProcessed: (data: Record<string, unknown>[], fields: string[], fileNames: string[]) => void;
}

export function FileUpload({ onFilesProcessed }: FileUploadProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const emitCombinedData = useCallback((updatedFiles: ProcessedFile[]) => {
    const validFiles = updatedFiles.filter(f => f.status === "valid");
    const combinedData = validFiles.flatMap(f => f.data);
    const allFields = [...new Set(validFiles.flatMap(f => f.fields))];
    const names = validFiles.map(f => f.name);
    onFilesProcessed(combinedData, allFields, names);
  }, [onFilesProcessed]);

  const processFile = useCallback((file: File): Promise<ProcessedFile> => {
    return new Promise((resolve) => {
      const isJSON = file.name.endsWith(".json");
      const isCSV = file.name.endsWith(".csv");

      if (!isJSON && !isCSV) {
        resolve({ name: file.name, data: [], fields: [], status: "error", error: "Unsupported format. Use JSON or CSV." });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (isJSON) {
            const parsed = JSON.parse(content);
            const dataArray = extractRecords(parsed);
            if (dataArray.length === 0) {
              resolve({
                name: file.name,
                data: [],
                fields: [],
                status: "error",
                error: "No records found. Expected an array, or an object with a results/data/items/records array.",
              });
              return;
            }
            const fields = Object.keys(dataArray[0] ?? {});
            resolve({ name: file.name, data: dataArray, fields, status: "valid" });
          } else {
            Papa.parse(content, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                if (results.errors.length > 0) {
                  resolve({ name: file.name, data: [], fields: [], status: "error", error: results.errors[0].message });
                  return;
                }
                resolve({ name: file.name, data: results.data as Record<string, unknown>[], fields: results.meta.fields || [], status: "valid" });
              },
              error: (error) => {
                resolve({ name: file.name, data: [], fields: [], status: "error", error: error.message });
              }
            });
          }
        } catch (error) {
          resolve({ name: file.name, data: [], fields: [], status: "error", error: error instanceof Error ? error.message : "Parse failed" });
        }
      };
      reader.onerror = () => resolve({ name: file.name, data: [], fields: [], status: "error", error: "Failed to read file" });
      reader.readAsText(file);
    });
  }, []);

  const addFiles = useCallback(async (fileList: FileList) => {
    setIsProcessing(true);
    const newFiles = await Promise.all(Array.from(fileList).map(processFile));
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      emitCombinedData(updated);
      return updated;
    });
    setIsProcessing(false);
  }, [processFile, emitCombinedData]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      emitCombinedData(updated);
      return updated;
    });
  }, [emitCombinedData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          accept=".json,.csv"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            {isProcessing ? (
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {isProcessing ? "Processing..." : "Drop files here or click to browse"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports JSON & CSV — multiple files allowed
              </p>
            </div>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg",
                f.status === "valid" ? "bg-green-50 dark:bg-green-950/20" : "bg-destructive/10"
              )}
            >
              {f.status === "valid" ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <FileText className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium truncate">{f.name}</span>
              {f.status === "valid" && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {f.data.length} records
                </span>
              )}
              {f.error && (
                <span className="text-xs text-destructive truncate">{f.error}</span>
              )}
              <button
                onClick={() => removeFile(i)}
                className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
