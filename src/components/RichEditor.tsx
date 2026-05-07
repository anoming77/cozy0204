import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UIcon, Strikethrough, List, ListOrdered, ListChecks,
  Quote, Code, Link2, Image as ImgIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
} from "lucide-react";

const COLOR_PRESETS: { color: string; label: string; tip: string }[] = [
  { color: "#1F1E1D", label: "기본", tip: "본문 기본 색" },
  { color: "#6B6660", label: "회색", tip: "보조 정보, 메타 텍스트" },
  { color: "#C9A876", label: "베이지", tip: "포인트 강조, 핵심 키워드" },
  { color: "#B85C38", label: "코랄", tip: "중요 경고, 결정적 강조" },
  { color: "#8C7B5C", label: "갈색", tip: "인용, 출처 표시" },
  { color: "#2D5F3F", label: "그린", tip: "보충 설명, 성공 표시" },
];

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`rounded p-1.5 text-sm hover:bg-accent ${active ? "bg-accent text-accent-foreground" : "text-foreground"}`}>
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl }).run();
  };

  const setLink = () => {
    const url = prompt("링크 URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-2">
      <select onChange={(e) => {
        const v = e.target.value;
        const c = editor.chain().focus();
        if (v === "p") c.setParagraph().run();
        else if (v === "small") c.setParagraph().run(); // small handled via class? keep simple
        else c.toggleHeading({ level: parseInt(v) as 1 | 2 | 3 }).run();
        e.target.value = "";
      }} className="mr-1 h-8 rounded border bg-background px-2 text-xs" defaultValue="">
        <option value="" disabled>크기</option>
        <option value="1">제목 H1</option>
        <option value="2">부제 H2</option>
        <option value="3">소제목 H3</option>
        <option value="p">본문</option>
      </select>

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게"><Bold className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임"><Italic className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="밑줄"><UIcon className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선"><Strikethrough className="h-4 w-4" /></ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      {/* Color presets */}
      <div className="flex items-center gap-0.5">
        {COLOR_PRESETS.map((c) => (
          <button key={c.color} type="button" title={`${c.label} — ${c.tip}`}
            onClick={() => editor.chain().focus().setColor(c.color).run()}
            className="h-5 w-5 rounded-full border border-border" style={{ background: c.color }} />
        ))}
      </div>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFF3B0" }).run()} active={editor.isActive("highlight")} title="형광펜"><Highlighter className="h-4 w-4" /></ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="왼쪽 정렬"><AlignLeft className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="가운데 정렬"><AlignCenter className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="오른쪽 정렬"><AlignRight className="h-4 w-4" /></ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="불릿"><List className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="번호"><ListOrdered className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="체크리스트"><ListChecks className="h-4 w-4" /></ToolbarBtn>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="인용"><Quote className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="코드 블록"><Code className="h-4 w-4" /></ToolbarBtn>
      <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="링크"><Link2 className="h-4 w-4" /></ToolbarBtn>

      <ToolbarBtn onClick={() => fileRef.current?.click()} title="이미지 업로드"><ImgIcon className="h-4 w-4" /></ToolbarBtn>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />

      <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표"><TableIcon className="h-4 w-4" /></ToolbarBtn>

      <button type="button" onClick={() => {
        const url = prompt("YouTube URL");
        if (!url) return;
        const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
        if (!m) return toast.error("URL을 인식할 수 없습니다");
        const html = `<div class="yt-embed"><iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen></iframe></div>`;
        editor.chain().focus().insertContent(html).run();
      }} className="ml-1 rounded border bg-background px-2 py-1 text-xs hover:bg-accent" title="YouTube 임베드">▶ YouTube</button>
    </div>
  );
}

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-blog min-h-[400px] focus:outline-none p-4",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. when loading existing post)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value === "" ? "empty" : "loaded-once"]);

  if (!editor) return <div className="h-[450px] rounded-md border bg-muted/20" />;

  return (
    <div className="rounded-md border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
