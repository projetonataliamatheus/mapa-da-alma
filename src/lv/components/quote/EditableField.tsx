// @ts-nocheck
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Upload, Trash2, Plus, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lv/integrations/supabase/client";
import { useToast } from "@/lv/hooks/use-toast";

const FIELD_LABEL_MAP: Record<string, string> = {
  emoji: "Emoji",
  title: "Título",
  desc: "Descrição",
  description: "Descrição",
  content: "Conteúdo",
  day: "Etapa",
  name: "Nome",
  label: "Rótulo",
  subtitle: "Subtítulo",
  text: "Texto",
  url: "Link",
  a: "Resposta",
  q: "Pergunta",
};

/* ─── EditableText ─── */
interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  children?: React.ReactNode;
}

export function EditableText({ value, onSave, className, style, multiline, children }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    const inputStyle: React.CSSProperties = {
      ...style,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
      border: "2px solid hsl(var(--primary))",
      borderRadius: 8,
      padding: "6px 12px",
      color: "#fff",
      width: "100%",
      outline: "none",
      fontSize: "inherit",
      fontWeight: "inherit",
      fontFamily: "inherit",
      lineHeight: "inherit",
    };

    return multiline ? (
      <textarea
        ref={ref as any}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        style={inputStyle}
        rows={3}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Escape") cancel(); }}
      />
    ) : (
      <input
        ref={ref as any}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        style={inputStyle}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
      />
    );
  }

  return (
    <span
      className={`editable-field group/ef relative cursor-pointer inline ${className || ""}`}
      style={style}
      onClick={e => { e.stopPropagation(); e.preventDefault(); setEditing(true); }}
    >
      {children ?? value}
      <span className="editable-pencil absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg z-30 opacity-0 group-hover/ef:opacity-100 transition-opacity pointer-events-none">
        <Pencil className="h-3 w-3" />
      </span>
    </span>
  );
}

/* ─── EditableImage ─── */
interface EditableImageProps {
  src: string;
  onSave: (url: string) => void;
  storagePath: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function EditableImage({ src, onSave, storagePath, className, style, children }: EditableImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${storagePath}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    onSave(urlData.publicUrl + "?t=" + Date.now());
    toast({ title: "Imagem atualizada!" });
    setUploading(false);
  };

  return (
    <div className={`editable-image group/ei relative cursor-pointer ${className || ""}`} style={style}>
      {children}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <div
        className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover/ei:opacity-100 transition-opacity rounded-lg"
        onClick={e => { e.stopPropagation(); e.preventDefault(); inputRef.current?.click(); }}
      >
        <div className="flex items-center gap-2 bg-white/90 text-black rounded-full px-4 py-2 text-sm font-semibold shadow-lg">
          {uploading ? (
            <span className="animate-pulse">Enviando...</span>
          ) : (
            <><Upload className="h-4 w-4" /> Trocar imagem</>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── EditableEmoji ─── */
interface EditableEmojiProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function EditableEmoji({ value, onSave, className, style }: EditableEmojiProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="text-center w-16 bg-black/60 backdrop-blur border-2 border-primary rounded-lg text-3xl outline-none"
        onBlur={() => { onSave(draft); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      className={`editable-field group/ef relative cursor-pointer ${className || ""}`}
      style={style}
      onClick={e => { e.stopPropagation(); setEditing(true); }}
    >
      {value}
      <span className="editable-pencil absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg z-30 opacity-0 group-hover/ef:opacity-100 transition-opacity pointer-events-none">
        <Pencil className="h-2.5 w-2.5" />
      </span>
    </span>
  );
}

/* ─── EditableCard ─── */
interface EditableCardProps {
  fields: Record<string, string>;
  fieldLabels?: Record<string, string>;
  onSave: (fields: Record<string, string>) => void;
  onDelete?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function EditableCard({ fields, fieldLabels, onSave, onDelete, children, className, style }: EditableCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fields);

  useEffect(() => { setDraft(fields); }, [fields]);

  const save = () => { onSave(draft); setEditing(false); };

  return (
    <div className={`editable-card group/ec relative ${className || ""}`} style={style}>
      {children}
      {/* Hover controls */}
      <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-0 group-hover/ec:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); setEditing(!editing); }}
          className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
        >
          <Pencil className="h-3 w-3" />
        </button>
        {onDelete && (
          <button
            onClick={e => {
              e.stopPropagation();
              if (window.confirm("Tem certeza que deseja excluir este item?")) {
                onDelete();
              }
            }}
            className="bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {/* Inline edit panel */}
      {editing && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); setEditing(false); }}
        >
          <div
            className="w-full max-w-md mx-4 p-5 rounded-xl border shadow-2xl space-y-3 bg-white text-gray-900"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800">Editar</p>
            {Object.keys(draft).map(key => {
              const label = fieldLabels?.[key] || FIELD_LABEL_MAP[key] || key;
              return (
                <div key={key} className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                    {label}
                  </label>
                  {key === "desc" || key === "a" || key === "description" || key === "content" ? (
                    <textarea
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      value={draft[key]}
                      onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={draft[key]}
                      onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold">Cancelar</button>
              <button onClick={save} className="px-4 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AddCardButton ─── */
export function AddCardButton({ onClick, label = "Adicionar" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border-2 border-dashed border-primary/30 p-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary/60 hover:border-primary/60 hover:text-primary/80 hover:bg-primary/5 transition-all"
    >
      <Plus className="h-5 w-5" /> {label}
    </button>
  );
}
