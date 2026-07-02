import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, User as UserIcon, Search, MessageSquare, Circle } from "lucide-react";

const ROLE_BADGE = {
  admin:  { label: "Admin",  cls: "bg-purple-100 text-purple-700" },
  lawyer: { label: "Lawyer", cls: "bg-blue-100 text-blue-700" },
  client: { label: "Client", cls: "bg-emerald-100 text-emerald-700" },
};

function Avatar({ name, size = "md" }) {
  const initials = name
    ? name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
  ];
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedUser]);

  useEffect(() => {
    if (selectedUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [msgRes, usrRes, caseRes, apptRes] = await Promise.all([
        api.get("/messages"),
        api.get("/users"),
        api.get("/cases"),
        api.get("/appointments"),
      ]);
      const sortedMessages = msgRes.data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(sortedMessages);

      const myLawyerIds = new Set([
        ...caseRes.data.map(c => c.assigned_to).filter(Boolean),
        ...apptRes.data.map(a => a.lawyer_id).filter(Boolean),
      ]);

      setUsers(usrRes.data.filter(u => {
        if (u.id === user.id) return false;
        if (u.role === "paralegal") return false;
        if (user.role === "lawyer") {
          return u.role === "admin" || u.role === "client";
        }
        if (user.role === "client") {
          if (u.role === "admin") return true;
          if (u.role === "lawyer") return myLawyerIds.has(u.id);
          return false;
        }
        return true;
      }));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedUser) return;
    try {
      const { data } = await api.post("/messages", {
        recipient_id: selectedUser.id,
        content: content.trim(),
      });
      setMessages(prev => [...prev, data]);
      setContent("");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const activeMessages = messages.filter(
    m => (m.sender_id === selectedUser?.id && m.recipient_id === user.id) ||
         (m.recipient_id === selectedUser?.id && m.sender_id === user.id)
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group contacts: those with messages first, sorted by latest message
  const usersWithLastMsg = filteredUsers.map(u => {
    const thread = messages.filter(
      m => (m.sender_id === u.id && m.recipient_id === user.id) ||
           (m.recipient_id === u.id && m.sender_id === user.id)
    );
    const lastMsg = thread[thread.length - 1] || null;
    const unread = thread.filter(m => m.sender_id === u.id && m.recipient_id === user.id).length;
    return { ...u, lastMsg, unread };
  }).sort((a, b) => {
    if (a.lastMsg && b.lastMsg) return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at);
    if (a.lastMsg) return -1;
    if (b.lastMsg) return 1;
    return a.name.localeCompare(b.name);
  });

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  activeMessages.forEach(m => {
    const d = new Date(m.created_at);
    const dateStr = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    if (dateStr !== lastDate) {
      groupedMessages.push({ type: "divider", label: dateStr });
      lastDate = dateStr;
    }
    groupedMessages.push({ type: "message", data: m });
  });

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* Page Header */}
      <div className="shrink-0 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Communication</div>
        <h1 className="text-3xl font-serif text-zinc-900 tracking-tight">Messages</h1>
        <p className="text-sm text-zinc-500 mt-1">Secure communication with your clients and firm staff.</p>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0 flex rounded-2xl border border-zinc-200 shadow-sm overflow-hidden bg-white">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-zinc-200 bg-zinc-50">

          {/* Search */}
          <div className="p-4 border-b border-zinc-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search contacts…"
                className="pl-9 h-9 rounded-lg bg-zinc-50 border-zinc-200 text-sm focus-visible:ring-indigo-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Contact List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-xs text-zinc-400">Loading contacts…</span>
              </div>
            ) : usersWithLastMsg.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 px-4 text-center">
                <UserIcon className="w-8 h-8 text-zinc-300" />
                <p className="text-sm text-zinc-500">No contacts found</p>
              </div>
            ) : (
              <div className="py-2">
                {usersWithLastMsg.map(u => {
                  const isSelected = selectedUser?.id === u.id;
                  const badge = ROLE_BADGE[u.role] || { label: u.role, cls: "bg-zinc-100 text-zinc-600" };
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-4 py-3.5 transition-colors flex items-start gap-3 ${
                        isSelected
                          ? "bg-indigo-50 border-l-2 border-indigo-600"
                          : "hover:bg-zinc-100 border-l-2 border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar name={u.name} size="md" />
                        {u.unread > 0 && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {u.unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm font-semibold truncate ${isSelected ? "text-indigo-900" : "text-zinc-900"}`}>
                            {u.name}
                          </span>
                          {u.lastMsg && (
                            <span className="text-[10px] text-zinc-400 shrink-0">
                              {new Date(u.lastMsg.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                          <p className={`text-xs truncate ${u.unread > 0 && !isSelected ? "font-semibold text-zinc-800" : "text-zinc-500"}`}>
                            {u.lastMsg ? u.lastMsg.content : <span className="italic text-zinc-400">No messages yet</span>}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── CHAT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="shrink-0 h-16 px-6 flex items-center gap-4 border-b border-zinc-200 bg-white shadow-sm z-10">
                <Avatar name={selectedUser.name} size="md" />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 truncate">{selectedUser.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                    <span className="text-xs text-zinc-500 capitalize">{selectedUser.role}</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-6 py-6 bg-zinc-50/30">
                <div className="space-y-1 max-w-3xl mx-auto">
                  {groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-zinc-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-600">Start the conversation</p>
                        <p className="text-xs text-zinc-400 mt-1">Send a message to {selectedUser.name} below.</p>
                      </div>
                    </div>
                  ) : (
                    groupedMessages.map((item, i) => {
                      if (item.type === "divider") {
                        return (
                          <div key={`div-${i}`} className="flex items-center gap-3 py-4">
                            <div className="flex-1 h-px bg-zinc-200"></div>
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">{item.label}</span>
                            <div className="flex-1 h-px bg-zinc-200"></div>
                          </div>
                        );
                      }
                      const m = item.data;
                      const isMe = m.sender_id === user.id;
                      return (
                        <div key={m._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                          <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            {!isMe && (
                              <Avatar name={selectedUser.name} size="sm" />
                            )}
                            <div className="flex flex-col">
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isMe
                                  ? "bg-indigo-600 text-white rounded-br-sm shadow-sm"
                                  : "bg-white text-zinc-900 border border-zinc-200 rounded-bl-sm shadow-sm"
                              }`}>
                                {m.content}
                              </div>
                              <span className={`text-[10px] text-zinc-400 mt-1 ${isMe ? "text-right" : "text-left"}`}>
                                {formatTime(m.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Compose Area */}
              <div className="shrink-0 px-6 py-4 bg-white border-t border-zinc-200">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      placeholder={`Message ${selectedUser.name}…`}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all leading-relaxed"
                      style={{ maxHeight: "120px", overflowY: "auto" }}
                    />
                    <p className="text-[10px] text-zinc-400 mt-1 ml-1">Press Enter to send, Shift+Enter for new line</p>
                  </div>
                  <button
                    type="submit"
                    disabled={!content.trim()}
                    className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all shadow-sm hover:shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-zinc-50/30 px-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center">
                  <MessageSquare className="w-9 h-9 text-indigo-400" />
                </div>
              </div>
              <div className="text-center max-w-xs">
                <h3 className="text-xl font-serif text-zinc-800">Your Messages</h3>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  Select a contact from the sidebar to start a secure conversation with your clients or firm staff.
                </p>
              </div>
              {usersWithLastMsg.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">Recent contacts</p>
                  {usersWithLastMsg.slice(0, 3).map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className="flex items-center gap-3 px-4 py-3 bg-white border border-zinc-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm group"
                    >
                      <Avatar name={u.name} size="sm" />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 group-hover:text-indigo-700 transition-colors">{u.name}</p>
                        <p className="text-xs text-zinc-400 capitalize">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
