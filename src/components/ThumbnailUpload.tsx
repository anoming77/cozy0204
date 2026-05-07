import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

export function ThumbnailUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("이미지 파일만 가능합니다");
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("업로드되었습니다");
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="썸네일" className="h-40 rounded-md border object-cover" />
          <button type="button" onClick={() => onChange("")}
            className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow hover:bg-accent" aria-label="제거">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0]; if (f) upload(f);
          }}
          className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${
            dragOver ? "border-primary bg-accent/40" : "border-border bg-muted/30 hover:bg-accent/30"
          }`}
        >
          <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {uploading ? "업로드 중..." : "클릭 또는 드래그하여 이미지 업로드"}
          </span>
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      )}
      <button type="button" onClick={() => setShowUrl((v) => !v)} className="text-xs text-muted-foreground hover:text-primary">
        {showUrl ? "URL 입력 닫기" : "외부 이미지 URL로 입력"}
      </button>
      {showUrl && (
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
          {value && <Button type="button" variant="outline" size="sm" onClick={() => onChange("")}>지우기</Button>}
        </div>
      )}
    </div>
  );
}
