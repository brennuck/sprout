"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DataActionsProps {
  onSuccess: () => void;
}

export function DataActions({ onSuccess }: DataActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch("/api/data/download");
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: "application/json" 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `budget-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent);

        const res = await fetch("/api/data/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        onSuccess();
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  return (
    <Card>
      <CardHeader className="mb-0">
        <CardTitle>Data Management</CardTitle>
        <p className="text-sm text-sage-500 mt-1">
          Backup or restore your budget data
        </p>
      </CardHeader>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
          isLoading={isDownloading}
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleUpload}
          isLoading={isUploading}
        >
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>
    </Card>
  );
}

