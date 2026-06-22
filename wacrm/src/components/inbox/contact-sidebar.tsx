"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  User,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  Loader2,
  Sparkles,
  ExternalLink,
  FileText,
  Edit2,
  Save,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface ContactSidebarProps {
  contact: Contact | null;
  onContactUpdate?: (contact: Contact) => void;
}

export function ContactSidebar({ contact, onContactUpdate }: ContactSidebarProps) {
  const { accountId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // RAG States
  const [ragStatus, setRagStatus] = useState<string | null>(null);
  const [ragReport, setRagReport] = useState<string | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReport, setEditedReport] = useState("");

  useEffect(() => {
    if (contact) {
      setRagStatus(contact.rag_status || "idle");
      setRagReport(contact.rag_report || null);
      setEditedReport(contact.rag_report || "");
      setIsEditingReport(false);
    } else {
      setRagStatus(null);
      setRagReport(null);
      setEditedReport("");
      setIsEditingReport(false);
    }
  }, [contact]);

  // Polling for RAG status updates
  useEffect(() => {
    if (!contact || ragStatus !== "processing") return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("rag_status, rag_report")
        .eq("id", contact.id)
        .single();

      if (!error && data) {
        if (data.rag_status !== "processing") {
          setRagStatus(data.rag_status);
          setRagReport(data.rag_report);
          setEditedReport(data.rag_report || "");
          if (onContactUpdate) {
            onContactUpdate({
              ...contact,
              rag_status: data.rag_status,
              rag_report: data.rag_report
            });
          }
          clearInterval(intervalId);
        }
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [contact, ragStatus, onContactUpdate]);

  const handleTriggerRag = useCallback(async () => {
    if (!contact) return;
    setRagStatus("processing");
    if (onContactUpdate) {
      onContactUpdate({
        ...contact,
        rag_status: "processing"
      });
    }

    try {
      console.log(`Disparando pipeline RAG para o contato ${contact.id}`);
      const response = await fetch(`http://localhost:8000/api/analisar-rag/${contact.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Erro ao disparar análise RAG no backend.");
      }

      console.log("Pipeline RAG disparado com sucesso!");
    } catch (err) {
      console.error(err);
      setRagStatus("failed");
      if (onContactUpdate) {
        onContactUpdate({
          ...contact,
          rag_status: "failed"
        });
      }
    }
  }, [contact, onContactUpdate]);

  const handleSaveReport = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .update({ rag_report: editedReport })
      .eq("id", contact.id);

    if (!error) {
      setRagReport(editedReport);
      setIsEditingReport(false);
      if (onContactUpdate) {
        onContactUpdate({
          ...contact,
          rag_report: editedReport
        });
      }
    } else {
      alert("Erro ao salvar o relatório: " + error.message);
    }
  }, [contact, editedReport, onContactUpdate]);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    // Fetch deals, notes, and tags in parallel
    const [dealsRes, notesRes, tagsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
  }, [contact]);

  // Load on contact change. setContactData/setTags run inside async
  // Supabase callbacks, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Dep is the whole `contact` object (not `contact?.phone`) so the
    // React Compiler's inference agrees with the manual dep list —
    // fixes the `preserve-manual-memoization` lint error.
  }, [contact]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        account_id: accountId,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-70 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  const displayName = contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-70 flex-col border-l border-border bg-card">
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {/* Contact Info */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {displayName}
            </h3>
            {contact.company && (
              <p className="text-xs text-muted-foreground">{contact.company}</p>
            )}
          </div>

          {/* Phone */}
          <div className="mt-4 space-y-2">
            <button
              onClick={handleCopyPhone}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{contact.phone}</span>
              {copied ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TagIcon className="h-3 w-3" />
              Tags
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No tags</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.contact_tag_id}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Active Deals */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              Active Deals
            </div>
            <div className="mt-2 space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No deals</p>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deal.currency ?? "$"}
                        {deal.value.toLocaleString()}
                      </span>
                      {deal.stage && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${deal.stage.color}20`,
                            color: deal.stage.color,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* RAG Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                Análise RAG IA
              </div>
              {ragStatus && (
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  ragStatus === "idle" && "bg-muted text-muted-foreground",
                  ragStatus === "processing" && "bg-yellow-500/10 text-yellow-500 animate-pulse",
                  ragStatus === "completed" && "bg-emerald-500/10 text-emerald-500",
                  ragStatus === "failed" && "bg-red-500/10 text-red-500"
                )}>
                  {ragStatus === "idle" && "Inativo"}
                  {ragStatus === "processing" && "Analisando..."}
                  {ragStatus === "completed" && "Concluído"}
                  {ragStatus === "failed" && "Erro"}
                </span>
              )}
            </div>

            {/* RAG Attachments & Links */}
            {contact.additional_data && (
              <div className="mt-2 space-y-2 rounded-lg border border-border/65 bg-muted/30 p-2.5 text-xs">
                {/* Files */}
                {contact.additional_data.files && contact.additional_data.files.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground/80 block mb-1">Arquivos Enviados:</span>
                    <div className="space-y-1">
                      {contact.additional_data.files.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline truncate animate-fadeIn"
                        >
                          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                {contact.additional_data.links && contact.additional_data.links.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-foreground/80 block mb-1">Links de Referência:</span>
                    <div className="space-y-1">
                      {contact.additional_data.links.map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline truncate"
                        >
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{link.label || link.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Texts */}
                {contact.additional_data.texts && contact.additional_data.texts.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-border/40 pt-1.5">
                    {contact.additional_data.texts.map((t, i) => t.text?.trim() && (
                      <div key={i}>
                        <span className="font-semibold text-foreground/80 block">{t.label}:</span>
                        <p className="text-[11px] text-muted-foreground whitespace-pre-line bg-muted/50 p-1.5 rounded border border-border/40 mt-0.5 max-h-24 overflow-y-auto">{t.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trigger Button */}
            <div className="mt-3">
              <Button
                onClick={handleTriggerRag}
                disabled={ragStatus === "processing"}
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-1.5"
              >
                {ragStatus === "processing" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processando RAG...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Analisar Conteúdo (RAG)</span>
                  </>
                )}
              </Button>
            </div>

            {/* Report Result Section */}
            {ragReport && (
              <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <File className="h-3.5 w-3.5 text-primary" />
                    Relatório Gerado
                  </span>
                  {!isEditingReport ? (
                    <Button
                      variant="ghost"
                      onClick={() => setIsEditingReport(true)}
                      className="h-7 px-2 text-xs flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsEditingReport(false);
                          setEditedReport(ragReport);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveReport}
                        className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                      >
                        <Save className="h-3 w-3" />
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingReport ? (
                  <textarea
                    value={editedReport}
                    onChange={(e) => setEditedReport(e.target.value)}
                    rows={8}
                    className="w-full resize-y rounded-lg border border-border bg-muted px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                ) : (
                  <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border border-border/40">
                    {ragReport}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" />
              Notes
            </div>
            <div className="mt-2">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <Button
                  size="sm"
                  className="h-auto bg-primary px-2 hover:bg-primary/90"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
