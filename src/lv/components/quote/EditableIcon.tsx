// @ts-nocheck
"use client";
import { useState, useRef } from "react";
import { Pencil, Upload, Type, Image as ImageIcon, X, Link } from "lucide-react";
import { supabase } from "@/lv/integrations/supabase/client";
import { useToast } from "@/lv/hooks/use-toast";

interface EditableIconProps {
  emoji: string;
  iconUrl?: string;
  customIconSize?: number;
  onSave: (data: { emoji: string; icon_url?: string }) => void;
  className?: string;
  /** Optional render override — renders a sophisticated icon (SVG component, mapped icon, etc.)
   *  instead of showing the raw emoji/key string. Used to keep editor preview in sync with public page. */
  renderNode?: React.ReactNode;
}

export function EditableIcon({ emoji, iconUrl, customIconSize = 40, onSave, className, renderNode }: EditableIconProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editingEmoji, setEditingEmoji] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [draft, setDraft] = useState(emoji);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSaveUrl = () => {
    if (!urlDraft.trim()) return;
    onSave({ emoji, icon_url: urlDraft.trim() });
    toast({ title: "Ícone atualizado via URL!" });
    setEditingUrl(false);
    setUrlDraft("");
    setShowMenu(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `templates/icons/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    onSave({ emoji, icon_url: urlData.publicUrl + "?t=" + Date.now() });
    toast({ title: "Ícone atualizado!" });
    setUploading(false);
    setShowMenu(false);
  };

  const handleSaveEmoji = () => {
    onSave({ emoji: draft, icon_url: undefined });
    setEditingEmoji(false);
    setShowMenu(false);
  };

  const handleRemoveImage = () => {
    onSave({ emoji, icon_url: undefined });
    setShowMenu(false);
  };

  if (editingEmoji) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="text-center w-16 bg-black/60 backdrop-blur border-2 border-primary rounded-lg text-3xl outline-none"
        onBlur={handleSaveEmoji}
        onKeyDown={e => {
          if (e.key === "Enter") handleSaveEmoji();
          if (e.key === "Escape") { setDraft(emoji); setEditingEmoji(false); setShowMenu(false); }
        }}
      />
    );
  }

  if (editingUrl) {
    return (
      <div className="flex flex-col gap-1 min-w-[220px] bg-card border border-border rounded-xl shadow-2xl p-3 z-50" onClick={e => e.stopPropagation()}>
        <label className="text-[10px] font-medium text-muted-foreground">URL da imagem ou GIF</label>
        <input
          autoFocus
          value={urlDraft}
          onChange={e => setUrlDraft(e.target.value)}
          placeholder="https://exemplo.com/icone.gif"
          className="w-full px-2 py-1.5 text-xs bg-muted/50 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary text-foreground"
          onKeyDown={e => {
            if (e.key === "Enter") handleSaveUrl();
            if (e.key === "Escape") { setEditingUrl(false); setUrlDraft(""); }
          }}
        />
        <button onClick={handleSaveUrl} className="mt-1 w-full px-2 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Aplicar
        </button>
      </div>
    );
  }

  const renderIcon = () => {
    if (iconUrl) {
      return (
        <img
          src={iconUrl}
          alt="icon"
          className="object-contain"
          style={{ width: customIconSize, height: customIconSize }}
        />
      );
    }
    if (renderNode !== undefined && renderNode !== null) return renderNode;
    return emoji;
  };

  return (
    <span
      className={`editable-field group/ei relative cursor-pointer inline-block ${className || ""}`}
      onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
    >
      {renderIcon()}
      <span className="editable-pencil absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg z-30 opacity-0 group-hover/ei:opacity-100 transition-opacity pointer-events-none">
        <Pencil className="h-2.5 w-2.5" />
      </span>

      {showMenu && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-card border border-border rounded-xl shadow-2xl p-2 min-w-[160px]"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setEditingEmoji(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Type className="h-3.5 w-3.5" /> Usar Emoji
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {uploading ? "Enviando..." : "Enviar Imagem/GIF"}
          </button>
          <button
            onClick={() => { setEditingUrl(true); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Link className="h-3.5 w-3.5" /> Colar Link (GIF/URL)
          </button>
          {iconUrl && (
            <button
              onClick={handleRemoveImage}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
            >
              <X className="h-3.5 w-3.5" /> Remover Imagem
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml,image/gif" className="hidden" onChange={handleUpload} />
        </div>
      )}
    </span>
  );
}
