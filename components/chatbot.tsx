"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  FileText,
  Menu,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Card, CardHeader } from "./ui/card";

interface Message {
  sender: "user" | "bot";
  text: string;
  id?: string;
  rated?: boolean;
}

const optionLabels: Record<string, string> = {
  syllabus: "Course Syllabus",
  "module-1": "Module 1: Risk Management Fundamentals",
  "module-2": "Module 2: Compliance and Risk Management Plan Development",
  "module-3": "Module 3: Risk Assessment",
  "module-4": "Module 4: Identify and Analyze Assets, Activities, Threats, Vulnerabilities & Exploits",
  "module-5": "Module 5: Risk Mitigation",
  "module-6": "Module 6: Risk Mitigation Plan and Business Impact Analysis",
  "module-7": "Module 7: Risk Mitigation Plan Using Business Continuity Plan",
};

const optionDescriptions: Record<string, string> = {
  syllabus: "Course policies, outcomes, grading model, and weekly expectations.",
  "module-1": "Core concepts and terminology for cybersecurity risk management.",
  "module-2": "Compliance mapping and foundations for building risk plans.",
  "module-3": "Risk assessment methodology, scoring, and interpretation.",
  "module-4": "Asset, threat, vulnerability, exploit, and activity analysis.",
  "module-5": "Mitigation strategies and control prioritization.",
  "module-6": "Business impact analysis and mitigation planning integration.",
  "module-7": "Continuity planning and operational risk response.",
};

const quickActions = [
  "Summarize this module",
  "Quiz me on NIST Framework",
  "Check assignment due date",
];

function formatBotParagraphs(text: string): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\s+(\d+\.\s+\*\*)/g, "\n\n$1")
    .replace(/\s+(\d+\.\s+)/g, "\n\n$1")
    .replace(/\s+(-\s+)/g, "\n$1")
    .replace(/\*\*/g, "")
    .trim();

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const Talk: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("syllabus");

  const selectedModule = selectedOption.startsWith("module-")
    ? Number(selectedOption.split("-")[1])
    : 0;
  const progressPercent = Math.round((selectedModule / 7) * 100);

  const greeting = (() => {
    const hour = new Date().getHours();
    const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    if (selectedModule === 0) {
      return `${salutation}. Ready to map the course expectations from the syllabus?`;
    }

    return `${salutation}. You have completed ${progressPercent}% of the course path. Ready to dive into Module ${selectedModule}?`;
  })();

  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercent / 100);

  useEffect(() => {
    setSessionId(new Date().toISOString());

    const fetchChatHistory = async () => {
      try {
        const response = await fetch("/api/chatHistory");
        if (!response.ok) {
          throw new Error("Failed to fetch chat history");
        }

        const data = await response.json();
        setMessages(data.history || []);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, sessionId, selectedOption }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const serverError = data?.error || data?.message || `Request failed (${response.status})`;
        throw new Error(serverError);
      }

      const botMessage: Message = {
        sender: "bot",
        text: data.reply || "I’m not sure how to respond to that.",
        id: data.messageId || undefined,
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unable to process message.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: `Error: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const changeContext = async (newContext: string) => {
    setSelectedOption(newContext);

    try {
      const response = await fetch("/api/set-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOption: newContext, sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update context");
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: "bot",
          text: `Context switched to: ${optionLabels[newContext] || newContext}`,
        },
      ]);
    } catch (error) {
      console.error("Error changing context:", error);
    }
  };

  const rateMessage = async (messageId: string, rating: "helpful" | "unhelpful") => {
    if (!messageId) {
      return;
    }

    try {
      const response = await fetch("/api/rate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating }),
      });

      if (!response.ok) {
        throw new Error("Failed to rate message");
      }

      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === messageId ? { ...msg, rated: true } : msg))
      );
    } catch (error) {
      console.error("Error rating message:", error);
    }
  };

  const applyQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <div className="flex h-screen bg-trust-navy text-trust-ink">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300 ease-in-out bg-trust-panel/70 backdrop-blur-md p-4 shadow-lg border-r border-trust-slate/30`}
      >
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-5 w-5 text-trust-accent" />
          <h2 className="font-academic text-lg text-trust-ink">Course Dashboard</h2>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-trust-slate/30 bg-trust-charcoal p-4">
            <p className="text-xs uppercase tracking-wide text-trust-slate">Current Context</p>
            <p className="mt-2 text-sm text-trust-ink font-medium leading-6">
              {optionLabels[selectedOption] || selectedOption}
            </p>
            <p className="mt-2 text-xs text-trust-slate leading-6">{optionDescriptions[selectedOption]}</p>
          </div>

          <div className="rounded-xl border border-trust-slate/30 bg-trust-charcoal p-4">
            <label className="block text-xs uppercase tracking-wide text-trust-slate mb-2">
              Change Context
            </label>
            <div className="relative">
              <select
                className="appearance-none w-full p-3 pr-8 rounded-lg bg-trust-panel text-trust-ink border border-trust-slate/40 focus:outline-none focus:ring-2 focus:ring-trust-accent/30"
                value={selectedOption}
                onChange={(e) => changeContext(e.target.value)}
              >
                {Object.keys(optionLabels).map((value) => (
                  <option key={value} value={value}>
                    {optionLabels[value]}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <ChevronDown className="h-4 w-4 text-trust-slate" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="https://nku.co1.qualtrics.com/jfe/form/SV_cCJb5lGpYj9qrK6"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full p-3 rounded-lg transition bg-trust-charcoal text-trust-ink hover:bg-trust-blue/60 border border-trust-slate/30"
          >
            <FileText className="w-5 h-5 mr-3" />
            Survey
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col w-full min-w-0">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="border-0 bg-transparent pb-2">
            <div className="flex items-start justify-between">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg text-trust-ink hover:bg-trust-charcoal"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div className="p-4 flex-1">
                <p className="text-xs text-trust-slate tracking-wide uppercase">
                  Course • {selectedModule > 0 ? `Module ${selectedModule} of 7` : "Syllabus"}
                </p>
                <h1 className="font-academic text-2xl mt-1">Cybersecurity Assistant</h1>
                <p className="text-sm text-trust-slate mt-1 leading-6">{greeting}</p>
              </div>

              <div className="mr-4 mt-2 hidden sm:flex items-center gap-3 rounded-xl border border-trust-slate/30 bg-trust-charcoal px-3 py-2">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r={ringRadius} stroke="#34435F" strokeWidth="6" fill="none" />
                  <circle
                    cx="30"
                    cy="30"
                    r={ringRadius}
                    stroke="#C2A56E"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 30 30)"
                  />
                </svg>
                <div>
                  <p className="text-xs uppercase tracking-wide text-trust-slate">Progress</p>
                  <p className="text-sm font-medium text-trust-ink">{progressPercent}% complete</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="flex-1 min-h-0 px-4 pb-4">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            <div className="hidden lg:flex flex-col rounded-xl border border-trust-slate/30 bg-trust-panel/60 backdrop-blur-sm p-4">
              <h3 className="font-academic text-lg">Reference Pane</h3>
              <p className="text-xs uppercase tracking-wide text-trust-slate mt-2">Pinned Context</p>
              <p className="text-sm leading-7 mt-2 text-trust-ink">{optionLabels[selectedOption]}</p>
              <p className="text-sm leading-7 mt-3 text-trust-slate">{optionDescriptions[selectedOption]}</p>

              <div className="mt-6 space-y-2">
                <p className="text-xs uppercase tracking-wide text-trust-slate">Smart Actions</p>
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => applyQuickAction(action)}
                    className="w-full text-left rounded-lg border border-trust-slate/30 bg-trust-charcoal px-3 py-2 text-sm hover:bg-trust-blue/60 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex flex-col rounded-xl border border-trust-slate/30 bg-trust-panel/50">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] md:max-w-[72%] p-3 rounded-xl border ${
                        msg.sender === "user"
                          ? "bg-trust-blue text-trust-ink border-trust-slate/20"
                          : "bg-trust-ai text-trust-navy border-trust-slate/30"
                      }`}
                    >
                      <div className="flex flex-col">
                        {msg.sender === "bot" ? (
                          <div className="space-y-3">
                            {formatBotParagraphs(msg.text).map((paragraph, paragraphIndex) => (
                              <p key={paragraphIndex} className="leading-7 whitespace-pre-wrap">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="leading-7 whitespace-pre-wrap">{msg.text}</p>
                        )}

                        {msg.sender === "bot" && msg.id && !msg.rated && (
                          <div className="flex justify-end mt-2 space-x-2">
                            <button
                              onClick={() => rateMessage(msg.id!, "helpful")}
                              className="p-1 rounded text-trust-slate hover:text-green-500 transition-colors"
                              aria-label="Helpful"
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button
                              onClick={() => rateMessage(msg.id!, "unhelpful")}
                              className="p-1 rounded text-trust-slate hover:text-red-400 transition-colors"
                              aria-label="Unhelpful"
                            >
                              <ThumbsDown size={16} />
                            </button>
                          </div>
                        )}

                        {msg.sender === "bot" && msg.rated && (
                          <div className="text-xs text-trust-slate mt-1 text-right">Feedback recorded</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-xl bg-trust-charcoal border border-trust-slate/30">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-trust-accent rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-trust-accent rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-trust-accent rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 pb-4">
                <div className="mb-3 flex flex-wrap gap-2 lg:hidden">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      onClick={() => applyQuickAction(action)}
                      className="rounded-full border border-trust-slate/30 bg-trust-charcoal px-3 py-1.5 text-xs hover:bg-trust-blue/60"
                    >
                      {action}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-trust-charcoal/70 backdrop-blur-md border border-trust-slate/30">
                  <div className="flex items-center justify-between mb-2 text-xs text-trust-slate">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-trust-accent" />
                      <span>Verified Secure Session</span>
                    </div>
                    <span>End-to-End Encrypted</span>
                  </div>

                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(e)}
                      placeholder="Ask about risk controls, assessments, or course deliverables..."
                      className="flex-1 p-3 rounded-xl bg-trust-panel text-trust-ink border border-trust-slate/40 placeholder-trust-slate focus:outline-none focus:ring-2 focus:ring-trust-accent/30"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-4 bg-trust-accent text-trust-navy rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Talk;
