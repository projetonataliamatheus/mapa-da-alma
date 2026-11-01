// @ts-nocheck
"use client";
import { useState } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, Plus, Trash2, GripVertical, Type, Image, Film, Images, RefreshCw } from "lucide-react";
import { Button } from "@/lv/components/ui/button";
import { ScrollArea } from "@/lv/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/lv/components/ui/popover";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/lv/components/ui/alert-dialog";
import type { SectionDefinition } from "@/lv/lib/sectionTypes";
import { CUSTOM_SECTION_TYPES, createCustomSection } from "@/lv/lib/sectionTypes";
import { SOPHISTICATED_ICONS } from "@/lv/components/icons/SophisticatedIcons";

interface Props {
  sections: SectionDefinition[];
  onChange: (sections: SectionDefinition[]) => void;
  activeId?: string;
  onSelect?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onReset?: () => void;
  onRefresh?: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  video: <Film className="h-3.5 w-3.5" />,
  carousel: <Images className="h-3.5 w-3.5" />,
};

const renderSectionIcon = (section: SectionDefinition) => {
  if (section.type !== "builtin") return TYPE_ICONS[section.type];
  const Icon = SOPHISTICATED_ICONS[section.icon];
  return Icon ? <Icon size={22} /> : section.icon;
};

export default function SectionManager({ sections, onChange, activeId, onSelect, onDoubleClick, onReset, onRefresh }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const arr = [...sections];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    onChange(arr);
  };

  const toggleVisible = (index: number) => {
    const arr = [...sections];
    arr[index] = { ...arr[index], visible: !arr[index].visible };
    onChange(arr);
  };

  const remove = (index: number) => {
    if (sections[index].type === "builtin") return;
    onChange(sections.filter((_, i) => i !== index));
  };

  const addSection = (type: SectionDefinition["type"]) => {
    const newSection = createCustomSection(type);
    onChange([...sections, newSection]);
    onSelect?.(newSection.id);
    setAddOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Seções</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar seções" onClick={() => onRefresh?.()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Resetar ordem" onClick={() => setShowResetConfirm(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Adicionar seção">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" side="bottom" align="end">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">Adicionar Seção</p>
              {CUSTOM_SECTION_TYPES.map(ct => (
                <button
                  key={ct.type}
                  onClick={() => addSection(ct.type)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <span className="text-base">{ct.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{ct.label}</p>
                    <p className="text-[10px] text-muted-foreground">{ct.description}</p>
                  </div>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {sections.map((section, i) => (
            <div
              key={section.id}
              onClick={() => onSelect?.(section.id)}
              onDoubleClick={() => onDoubleClick?.(section.id)}
              className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                activeId === section.id
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : section.visible
                  ? "hover:bg-muted/50 text-foreground"
                  : "hover:bg-muted/30 text-muted-foreground/50"
              }`}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              
              <span className="text-sm flex-shrink-0 min-w-[24px] flex justify-center">
                {renderSectionIcon(section)}
              </span>
              
              <span className={`flex-1 truncate text-[11px] font-medium ${!section.visible ? "line-through opacity-50" : ""}`}>
                {section.label}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); move(i, -1); }}
                  disabled={i === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); move(i, 1); }}
                  disabled={i === sections.length - 1}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-20"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); toggleVisible(i); }}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
                {section.type !== "builtin" && (
                  <button
                    onClick={e => { e.stopPropagation(); remove(i); }}
                    className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer spacer */}
      <div className="px-3 py-2 border-t border-border" />

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Resetar organização de seções?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai restaurar a ordem e visibilidade das seções para o layout original padrão. Todas as seções customizadas (texto, imagem, vídeo, carrossel) serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onReset?.(); setShowResetConfirm(false); }}
            >
              Resetar Padrão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
