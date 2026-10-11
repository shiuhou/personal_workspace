"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/data/tasks.ts
function taskFields(text2) {
  const id = text2.match(/\s\^(task-[a-zA-Z0-9-]+)\s*$/)?.[1];
  const priority = text2.match(/\[priority:: (high|normal|low)\]/)?.[1];
  const due = text2.match(/\[due:: (\d{4}-\d{2}-\d{2})\]/)?.[1];
  const suggested = text2.includes("[state:: suggested]");
  return { id, priority, due, suggested, text: text2.replace(/\s*\[priority:: (?:high|normal|low)\]/g, "").replace(/\s*\[due:: \d{4}-\d{2}-\d{2}\]/g, "").replace(/\s*\[state:: suggested\]/g, "").replace(/\s\^task-[a-zA-Z0-9-]+\s*$/, "").trim() };
}
function editTask(content, task, values) {
  if (!values.text.trim() || /[\r\n]/.test(values.text)) throw new Error("\u8ACB\u8F38\u5165\u4E00\u884C\u5F85\u8FA6\u3002");
  const lines = content.split("\n");
  if (lines[task.line]?.replace(/\r$/, "") !== task.raw) throw new Error("\u5F85\u8FA6\u5DF2\u88AB\u5176\u4ED6\u7DE8\u8F2F\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u67E5\u770B\u3002");
  const prefix = task.raw.match(/^(\s*[-*+] \[[ xX]\]\s+)/)[1];
  lines[task.line] = prefix + values.text.trim() + (values.priority ? " [priority:: " + values.priority + "]" : "") + (values.due ? " [due:: " + values.due + "]" : "") + (values.suggested ? " [state:: suggested]" : "") + (values.id || task.id ? " ^" + (values.id || task.id) : "") + (content.split("\n")[task.line].endsWith("\r") ? "\r" : "");
  return lines.join("\n");
}
function parseTasks(content) {
  const tasks = [];
  let fence = "";
  for (const [line, raw] of content.split(/\r?\n/).entries()) {
    const marker = raw.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = "";
      continue;
    }
    if (fence) continue;
    const match = raw.match(/^\s*[-*+] \[([ xX])\]\s+(.+)$/);
    if (match) tasks.push({ line, raw, ...taskFields(match[2]), done: match[1].toLowerCase() === "x" });
  }
  return tasks;
}
function toggleTask(content, task) {
  const lines = content.split("\n");
  if (lines[task.line]?.replace(/\r$/, "") !== task.raw) throw new Error("\u5F85\u8FA6\u5DF2\u88AB\u5176\u4ED6\u7DE8\u8F2F\u66F4\u65B0\uFF0C\u8ACB\u91CD\u65B0\u67E5\u770B\u5F8C\u518D\u52FE\u9078\u3002");
  lines[task.line] = lines[task.line].replace(/\[([ xX])\]/, task.done ? "[ ]" : "[x]");
  return lines.join("\n");
}
function appendTask(content, text2) {
  const title = text2.trim();
  if (!title || /[\r\n]/.test(title)) throw new Error("\u8ACB\u8F38\u5165\u4E00\u884C\u5F85\u8FA6\uFF1B\u591A\u884C\u5167\u5BB9\u53EF\u958B\u555F\u539F\u59CB\u6E05\u55AE\u7DE8\u8F2F\u3002");
  return content + (content.endsWith("\n") ? "" : "\n") + "- [ ] " + title + "\n";
}
function progressValue(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : void 0;
}
var TaskStore;
var init_tasks = __esm({
  "src/data/tasks.ts"() {
    "use strict";
    TaskStore = class {
      constructor(app, preferredPath) {
        this.app = app;
        this.preferredPath = preferredPath;
      }
      get path() {
        if (this.app.vault.getFileByPath(this.preferredPath)) return this.preferredPath;
        const root = this.preferredPath.slice(0, this.preferredPath.lastIndexOf("/") + 1);
        const candidates = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(root) && this.app.metadataCache.getFileCache(file)?.frontmatter?.kind === "tasks");
        if (candidates.length > 1) throw new Error("\u627E\u5230\u591A\u4EFD tasks \u6E05\u55AE\uFF0C\u8ACB\u6838\u5C0D\u6A94\u6848\uFF1B\u672A\u5EFA\u7ACB\u53E6\u4E00\u4EFD\u5F85\u8FA6\u3002");
        return candidates[0]?.path || this.preferredPath;
      }
      async read() {
        const file = this.app.vault.getFileByPath(this.path);
        return file ? this.app.vault.read(file) : "";
      }
      async add(text2) {
        appendTask("", text2);
        let file = this.app.vault.getFileByPath(this.path);
        if (!file) {
          const parts = this.path.split("/");
          parts.pop();
          let folder = "";
          for (const part of parts) {
            folder = folder ? folder + "/" + part : part;
            if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
          }
          try {
            file = await this.app.vault.create(this.path, "---\ntype: note\nkind: tasks\n---\n# \u5F85\u8FA6 Tasks\n\n");
          } catch (error) {
            file = this.app.vault.getFileByPath(this.path);
            if (!file) throw error;
          }
        }
        await this.app.vault.process(file, (content) => appendTask(content, text2));
      }
      async edit(task, values) {
        const file = this.app.vault.getFileByPath(this.path);
        if (!file) throw new Error("\u5F85\u8FA6\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\u3002");
        await this.app.vault.process(file, (content) => editTask(content, task, values));
      }
      async identify(task) {
        if (task.id) {
          const current = parseTasks(await this.read()).find((t) => t.id === task.id);
          if (!current || current.raw !== task.raw) throw new Error("\u5F85\u8FA6\u5DF2\u5728\u5176\u4ED6\u4F4D\u7F6E\u4FEE\u6539\u6216\u522A\u9664\uFF0C\u8ACB\u91CD\u65B0\u958B\u555F\u3002");
          return current;
        }
        const id = "task-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        await this.edit(task, { ...task, id });
        return parseTasks(await this.read()).find((t) => t.id === id);
      }
      async toggle(task) {
        const file = this.app.vault.getFileByPath(this.path);
        if (!file) throw new Error("\u5F85\u8FA6\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\u3002");
        await this.app.vault.process(file, (content) => toggleTask(content, task));
      }
    };
  }
});

// src/domain.ts
function text(value) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}
function strings(value) {
  return (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]).map(text).filter(Boolean);
}
function isObjectType(value) {
  return TYPES.includes(value);
}
function inFolder(path, folder) {
  return path.startsWith(folder.replace(/\/$/, "") + "/");
}
function isContentPath(path, settings) {
  if (["README.md", "AGENTS.md"].includes(path)) return false;
  if (path.split("/").some((s) => s.startsWith(".")) || inFolder(path, settings.folders.templates)) return false;
  if (Object.entries(settings.folders).some(([key, folder]) => key !== "templates" && inFolder(path, folder))) return true;
  return !inFolder(path, "00 Home") && !inFolder(path, "99 System");
}
function isInbox(entry, settings) {
  return entry.status !== "archived" && (inFolder(entry.path, settings.folders.inbox) || entry.status === "inbox");
}
function normalizeEntry(file, fm = {}, links = []) {
  const issues = [];
  if (fm.type && !isObjectType(fm.type)) issues.push("\u672A\u77E5\u7684 type\uFF0C\u8ACB\u5728\u539F\u59CB\u7B46\u8A18\u4E2D\u4FEE\u6B63\u3002");
  if (fm.project && !fm.projects) issues.push("\u5075\u6E2C\u5230\u820A\u6B04\u4F4D project\uFF1B\u7DE8\u8F2F\u95DC\u806F\u6642\u6703\u6539\u7528 projects\u3002");
  for (const key of ["projects", "topics", "authors"]) if (fm[key] != null && !Array.isArray(fm[key])) issues.push(`${key} \u5EFA\u8B70\u4F7F\u7528\u6E05\u55AE\uFF1B\u76EE\u524D\u4EE5\u55AE\u4E00\u503C\u8B80\u53D6\u3002`);
  if (fm.progress != null && progressValue(fm.progress) == null) issues.push("progress \u8ACB\u4F7F\u7528 0 \u81F3 100 \u7684\u6578\u5B57\uFF1B\u76EE\u524D\u986F\u793A\u5C1A\u672A\u8A2D\u5B9A\u3002");
  return {
    ...file,
    progress: progressValue(fm.progress),
    type: isObjectType(fm.type) ? fm.type : void 0,
    status: text(fm.status),
    projects: strings(fm.projects ?? fm.project),
    course: text(fm.course),
    topics: strings(fm.topics),
    authors: strings(fm.authors),
    year: text(fm.year),
    pdf: text(fm.pdf),
    source: text(fm.source),
    kind: text(fm.kind),
    created: text(fm.created),
    pinned: fm.pinned === true,
    links,
    issues
  };
}
function linkTarget(value) {
  const match = value.match(/^\[\[([\s\S]+?)\]\]$/);
  const raw = match ? match[1] : value;
  return raw.split("|")[0].split("#")[0].trim();
}
function recent(entries, limit = Infinity) {
  return [...entries].sort((a, b) => b.mtime - a.mtime || a.path.localeCompare(b.path)).slice(0, limit);
}
function matches(entry, query) {
  const haystack = [entry.name, ...entry.topics, ...entry.authors, entry.year, entry.status].join(" ").normalize("NFKC").toLocaleLowerCase();
  return query.trim().normalize("NFKC").toLocaleLowerCase().split(/\s+/).every((token) => haystack.includes(token));
}
function safeStem(title) {
  const stem = title.normalize("NFC").replace(/[\\/:*?"<>|#\[\]\x00-\x1f]/g, " ").replace(/\s+/g, " ").replace(/^[. ]+|[. ]+$/g, "").slice(0, 160).trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem) ? stem + " note" : stem;
}
function validateFolder(value) {
  return !!value.trim() && !value.startsWith("/") && !value.includes("\\") && !value.split("/").some((s) => !s || s === "." || s === ".." || s.startsWith(".") || /[:*?"<>|]/.test(s));
}
function courseGroup(entry) {
  if (["lecture", "assignment", "review"].includes(entry.kind)) return entry.kind;
  return ["resource", "paper"].includes(entry.type ?? "") ? "resource" : "note";
}
function displayDate(value) {
  return new Intl.DateTimeFormat("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function paperIdentity(source) {
  let url;
  try {
    url = new URL(source.trim());
  } catch {
    return "";
  }
  if (!["https:", "http:"].includes(url.protocol)) return "";
  const host = url.hostname.toLowerCase();
  if (host === "arxiv.org" || host === "www.arxiv.org") {
    const id = url.pathname.replace(/^\/(abs|pdf)\//, "").replace(/\.pdf$/i, "");
    if (/^(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?$/i.test(id)) return `arxiv:${id.toLowerCase()}`;
  }
  if (host === "doi.org" || host === "dx.doi.org") {
    let id;
    try {
      id = decodeURIComponent(url.pathname.slice(1));
    } catch {
      return "";
    }
    if (/^10\.\d{4,9}\/\S+$/i.test(id)) return `doi:${id.toLowerCase()}`;
  }
  return "";
}
var TYPES, DEFAULT_SETTINGS, LABELS, ICONS, TEMPLATES, STATUSES, STATUS_LABELS;
var init_domain = __esm({
  "src/domain.ts"() {
    "use strict";
    init_tasks();
    TYPES = ["course", "project", "paper", "note", "experiment", "idea", "resource"];
    DEFAULT_SETTINGS = {
      openOnStartup: true,
      folders: { course: "10 Courses", project: "20 Research", paper: "30 Papers", note: "40 Notes", experiment: "50 Experiments", idea: "60 Ideas", resource: "70 Resources", inbox: "01 Inbox", attachments: "80 Attachments", templates: "90 Templates" }
    };
    LABELS = { course: "\u8AB2\u7A0B Course", project: "\u7814\u7A76\u5C08\u6848 Project", paper: "\u8AD6\u6587 Paper", note: "\u7B46\u8A18 Note", experiment: "\u5BE6\u9A57 Experiment", idea: "\u60F3\u6CD5 Idea", resource: "\u8CC7\u6E90 Resource" };
    ICONS = { course: "graduation-cap", project: "flask-conical", paper: "file-text", note: "notebook-pen", experiment: "test-tubes", idea: "lightbulb", resource: "library" };
    TEMPLATES = { course: "Course", project: "Research Project", paper: "Paper", note: "General Note", experiment: "Experiment", idea: "Idea", resource: "Resource" };
    STATUSES = {
      course: ["planned", "active", "completed", "archived"],
      project: ["active", "paused", "completed", "archived"],
      paper: ["inbox", "skimming", "reading", "synthesized", "read", "reference", "archived"],
      experiment: ["planned", "running", "completed", "failed", "paused"],
      idea: ["inbox", "archived"],
      note: ["inbox", "archived"],
      resource: ["inbox", "reference", "archived"]
    };
    STATUS_LABELS = { planned: "\u8A08\u756B\u4E2D", active: "\u9032\u884C\u4E2D", completed: "\u5DF2\u5B8C\u6210", archived: "\u5DF2\u5C01\u5B58", paused: "\u66AB\u505C", inbox: "\u5F85\u6574\u7406", skimming: "\u7565\u8B80", synthesized: "\u5DF2\u6574\u5408", reading: "\u95B1\u8B80\u4E2D", read: "\u5DF2\u8B80", reference: "\u53C3\u8003", running: "\u57F7\u884C\u4E2D", failed: "\u5931\u6557" };
  }
});

// src/data/actions.ts
var actions_exports = {};
__export(actions_exports, {
  FileActions: () => FileActions
});
var import_obsidian2, FileActions;
var init_actions = __esm({
  "src/data/actions.ts"() {
    "use strict";
    import_obsidian2 = require("obsidian");
    init_domain();
    FileActions = class {
      constructor(app, settings) {
        this.app = app;
        this.settings = settings;
      }
      async ensureFolder(folder) {
        if (!validateFolder(folder)) throw new Error("\u8CC7\u6599\u593E\u5FC5\u9808\u662F Vault \u5167\u7684\u76F8\u5C0D\u8DEF\u5F91\u3002");
        const parts = (0, import_obsidian2.normalizePath)(folder).split("/");
        for (let i = 1; i <= parts.length; i++) {
          const path = parts.slice(0, i).join("/");
          if (!this.app.vault.getAbstractFileByPath(path)) await this.app.vault.createFolder(path);
          if (!this.app.vault.getFolderByPath(path)) throw new Error(`${path} \u4E0D\u662F\u8CC7\u6599\u593E\u3002`);
        }
      }
      unique(folder, name) {
        const dot = name.lastIndexOf(".");
        const stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : "";
        let path = (0, import_obsidian2.normalizePath)(`${folder}/${name}`), n = 2;
        while (this.app.vault.getAbstractFileByPath(path)) path = (0, import_obsidian2.normalizePath)(`${folder}/${stem} (${n++})${ext}`);
        return path;
      }
      findCompanion(attachment) {
        for (const file of this.app.vault.getMarkdownFiles()) {
          const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
          const value = fm?.type === "paper" ? fm.pdf : fm?.type === "resource" ? fm.source : void 0;
          if (typeof value !== "string" || /^https?:\/\//i.test(value)) continue;
          if (this.app.metadataCache.getFirstLinkpathDest(linkTarget(value), file.path)?.path === attachment.path) return file;
        }
        return null;
      }
      findPaper(pdfLink = "", source = "") {
        const pdf = pdfLink ? this.app.metadataCache.getFirstLinkpathDest(linkTarget(pdfLink), "") : null;
        const companion = pdf ? this.findCompanion(pdf) : null;
        if (companion && this.app.metadataCache.getFileCache(companion)?.frontmatter?.type !== "paper") throw new Error(`\u6B64 PDF \u5DF2\u7531 ${companion.path} \u8AAA\u660E\uFF0C\u8ACB\u7DE8\u8F2F\u8A72\u7B46\u8A18\u3002`);
        const identity = paperIdentity(source);
        const matches2 = identity ? this.app.vault.getMarkdownFiles().filter((file) => {
          const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
          return fm?.type === "paper" && typeof fm.source === "string" && paperIdentity(fm.source) === identity;
        }) : [];
        if (companion && !matches2.includes(companion)) matches2.push(companion);
        if (matches2.length > 1) throw new Error(`\u627E\u5230\u591A\u4EFD\u53EF\u80FD\u7684\u4E3B\u7B46\u8A18\uFF1A${matches2.map((f) => f.path).join("\u3001")}\u3002\u8ACB\u5148\u6838\u5C0D\u4F86\u6E90\u8207 PDF\uFF0C\u672A\u8986\u5BEB\u4EFB\u4F55\u7B46\u8A18\u3002`);
        const existing = matches2[0];
        if (companion && identity) {
          const oldSource = this.app.metadataCache.getFileCache(companion)?.frontmatter?.source;
          if (typeof oldSource === "string" && paperIdentity(oldSource) && paperIdentity(oldSource) !== identity) throw new Error(`\u6B64 PDF \u7684\u4E3B\u7B46\u8A18 ${companion.path} \u5DF2\u8A18\u9304\u4E0D\u540C\u4F86\u6E90\u6216\u7248\u672C\u3002\u8ACB\u6838\u5C0D\u5F8C\u518D\u65B0\u589E\uFF0C\u672A\u6539\u52D5\u539F\u7B46\u8A18\u3002`);
        }
        if (existing && pdf) {
          const old = this.app.metadataCache.getFileCache(existing)?.frontmatter?.pdf;
          if (typeof old === "string" && old) {
            const oldPdf = this.app.metadataCache.getFirstLinkpathDest(linkTarget(old), existing.path);
            if (oldPdf?.path !== pdf.path) throw new Error(`\u6B64\u4F86\u6E90\u5DF2\u6709\u4E3B\u7B46\u8A18 ${existing.path} \u4E26\u9023\u7D50\u5176\u4ED6 PDF\u3002\u8ACB\u6838\u5C0D\u7248\u672C\uFF1B\u539F PDF \u8207\u6279\u6CE8\u672A\u6539\u52D5\u3002`);
          }
        }
        return existing ?? null;
      }
      async create(input) {
        const stem = safeStem(input.title);
        if (!stem) throw new Error("\u8ACB\u8F38\u5165\u6709\u6548\u7684\u6A19\u984C\u3002");
        if (input.type === "paper") {
          const existing = this.findPaper(input.pdf, input.source);
          if (existing) {
            const fm = this.app.metadataCache.getFileCache(existing)?.frontmatter ?? {};
            const values = {};
            if (input.projects?.length) values.projects = [.../* @__PURE__ */ new Set([...strings(fm.projects ?? fm.project), ...input.projects])];
            if (input.course && !fm.course) values.course = input.course;
            if (input.pdf && !fm.pdf) values.pdf = input.pdf;
            if (input.source && !fm.source) values.source = input.source;
            if (Object.keys(values).length) await this.update(existing, values);
            return existing;
          }
        }
        const folder = this.settings().folders[input.capture ? "inbox" : input.type];
        await this.ensureFolder(folder);
        const path = this.unique(folder, `${stem}.md`);
        const templatePath = (0, import_obsidian2.normalizePath)(`${this.settings().folders.templates}/${input.type === "note" && input.kind === "concept" ? "Concept" : TEMPLATES[input.type]}.md`);
        const template = this.app.vault.getFileByPath(templatePath);
        if (!template) throw new Error(`\u627E\u4E0D\u5230\u7BC4\u672C ${templatePath}\u3002\u8ACB\u5728\u8A2D\u5B9A\u4E2D\u6AA2\u67E5\u7BC4\u672C\u8CC7\u6599\u593E\u3002`);
        const raw = await this.app.vault.read(template);
        const rendered = raw.replace(/\{\{title\}\}/g, () => stem).replace(/\{\{(date|time)(?::([^}]+))?\}\}/g, (_, type, format) => import_obsidian2.moment.utc().local().format(format || (type === "date" ? "YYYY-MM-DD" : "HH:mm")));
        const file = await this.app.vault.create(path, rendered + (input.body ? `
${input.body}
` : ""));
        try {
          await this.app.fileManager.processFrontMatter(file, (fm) => {
            fm.type = input.type;
            if (input.projects?.length) fm.projects = input.projects;
            if (input.course) fm.course = input.course;
            if (input.pdf) fm.pdf = input.pdf;
            if (input.source) fm.source = input.source;
            if (input.kind) fm.kind = input.kind;
            if (input.capture) fm.status = "inbox";
          });
        } catch (error) {
          throw new Error(`\u7B46\u8A18\u5DF2\u5EFA\u7ACB\u65BC ${file.path}\uFF0C\u4F46\u5C6C\u6027\u672A\u5B8C\u6210\uFF1A${String(error)}\u3002\u8ACB\u5148\u958B\u555F\u8A72\u6A94\u6848\uFF0C\u907F\u514D\u91CD\u8907\u5EFA\u7ACB\u3002`);
        }
        return file;
      }
      async capture(content, idea, operationId) {
        if (!content.trim()) throw new Error("\u5148\u5BEB\u4E0B\u4E00\u9EDE\u5167\u5BB9\u3002");
        const title = safeStem(content.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 70)) || `Capture ${import_obsidian2.moment.utc().local().format("YYYY-MM-DD HHmmss")}`;
        await this.ensureFolder(this.settings().folders.inbox);
        const capturePath = operationId ? `${this.settings().folders.inbox}/${title} ${operationId}.md` : this.unique(this.settings().folders.inbox, `${title}.md`);
        const matches2 = operationId ? this.app.vault.getMarkdownFiles().filter((file) => file.path.endsWith(" " + operationId + ".md") || this.app.metadataCache.getFileCache(file)?.frontmatter?.capture_id === operationId) : [];
        if (matches2.length > 1) throw new Error("\u6355\u6349\u64CD\u4F5C ID \u91CD\u8907\uFF0C\u8ACB\u5148\u6838\u5C0D\u539F\u6A94\u3002");
        const previous = matches2[0] || this.app.vault.getFileByPath(capturePath);
        if (operationId && previous) {
          const raw = await this.app.vault.read(previous);
          if (!raw.includes(`capture_id: ${operationId}
`)) throw new Error("\u6355\u6349\u6A94\u540D\u885D\u7A81\uFF0C\u539F\u6A94\u4FDD\u7559\u3002");
          if (!raw.includes(content.trim())) throw new Error(`\u524D\u6B21\u6355\u6349\u5DF2\u4FDD\u5B58\u65BC ${previous.path}\uFF0C\u65B0\u8349\u7A3F\u4E0D\u540C\uFF0C\u8ACB\u5148\u6838\u5C0D\u3002`);
          return previous;
        }
        const yaml = `---
${operationId ? "capture_id: " + operationId + "\n" : ""}${idea ? "type: idea\n" : ""}status: inbox
created: ${import_obsidian2.moment.utc().local().format("YYYY-MM-DD")}
---
`;
        return this.app.vault.create(capturePath, `${yaml}
# ${title}

${content.trim()}
`);
      }
      async importFiles(files, folder = this.settings().folders.inbox) {
        await this.ensureFolder(folder);
        const imported = [];
        for (const file of files) {
          const dot = file.name.lastIndexOf(".");
          const stem = safeStem(dot > 0 ? file.name.slice(0, dot) : file.name) || "Attachment";
          const ext = dot > 0 ? file.name.slice(dot).replace(/[^.a-zA-Z0-9_-]/g, "") : "";
          const path = this.unique(folder, stem + ext);
          try {
            imported.push(await this.app.vault.createBinary(path, await file.arrayBuffer()));
          } catch (error) {
            throw new Error(`\u5DF2\u532F\u5165 ${imported.length} \u500B\u6A94\u6848\uFF1B${file.name} \u532F\u5165\u5931\u6557\uFF1A${String(error)}\u3002\u5DF2\u532F\u5165\u7684\u6A94\u6848\u4FDD\u7559\u3002`);
          }
        }
        return imported;
      }
      async update(file, values) {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
          for (const [key, value] of Object.entries(values)) {
            if (value === void 0 || value === "" || Array.isArray(value) && !value.length) delete fm[key];
            else fm[key] = value;
          }
          if ("projects" in values) delete fm.project;
        });
      }
      async organize(file, type, values) {
        if (file.extension.toLowerCase() !== "md") {
          if (type !== "paper" && type !== "resource") throw new Error("\u9644\u4EF6\u53EF\u5EFA\u7ACB\u70BA\u8AD6\u6587\u6216\u8CC7\u6E90\uFF1B\u539F\u59CB\u6A94\u6848\u6703\u5B8C\u6574\u4FDD\u7559\u3002");
          if (type === "paper" && file.extension.toLowerCase() !== "pdf") throw new Error("\u8ACB\u5C07\u6B64\u9644\u4EF6\u5EFA\u7ACB\u70BA\u8CC7\u6E90\uFF1B\u8AD6\u6587 PDF \u6B04\u4F4D\u53EA\u63A5\u53D7 PDF\u3002");
          const folder2 = this.settings().folders.attachments;
          await this.ensureFolder(folder2);
          let note = this.findCompanion(file);
          if (note && this.app.metadataCache.getFileCache(note)?.frontmatter?.type !== type) throw new Error(`\u6B64\u9644\u4EF6\u5DF2\u6709 ${note.path}\uFF0C\u8ACB\u4F7F\u7528\u539F\u6709\u8AAA\u660E\u7B46\u8A18\u3002`);
          if (!note) note = await this.create({ type, title: file.basename, [type === "paper" ? "pdf" : "source"]: `[[${file.path}]]` });
          await this.update(note, values);
          try {
            if (!file.path.startsWith(folder2 + "/")) await this.app.fileManager.renameFile(file, this.unique(folder2, file.name));
          } catch (error) {
            throw new Error(`\u5DF2\u5EFA\u7ACB ${note.path}\uFF1B\u539F\u59CB\u9644\u4EF6\u4ECD\u4FDD\u7559\u65BC ${file.path}\uFF0C\u642C\u79FB\u672A\u5B8C\u6210\uFF1A${String(error)}`);
          }
          await this.update(note, { [type === "paper" ? "pdf" : "source"]: `[[${file.path}]]` });
          return note;
        }
        await this.update(file, { ...values, type });
        const folder = this.settings().folders[type];
        await this.ensureFolder(folder);
        if (!file.path.startsWith(folder + "/")) await this.app.fileManager.renameFile(file, this.unique(folder, file.name));
        return file;
      }
    };
  }
});

// src/data/portable.ts
var portable_exports = {};
__export(portable_exports, {
  PortableStore: () => PortableStore,
  newId: () => newId,
  parseDocument: () => parseDocument,
  patchDocument: () => patchDocument,
  unchanged: () => unchanged,
  wiki: () => wiki
});
function parseDocument(raw, path = "") {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let fm = {};
  if (raw.startsWith("---\n") || raw.startsWith("---\r\n")) {
    if (!match) throw new Error(`${path}\uFF1AYAML \u5C1A\u672A\u95DC\u9589\uFF0C\u539F\u6A94\u4FDD\u7559\u3002`);
    const parsed = (0, import_obsidian4.parseYaml)(match[1]);
    if (parsed != null && (typeof parsed !== "object" || Array.isArray(parsed))) throw new Error(`${path}\uFF1AYAML \u5FC5\u9808\u662F\u5C6C\u6027\u7269\u4EF6\u3002`);
    fm = parsed ?? {};
  }
  return { path, raw, fm, body: match ? raw.slice(match[0].length) : raw };
}
function patchDocument(snapshot, values, body = snapshot.body) {
  const fm = { ...snapshot.fm };
  for (const [key, value] of Object.entries(values)) {
    if (value === void 0) delete fm[key];
    else fm[key] = value;
  }
  return `---
${(0, import_obsidian4.stringifyYaml)(fm).trimEnd()}
---
${body}`;
}
function unchanged(latest, snapshot) {
  if (latest !== snapshot.raw) throw new Error(`${snapshot.path} \u5DF2\u5728\u5176\u4ED6\u4F4D\u7F6E\u4FEE\u6539\u3002\u8ACB\u91CD\u65B0\u958B\u555F\uFF0C\u8349\u7A3F\u4ECD\u4FDD\u7559\uFF1B\u672A\u8986\u5BEB\u539F\u6587\u3002`);
}
var import_obsidian4, PortableStore, newId, wiki;
var init_portable = __esm({
  "src/data/portable.ts"() {
    "use strict";
    import_obsidian4 = require("obsidian");
    init_domain();
    init_actions();
    PortableStore = class {
      constructor(app, settings) {
        this.app = app;
        this.settings = settings;
      }
      async read(path) {
        const file = this.app.vault.getFileByPath(path);
        if (!file) throw new Error(`\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\uFF1A${path}`);
        return parseDocument(await this.app.vault.read(file), path);
      }
      async update(snapshot, values, body) {
        const file = this.app.vault.getFileByPath(snapshot.path);
        if (!file) throw new Error(`\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\uFF1A${snapshot.path}`);
        await this.app.vault.process(file, (latest) => {
          unchanged(latest, snapshot);
          return patchDocument(snapshot, values, body);
        });
        return this.read(file.path);
      }
      async create(folder, title, fm, body, id) {
        const actions = new FileActions(this.app, this.settings);
        await actions.ensureFolder(folder);
        const path = `${folder}/${safeStem(title) || "\u672A\u547D\u540D"} ${id}.md`;
        const matches2 = this.app.vault.getMarkdownFiles().filter((file) => this.app.metadataCache.getFileCache(file)?.frontmatter?.id === id || file.path.startsWith(folder + "/") && file.path.endsWith(" " + id + ".md"));
        if (matches2.length > 1) throw new Error(`\u591A\u4EFD\u7B46\u8A18\u5177\u6709\u540C\u4E00\u64CD\u4F5C ID\uFF1A${matches2.map((f) => f.path).join("\u3001")}\uFF0C\u8ACB\u5148\u6838\u5C0D\u3002`);
        const existing = matches2[0] || this.app.vault.getFileByPath(path);
        if (existing) {
          const snapshot = await this.read(existing.path);
          if (snapshot.fm.id !== id) throw new Error(`\u6A94\u540D\u885D\u7A81\uFF1A${path}`);
          if (snapshot.body !== body) throw new Error(`\u524D\u6B21\u64CD\u4F5C\u5DF2\u4FDD\u5B58\u65BC ${path}\uFF0C\u65B0\u8349\u7A3F\u4E0D\u540C\uFF1B\u8ACB\u5148\u958B\u555F\u539F\u6A94\u6838\u5C0D\u3002`);
          return snapshot;
        }
        await this.app.vault.create(path, patchDocument({ path, raw: "", fm: {}, body: "" }, { type: "note", created: (/* @__PURE__ */ new Date()).toISOString(), ...fm, id }, body));
        return this.read(path);
      }
      async list(kind) {
        const files = this.app.vault.getMarkdownFiles().filter((f) => isContentPath(f.path, this.settings()) && this.app.metadataCache.getFileCache(f)?.frontmatter?.kind === kind);
        const results = await Promise.all(files.map(async (f) => {
          try {
            return { snapshot: await this.read(f.path) };
          } catch (error) {
            return { error: `${f.path}: ${String(error)}` };
          }
        }));
        return { items: results.flatMap((r) => r.snapshot ? [r.snapshot] : []), errors: results.flatMap((r) => r.error ? [r.error] : []) };
      }
    };
    newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    wiki = (path, block = "") => `[[${path.replace(/\.md$/, "")}${block ? "#^" + block : ""}]]`;
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WorkspacePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian12 = require("obsidian");
init_domain();

// src/data/index.ts
var import_obsidian = require("obsidian");
init_domain();
var VaultIndex = class extends import_obsidian.Component {
  constructor(app, settings) {
    super();
    this.app = app;
    this.settings = settings;
  }
  entries = /* @__PURE__ */ new Map();
  ready = false;
  error = "";
  listeners = /* @__PURE__ */ new Set();
  timer;
  stopped = false;
  projectMembers = /* @__PURE__ */ new Map();
  courseMembers = /* @__PURE__ */ new Map();
  references = /* @__PURE__ */ new Map();
  generation = 0;
  pendingMetadata = /* @__PURE__ */ new Set();
  onload() {
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      this.put(file);
      this.schedule();
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => {
      for (const file of this.app.vault.getFiles()) this.put(file);
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof import_obsidian.TFile) {
        this.put(file);
        this.schedule();
      }
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof import_obsidian.TFile) this.put(file);
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      for (const path of this.entries.keys()) if (path === file.path || path.startsWith(file.path + "/")) this.entries.delete(path);
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      for (const path of this.entries.keys()) if (path === oldPath || path.startsWith(oldPath + "/")) this.entries.delete(path);
      if (file instanceof import_obsidian.TFile) this.put(file);
      if (file instanceof import_obsidian.TFolder) {
        for (const f of this.app.vault.getFiles()) if (f.path.startsWith(file.path + "/")) this.put(f);
      }
      this.schedule();
    }));
  }
  onunload() {
    this.stopped = true;
    this.generation++;
    clearTimeout(this.timer);
    this.listeners.clear();
    this.entries.clear();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  put(file) {
    if (!isContentPath(file.path, this.settings())) {
      this.entries.delete(file.path);
      return;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    if (file.extension.toLowerCase() === "md" && !cache) this.pendingMetadata.add(file.path);
    else this.pendingMetadata.delete(file.path);
    this.entries.set(file.path, normalizeEntry(
      { path: file.path, name: file.basename, ext: file.extension.toLowerCase(), mtime: file.stat.mtime, ctime: file.stat.ctime },
      cache?.frontmatter,
      [...cache?.links ?? [], ...cache?.embeds ?? [], ...cache?.frontmatterLinks ?? []].map((link) => link.link)
    ));
  }
  async rebuild() {
    const generation = ++this.generation;
    this.ready = false;
    this.error = "";
    this.emit();
    this.entries.clear();
    try {
      const files = this.app.vault.getFiles();
      for (let i = 0; i < files.length; i++) {
        if (this.stopped || generation !== this.generation) return;
        if (this.app.vault.getFileByPath(files[i].path)) this.put(files[i]);
        if (i % 250 === 249) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      this.relate();
      this.ready = true;
      this.emit();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.ready = true;
      this.emit();
    }
  }
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.stopped) {
        for (const path of [...this.pendingMetadata]) {
          const file = this.app.vault.getFileByPath(path);
          if (file) this.put(file);
          else this.pendingMetadata.delete(path);
        }
        this.relate();
        this.emit();
      }
    }, 120);
  }
  emit() {
    for (const fn of this.listeners) fn();
  }
  resolve(value, source) {
    const path = linkTarget(value);
    if (!path || /^https?:\/\//i.test(path)) return null;
    return this.app.metadataCache.getFirstLinkpathDest((0, import_obsidian.parseLinktext)(path).path, source);
  }
  relate() {
    this.projectMembers.clear();
    this.courseMembers.clear();
    this.references.clear();
    const add = (map, target, source) => {
      if (!map.has(target)) map.set(target, /* @__PURE__ */ new Set());
      map.get(target).add(source);
    };
    for (const entry of this.entries.values()) {
      for (const value of entry.projects) {
        const dest = this.resolve(value, entry.path);
        if (dest) add(this.projectMembers, dest.path, entry.path);
      }
      const course = this.resolve(entry.course, entry.path);
      if (course) add(this.courseMembers, course.path, entry.path);
      for (const value of entry.links) {
        const dest = this.resolve(value, entry.path);
        if (dest) add(this.references, dest.path, entry.path);
      }
    }
  }
  connected(path) {
    const entries = new Map(this.related(path, "references").map((e) => [e.path, e]));
    for (const value of this.entries.get(path)?.links ?? []) {
      const file = this.resolve(value, path);
      const entry = file ? this.entries.get(file.path) : void 0;
      if (entry && entry.path !== path) entries.set(entry.path, entry);
    }
    return [...entries.values()].filter((e) => e.type === "note" || e.type === "experiment" || e.type === "idea" || e.type === "paper");
  }
  all() {
    return [...this.entries.values()];
  }
  ofType(type) {
    return this.all().filter((e) => e.type === type);
  }
  related(path, relation2) {
    const map = relation2 === "project" ? this.projectMembers : relation2 === "course" ? this.courseMembers : this.references;
    return [...map.get(path) ?? []].flatMap((key) => {
      const entry = this.entries.get(key);
      return entry && entry.path !== path ? [entry] : [];
    });
  }
};

// src/main.ts
init_actions();

// src/views/workspace-view.ts
var import_obsidian10 = require("obsidian");
init_domain();

// src/ui/components.ts
var import_obsidian3 = require("obsidian");
function icon(parent, name, cls = "lr-icon") {
  const el = parent.createSpan({ cls, attr: { "aria-hidden": "true" } });
  (0, import_obsidian3.setIcon)(el, name);
  return el;
}
function run(action) {
  try {
    Promise.resolve(action()).catch((error) => {
      console.error("Learning & Research Workspace", error);
      new import_obsidian3.Notice(error instanceof Error ? error.message : String(error), 9e3);
    });
  } catch (error) {
    console.error("Learning & Research Workspace", error);
    new import_obsidian3.Notice(String(error), 9e3);
  }
}
function button(parent, label, action, options = {}) {
  const b = parent.createEl("button", { cls: `lr-button ${options.cls ?? ""}`, attr: { type: "button", "aria-label": options.title ?? label, title: options.title ?? label } });
  if (options.icon) icon(b, options.icon);
  if (label) b.createSpan({ text: label });
  b.addEventListener("click", () => run(action));
  return b;
}
function empty(parent, iconName, title, description, action) {
  const el = parent.createDiv({ cls: "lr-empty" });
  icon(el, iconName, "lr-empty-icon");
  el.createEl("h3", { text: title });
  el.createEl("p", { text: description });
  if (action) button(el, action.label, action.run, { icon: "plus", cls: "lr-subtle" });
  return el;
}
function heading(parent, title, eyebrow, description) {
  const h = parent.createDiv({ cls: "lr-page-heading" });
  if (eyebrow) h.createDiv({ cls: "lr-eyebrow", text: eyebrow });
  h.createEl("h1", { text: title });
  if (description) h.createEl("p", { text: description });
  return h;
}
function picker(parent, accept, multiple, onPick) {
  const input = parent.createEl("input", { cls: "lr-hidden-input", attr: { type: "file", accept, ...multiple ? { multiple: "" } : {} } });
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    if (files.length) onPick(files);
    input.value = "";
  });
  return input;
}

// src/views/workspace-view.ts
init_tasks();
init_portable();

// src/ui/task-panel.ts
var import_obsidian7 = require("obsidian");
init_tasks();
init_portable();

// src/data/dates.ts
function validZone(zone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
function localStamp(instant, zone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const get = (name) => parts.find((p) => p.type === name).value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function validDay(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && (/* @__PURE__ */ new Date(day + "T12:00:00Z")).toISOString().slice(0, 10) === day;
}
function shiftDay(day, n) {
  if (!validDay(day)) throw new Error("\u65E5\u671F\u683C\u5F0F\u932F\u8AA4\u3002");
  const date = /* @__PURE__ */ new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
function weekStart(day) {
  const dow = (/* @__PURE__ */ new Date(day + "T12:00:00Z")).getUTCDay();
  return shiftDay(day, -((dow + 6) % 7));
}
function clock(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function minuteOf(stamp) {
  return Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16));
}
function snapMinute(value) {
  return Math.max(0, Math.min(1425, Math.round(value / 15) * 15));
}
function toInstant(stamp, zone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stamp) || !validDay(stamp.slice(0, 10)) || minuteOf(stamp) > 1439 || Number(stamp.slice(14, 16)) > 59 || !validZone(zone)) throw new Error("\u8ACB\u4F7F\u7528\u6709\u6548\u65E5\u671F\u3001\u6642\u9593\u53CA IANA \u6642\u5340\u3002");
  const naive = Date.parse(stamp + "Z"), offsets = /* @__PURE__ */ new Set();
  for (const delta of [-36, -12, 0, 12, 36]) {
    const time = naive + delta * 36e5;
    offsets.add(Date.parse(localStamp(time, zone) + "Z") - time);
  }
  const candidates = [...offsets].map((offset) => naive - offset).filter((time) => localStamp(time, zone) === stamp);
  if (candidates.length !== 1) throw new Error("\u6B64\u6642\u9593\u9047\u5230\u590F\u4EE4\u6642\u9593\u8DF3\u8F49\u6216\u91CD\u8907\uFF0C\u8ACB\u9078\u64C7\u7121\u6B67\u7FA9\u7684\u6642\u9593\uFF1B\u539F\u5B89\u6392\u672A\u66F4\u6539\u3002");
  return new Date(candidates[0]).toISOString();
}
function rangeValid(start, end) {
  return Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(end) > Date.parse(start);
}
function overlaps(a, b) {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

// src/ui/fields.ts
function field(parent, label, value = "", type = "text") {
  const row = parent.createEl("label", { cls: "lr-field" });
  row.createSpan({ text: label });
  const input = row.createEl("input", { attr: { type, "aria-label": label } });
  input.value = value;
  return input;
}
function area(parent, label, value = "", rows = 5) {
  const row = parent.createEl("label", { cls: "lr-field" });
  row.createSpan({ text: label });
  const input = row.createEl("textarea", { attr: { rows: String(rows), "aria-label": label } });
  input.value = value;
  return input;
}
function select(parent, label, options, value = "") {
  const row = parent.createEl("label", { cls: "lr-field" });
  row.createSpan({ text: label });
  const input = row.createEl("select", { attr: { "aria-label": label } });
  for (const [key, name] of options) input.createEl("option", { value: key, text: name });
  input.value = value;
  return input;
}
function fold(parent, label) {
  const el = parent.createEl("details", { cls: "lr-more" });
  el.createEl("summary", { text: label });
  return el;
}
function submit(modal, label, save) {
  const error = modal.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
  const actions = modal.contentEl.createDiv({ cls: "lr-modal-actions" });
  button(actions, "\u53D6\u6D88", () => modal.close());
  const b = button(actions, label, async () => {
    if (b.disabled) return;
    b.disabled = true;
    error.empty();
    b.setAttribute("aria-busy", "true");
    try {
      await save();
    } catch (e) {
      error.setText(e instanceof Error ? e.message : String(e));
    } finally {
      b.disabled = false;
      b.removeAttribute("aria-busy");
    }
  }, { cls: "lr-primary" });
  modal.contentEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.isComposing) {
      e.preventDefault();
      b.click();
    }
  });
  return error;
}
async function copyText(text2) {
  if (!navigator.clipboard) throw new Error("\u6B64\u74B0\u5883\u672A\u63D0\u4F9B\u526A\u8CBC\u7C3F\uFF0C\u8ACB\u958B\u555F Markdown \u624B\u52D5\u8907\u88FD\u3002");
  await navigator.clipboard.writeText(text2);
}
function downloadMarkdown(title, text2, document) {
  const url = URL.createObjectURL(new Blob([text2], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = title.replace(/[\\/:*?"<>|]/g, " ") + ".md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}

// src/ui/records.ts
var import_obsidian6 = require("obsidian");
init_portable();

// src/data/records.ts
init_portable();
var RECORD_HEADINGS = ["\u76EE\u6A19", "\u904E\u7A0B", "\u7D50\u679C", "\u672A\u4F86\u8A08\u5283"];
function recordBody(raw) {
  const structured = RECORD_HEADINGS.every((label) => new RegExp(`^## ${label}(?: |$)`, "m").test(raw));
  const draft = structured ? raw : RECORD_HEADINGS.map((label) => `## ${label}

${label === "\u904E\u7A0B" ? raw : ""}`).join("\n\n");
  return `${draft}

<details>
<summary>\u539F\u59CB\u8F38\u5165\uFF08\u4FDD\u7559\uFF09</summary>

<!-- lr:raw-start -->
${raw}
<!-- lr:raw-end -->

</details>
`;
}
function sectionText(body, label) {
  const draft = body.split("<!-- lr:raw-start -->")[0].split("<details>")[0];
  const matches2 = [...draft.matchAll(/^## (.+)\r?$/gm)];
  const index = matches2.findIndex((m) => m[1] === label || m[1].startsWith(label + " "));
  if (index < 0) return "";
  const match = matches2[index];
  return draft.slice(match.index + match[0].length, index + 1 < matches2.length ? matches2[index + 1].index : draft.length).trim();
}
function continuation(snapshot) {
  return { result: sectionText(snapshot.body, "\u7D50\u679C"), next: sectionText(snapshot.body, "\u672A\u4F86\u8A08\u5283"), goal: sectionText(snapshot.body, "\u76EE\u6A19") };
}
function diaryPreview(day, records) {
  const selected = records.filter((r) => r.fm.date === day && r.fm.status !== "archived").sort((a, b) => String(a.fm.created).localeCompare(String(b.fm.created)));
  if (!selected.length) return `# ${day} \u65E5\u8A18

\u5C1A\u672A\u8A18\u9304\u3002
`;
  return `# ${day} \u65E5\u8A18

> \u7531\u5DF2\u6709\u8A18\u9304\u6309\u6BB5\u843D\u7D44\u5408\uFF0C\u672A\u7D93\u6A21\u578B\u5206\u6790\u3002

` + RECORD_HEADINGS.map((label) => `## ${label}

` + selected.map((r) => {
    const value = sectionText(r.body, label);
    return value ? `### ${String(r.fm.title ?? r.path)}

\u4F86\u6E90\uFF1A${wiki(r.path)}

${value}
` : "";
  }).filter(Boolean).join("\n")).join("\n") + "\n";
}
var RecordStore = class {
  constructor(files, settings) {
    this.files = files;
    this.settings = settings;
  }
  async capture(input, id = newId()) {
    if (!input.raw.trim()) throw new Error("\u5BEB\u4E00\u53E5\u7C21\u8A18\u6216\u8CBC\u4E0A\u5167\u5BB9\u5373\u53EF\u3002");
    if (!validDay(input.date)) throw new Error("\u8ACB\u9078\u64C7\u6709\u6548\u65E5\u671F\u3002");
    return this.files.create(`${this.settings().folders.note}/Records`, input.title || input.raw.trim().split("\n")[0].slice(0, 50), { kind: "work-log", status: "draft", title: input.title || "\u5DE5\u4F5C\u8A18\u9304", date: input.date, projects: input.projects, task: input.task, source: input.source, course: input.course || void 0 }, recordBody(input.raw), id);
  }
  async diary(day, preview, snapshot) {
    if (!validDay(day)) throw new Error("\u65E5\u671F\u683C\u5F0F\u932F\u8AA4\u3002");
    const path = `${this.settings().folders.note}/Journal/${day}.md`;
    if (snapshot) return this.files.update(snapshot, {}, preview);
    if (this.files.app.vault.getFileByPath(path)) throw new Error("\u65E5\u8A18\u5DF2\u5B58\u5728\uFF0C\u8ACB\u5148\u958B\u555F\u4E26\u8B80\u53D6\u6700\u65B0\u7248\u3002");
    const { FileActions: FileActions2 } = await Promise.resolve().then(() => (init_actions(), actions_exports));
    await new FileActions2(this.files.app, this.settings).ensureFolder(`${this.settings().folders.note}/Journal`);
    const { patchDocument: patchDocument2 } = await Promise.resolve().then(() => (init_portable(), portable_exports));
    await this.files.app.vault.create(path, patchDocument2({ path, raw: "", fm: {}, body: "" }, { type: "note", kind: "journal", date: day }, preview));
    return this.files.read(path);
  }
};

// src/ui/modals.ts
var import_obsidian5 = require("obsidian");
init_domain();
init_portable();
var FilePicker = class extends import_obsidian5.FuzzySuggestModal {
  constructor(app, items, choose) {
    super(app);
    this.items = items;
    this.choose = choose;
    this.setPlaceholder("\u641C\u5C0B\u6A94\u6848 \xB7 Search files");
  }
  getItems() {
    return this.items;
  }
  getItemText(file) {
    return file.basename + "  \xB7  " + file.parent?.path;
  }
  onChooseItem(file) {
    this.choose(file);
  }
};
function relation(parent, host, label, type, values, multiple, change) {
  const setting = new import_obsidian5.Setting(parent).setName(label).setDesc(multiple ? "\u9078\u586B\uFF0C\u53EF\u9023\u7D50\u591A\u500B\u7814\u7A76\u5C08\u6848\u3002" : "\u9078\u586B\uFF0C\u9023\u7D50\u6240\u5C6C\u8AB2\u7A0B\u3002");
  const chips = setting.controlEl.createDiv({ cls: "lr-link-chips" });
  const draw = () => {
    chips.empty();
    for (const value of values) button(chips, value.replace(/^\[\[|\]\]$/g, ""), () => {
      values = values.filter((v) => v !== value);
      change(values);
      draw();
    }, { icon: "x", cls: "lr-chip", title: `\u79FB\u9664 ${value}` });
  };
  draw();
  setting.addButton((b) => b.setButtonText("\u9078\u64C7").onClick(() => {
    const files = host.index.ofType(type).flatMap((e) => {
      const f = host.app.vault.getFileByPath(e.path);
      return f ? [f] : [];
    });
    if (!files.length) {
      new import_obsidian5.Notice(type === "course" ? "\u5C1A\u7121\u8AB2\u7A0B\uFF0C\u4E4B\u5F8C\u53EF\u518D\u52A0\u5165\u3002" : "\u5C1A\u7121\u7814\u7A76\u5C08\u6848\uFF0C\u4E4B\u5F8C\u53EF\u518D\u52A0\u5165\u3002");
      return;
    }
    new FilePicker(host.app, files, (file) => {
      const value = `[[${file.path.replace(/\.md$/, "")}]]`;
      values = multiple ? [.../* @__PURE__ */ new Set([...values, value])] : [value];
      change(values);
      draw();
    }).open();
  }));
}
var NewObjectModal = class extends import_obsidian5.Modal {
  constructor(host, type, context = {}) {
    super(host.app);
    this.host = host;
    this.type = type;
    this.context = context;
    this.projects = context.projects ?? [];
    this.course = context.course ?? "";
    this.setTitle(`\u65B0\u589E ${LABELS[type]}`);
  }
  title = "";
  projects;
  course;
  pdf = "";
  source = "";
  pending;
  onOpen() {
    this.contentEl.addClass("lr-modal");
    this.contentEl.createEl("p", { cls: "lr-modal-intro", text: "\u5148\u547D\u540D\uFF0C\u5C31\u53EF\u4EE5\u958B\u59CB\u3002\u5176\u4ED6\u8CC7\u6599\u96A8\u6642\u88DC\u5145\u3002" });
    let titleInput;
    new import_obsidian5.Setting(this.contentEl).setName("\u6A19\u984C Title").addText((t) => {
      titleInput = t.inputEl;
      t.setPlaceholder("\u8F38\u5165\u6A19\u984C").onChange((v) => this.title = v);
    });
    if (this.type === "paper") {
      const selected = this.contentEl.createDiv({ cls: "lr-selection", text: "PDF \u70BA\u9078\u586B\uFF0C\u4E5F\u53EF\u4EE5\u5148\u5EFA\u7ACB\u95B1\u8B80\u7B46\u8A18\u3002" });
      const controls = this.contentEl.createDiv({ cls: "lr-modal-actions" });
      button(controls, "\u9078\u64C7 Vault \u5167\u7684 PDF", () => new FilePicker(this.app, this.app.vault.getFiles().filter((f) => f.extension.toLowerCase() === "pdf"), (f) => {
        this.pdf = `[[${f.path}]]`;
        this.pending = void 0;
        selected.setText(f.path);
        if (!this.title) {
          this.title = f.basename;
          titleInput.value = this.title;
        }
      }).open(), { icon: "file-search" });
      const input = picker(controls, ".pdf", false, (files) => {
        this.pending = files[0];
        this.pdf = "";
        selected.setText(`\u532F\u5165\uFF1A${files[0].name}`);
        if (!this.title) {
          this.title = safeStem(files[0].name.replace(/\.pdf$/i, ""));
          titleInput.value = this.title;
        }
      });
      button(controls, "\u532F\u5165 PDF", () => input.click(), { icon: "upload" });
      button(controls, "\u6E05\u9664 PDF \u9078\u64C7", () => {
        this.pdf = "";
        this.pending = void 0;
        selected.setText("PDF \u70BA\u9078\u586B\uFF0C\u4E5F\u53EF\u4EE5\u5148\u5EFA\u7ACB\u95B1\u8B80\u7B46\u8A18\u3002");
      }, { icon: "x" });
    }
    const details = this.contentEl.createEl("details", { cls: "lr-more" });
    details.createEl("summary", { text: "\u95DC\u806F\u8207\u4F86\u6E90 \xB7 Optional" });
    if (!["course", "project"].includes(this.type)) {
      relation(details, this.host, "\u7814\u7A76\u5C08\u6848 Projects", "project", this.projects, true, (v) => this.projects = v);
      relation(details, this.host, "\u8AB2\u7A0B Course", "course", this.course ? [this.course] : [], false, (v) => this.course = v[0] ?? "");
    }
    if (this.type === "paper" || this.type === "resource") new import_obsidian5.Setting(details).setName("\u4F86\u6E90 URL").addText((t) => t.setPlaceholder("https://\u2026").onChange((v) => this.source = v));
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const footer = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(footer, "\u53D6\u6D88", () => this.close());
    const submit2 = button(footer, "\u5EFA\u7ACB\u4E26\u958B\u555F", async () => {
      if (submit2.disabled) return;
      error.empty();
      if (!safeStem(this.title)) {
        error.setText("\u8ACB\u5148\u8F38\u5165\u6A19\u984C\u3002");
        return;
      }
      if (this.source && !/^https?:\/\//i.test(this.source.trim())) {
        error.setText("\u4F86\u6E90\u8ACB\u4F7F\u7528 http \u6216 https \u7DB2\u5740\u3002");
        return;
      }
      submit2.disabled = true;
      try {
        if (this.type === "paper" && this.pending && this.host.actions.findPaper("", this.source)) throw new Error("\u6B64\u4F86\u6E90\u5DF2\u6709\u4E3B\u7B46\u8A18\u3002\u8ACB\u53D6\u6D88\u532F\u5165 PDF \u518D\u958B\u555F\u539F\u7B46\u8A18\uFF1B\u65B0\u7248\u672C\u8ACB\u4F7F\u7528\u542B\u7248\u672C\u865F\u7684\u4F86\u6E90\u3002");
        if (this.pending) {
          const [file2] = await this.host.actions.importFiles([this.pending], this.host.settings.folders.attachments);
          this.pdf = `[[${file2.path}]]`;
          this.pending = void 0;
        }
        const file = await this.host.actions.create({ ...this.context, type: this.type, title: this.title, projects: this.projects, course: this.course, pdf: this.pdf, source: this.source.trim() });
        this.close();
        await this.host.openFile(file.path);
      } catch (e) {
        error.setText(e instanceof Error ? e.message : String(e));
        submit2.disabled = false;
      }
    }, { icon: "plus", cls: "lr-primary" });
    this.contentEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit2.click();
      }
    });
    titleInput.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CaptureModal = class extends import_obsidian5.Modal {
  constructor(host, idea = false) {
    super(host.app);
    this.host = host;
    this.idea = idea;
    this.setTitle(idea ? "\u6355\u6349\u60F3\u6CD5 Capture idea" : "\u5FEB\u901F\u6536\u96C6 Quick capture");
  }
  operationId = newId();
  onOpen() {
    this.contentEl.addClass("lr-modal");
    this.contentEl.createEl("p", { cls: "lr-modal-intro", text: "\u5BEB\u4E0B\u60F3\u6CD5\u3001\u8CBC\u4E0A\u9023\u7D50\u6216 AI \u56DE\u8986\uFF0C\u5148\u653E\u9032 Inbox\u3002" });
    const area2 = this.contentEl.createEl("textarea", { cls: "lr-capture", attr: { placeholder: "\u5F9E\u9019\u88E1\u958B\u59CB\u2026", "aria-label": "\u6355\u6349\u5167\u5BB9" } });
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const footer = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(footer, "\u53D6\u6D88", () => this.close());
    const submit2 = button(footer, "\u5B58\u5165 Inbox", async () => {
      if (submit2.disabled) return;
      submit2.disabled = true;
      try {
        await this.host.actions.capture(area2.value, this.idea, this.operationId);
        this.close();
        new import_obsidian5.Notice("\u5DF2\u5B58\u5165 Inbox\u3002");
      } catch (e) {
        error.setText(String(e));
        submit2.disabled = false;
      }
    }, { icon: "inbox", cls: "lr-primary" });
    area2.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit2.click();
      }
    });
    area2.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var MetadataModal = class extends import_obsidian5.Modal {
  constructor(host, entry, organizing = false) {
    super(host.app);
    this.host = host;
    this.entry = entry;
    this.organizing = organizing;
    this.type = entry.type ?? (entry.ext === "pdf" ? "paper" : entry.ext === "md" ? "note" : "resource");
    this.status = organizing ? this.type === "paper" ? "reference" : ["course", "project"].includes(this.type) ? "active" : this.type === "experiment" ? "planned" : "" : entry.status;
    this.projects = [...entry.projects];
    this.course = entry.course;
    this.kind = entry.kind;
    this.topics = entry.topics.join(", ");
    this.setTitle(`${organizing ? "\u6574\u7406 Organize" : "\u7DE8\u8F2F\u5C6C\u6027"} \xB7 ${entry.name}`);
  }
  type;
  status;
  projects;
  course;
  kind;
  topics;
  onOpen() {
    this.contentEl.addClass("lr-modal");
    if (this.organizing) this.contentEl.createEl("p", { cls: "lr-modal-intro", text: this.entry.ext === "md" ? "\u9078\u64C7\u985E\u578B\u8207\u6B78\u5C6C\uFF0C\u4FDD\u7559\u5168\u6587\u4E26\u79FB\u81F3\u5C0D\u61C9\u8CC7\u6599\u593E\u3002" : "\u539F\u59CB\u9644\u4EF6\u5B8C\u6574\u4FDD\u7559\uFF1B\u5EFA\u7ACB\u4E00\u4EFD\u8AAA\u660E\u7B46\u8A18\uFF0C\u4E26\u628A\u9644\u4EF6\u79FB\u81F3 Attachments\u3002" });
    let statusArea;
    new import_obsidian5.Setting(this.contentEl).setName("\u985E\u578B Type").addDropdown((d) => {
      for (const type of TYPES.filter((t) => this.entry.ext === "md" || t === "resource" || t === "paper" && this.entry.ext === "pdf")) d.addOption(type, LABELS[type]);
      d.setValue(this.type).onChange((v) => {
        this.type = v;
        this.status = this.type === "paper" ? "reference" : ["course", "project"].includes(this.type) ? "active" : this.type === "experiment" ? "planned" : "";
        drawStatus();
      });
      if (!this.organizing) d.setDisabled(true);
    });
    statusArea = this.contentEl.createDiv();
    const drawStatus = () => {
      statusArea.empty();
      new import_obsidian5.Setting(statusArea).setName("\u72C0\u614B Status").addDropdown((d) => {
        d.addOption("", "\u672A\u6307\u5B9A");
        for (const status of STATUSES[this.type]) d.addOption(status, `${STATUS_LABELS[status] ?? status} \xB7 ${status}`);
        if (this.status && !STATUSES[this.type].includes(this.status)) d.addOption(this.status, this.status);
        d.setValue(this.status).onChange((v) => this.status = v);
      });
    };
    drawStatus();
    relation(this.contentEl, this.host, "\u7814\u7A76\u5C08\u6848 Projects", "project", this.projects, true, (v) => this.projects = v);
    relation(this.contentEl, this.host, "\u8AB2\u7A0B Course", "course", this.course ? [this.course] : [], false, (v) => this.course = v[0] ?? "");
    const more = this.contentEl.createEl("details", { cls: "lr-more" });
    more.createEl("summary", { text: "\u5206\u985E \xB7 Optional" });
    new import_obsidian5.Setting(more).setName("\u7B46\u8A18\u7528\u9014 Kind").addDropdown((d) => d.addOptions({ "": "\u4E00\u822C", "concept": "\u53EF\u91CD\u7528\u6982\u5FF5 Concept", "lecture": "\u8B1B\u7FA9 Lecture", "assignment": "\u4F5C\u696D Assignment", "review": "\u8907\u7FD2 Review" }).addOption(this.kind, this.kind || "\u4E00\u822C").setValue(this.kind).onChange((v) => this.kind = v));
    new import_obsidian5.Setting(more).setName("\u4E3B\u984C Topics").setDesc("\u4EE5\u9017\u865F\u5206\u9694\uFF0C\u7121\u9700\u9810\u5148\u5EFA\u7ACB\u5206\u985E\u3002").addText((t) => t.setValue(this.topics).onChange((v) => this.topics = v));
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const footer = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(footer, "\u53D6\u6D88", () => this.close());
    const submit2 = button(footer, this.organizing ? "\u5132\u5B58\u4E26\u6574\u7406" : "\u5132\u5B58", async () => {
      if (submit2.disabled) return;
      submit2.disabled = true;
      try {
        const file = this.app.vault.getFileByPath(this.entry.path);
        if (!file) throw new Error("\u539F\u59CB\u6A94\u6848\u5DF2\u4E0D\u5B58\u5728\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u5DE5\u4F5C\u5340\u3002");
        const values = { status: this.status, projects: this.projects, course: this.course, kind: this.kind, topics: this.topics.split(/[,，]/).map((t) => t.trim()).filter(Boolean) };
        if (this.organizing) await this.host.actions.organize(file, this.type, values);
        else await this.host.actions.update(file, values);
        this.close();
        new import_obsidian5.Notice("\u5DF2\u5132\u5B58\u3002");
      } catch (e) {
        error.setText(e instanceof Error ? e.message : String(e));
        submit2.disabled = false;
      }
    }, { icon: "check", cls: "lr-primary" });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/records.ts
var filesFor = (host) => new PortableStore(host.app, () => host.settings);
var RecordModal = class extends import_obsidian6.Modal {
  constructor(host, context = {}) {
    super(host.app);
    this.host = host;
    this.context = context;
    this.setTitle("\u7559\u4E0B\u5DE5\u4F5C\u8A18\u9304");
  }
  id = newId();
  onOpen() {
    this.contentEl.addClass("lr-modal");
    this.contentEl.createEl("p", { cls: "lr-modal-intro", text: "\u4E00\u53E5\u7C21\u8A18\u6216\u9577\u6BB5\u5C0D\u8A71\u90FD\u53EF\u4EE5\u3002\u539F\u59CB\u8F38\u5165\u4FDD\u7559\uFF1B\u4E00\u822C\u6587\u5B57\u653E\u5165\u300C\u904E\u7A0B\u300D\uFF0C\u5176\u9918\u6BB5\u843D\u7559\u7A7A\uFF0C\u4E0D\u731C\u6E2C\u6210\u679C\u3002" });
    const raw = area(this.contentEl, "\u539F\u59CB\u8F38\u5165", this.context.raw || "", 9);
    const more = fold(this.contentEl, "\u65E5\u671F\u3001\u95DC\u806F\u8207\u4F86\u6E90 \xB7 \u9078\u586B");
    const title = field(more, "\u6A19\u984C");
    const date = field(more, "\u65E5\u671F", localStamp(Date.now(), this.host.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10), "date");
    let projects = [...this.context.projects || []], course = this.context.course || "";
    relation(more, this.host, "\u7814\u7A76\u5C08\u6848", "project", projects, true, (v) => projects = v);
    relation(more, this.host, "\u8AB2\u7A0B", "course", course ? [course] : [], false, (v) => course = v[0] || "");
    const task = field(more, "\u4EFB\u52D9\u9023\u7D50\uFF08\u9078\u586B\uFF09", this.context.task || "");
    const source = field(more, "\u4F86\u6E90\u9023\u7D50\u6216 URL\uFF08\u672A\u77E5\u7559\u7A7A\uFF09", this.context.source || "");
    submit(this, "\u4FDD\u5B58\u8349\u7A3F", async () => {
      const record = await new RecordStore(filesFor(this.host), () => this.host.settings).capture({ title: title.value, raw: raw.value, date: date.value, projects, course, task: task.value, source: source.value }, this.id);
      this.close();
      new import_obsidian6.Notice(`\u5DF2\u4FDD\u5B58\uFF1A${record.path}`);
    });
    raw.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var TextPreviewModal = class extends import_obsidian6.Modal {
  constructor(host, title, text2) {
    super(host.app);
    this.text = text2;
    this.setTitle(title);
  }
  onOpen() {
    this.contentEl.addClass("lr-modal");
    const text2 = area(this.contentEl, "\u9810\u89BD\uFF0F\u53EF\u9078\u53D6\u8907\u88FD", this.text, 15);
    button(this.contentEl, "\u8907\u88FD", async () => {
      await copyText(text2.value);
      new import_obsidian6.Notice("\u5DF2\u8907\u88FD\u3002");
    });
    button(this.contentEl, "\u532F\u51FA Markdown", () => downloadMarkdown("\u5DE5\u4F5C\u8A18\u9304\u532F\u51FA", text2.value, this.contentEl.ownerDocument));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var RecordDetailModal = class extends import_obsidian6.Modal {
  constructor(host, snapshot) {
    super(host.app);
    this.host = host;
    this.snapshot = snapshot;
    this.setTitle(String(snapshot.fm.title || "\u5DE5\u4F5C\u8A18\u9304"));
  }
  onOpen() {
    this.contentEl.addClass("lr-modal");
    const rawIndex = this.snapshot.body.indexOf("<details>\n<summary>\u539F\u59CB\u8F38\u5165\uFF08\u4FDD\u7559\uFF09</summary>");
    const original = rawIndex < 0 ? "" : this.snapshot.body.slice(rawIndex);
    const draft = area(this.contentEl, "\u8A18\u9304\u6B63\u6587", rawIndex < 0 ? this.snapshot.body : this.snapshot.body.slice(0, rawIndex), 14);
    if (original) {
      const raw = fold(this.contentEl, "\u539F\u59CB\u8F38\u5165\u8207\u4F86\u6E90\uFF08\u4FDD\u7559\uFF09");
      const input = area(raw, "\u539F\u6587", original, 5);
      input.readOnly = true;
    }
    const body = () => draft.value + (original ? "\n\n" + original : "");
    const tools = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(tools, "\u958B\u555F\u539F\u6A94", () => this.host.openFile(this.snapshot.path));
    const source = this.snapshot.fm.source;
    if (typeof source === "string" && source) {
      const f = this.host.index.resolve(source, this.snapshot.path);
      if (f) button(tools, "\u958B\u555F\u4F86\u6E90", () => this.host.openFile(f.path));
      else if (/^https?:\/\//i.test(source)) tools.createEl("a", { text: "\u958B\u555F\u4F86\u6E90 \u2197", href: source, attr: { target: "_blank", rel: "noopener noreferrer" } });
      else this.contentEl.createEl("p", { cls: "lr-muted", text: "\u4F86\u6E90\u5C1A\u672A\u627E\u5230\uFF1A" + source });
    }
    button(tools, "\u8907\u88FD\u6574\u7406\u6307\u4EE4", async () => {
      await copyText(`\u8ACB\u5148\u8B80\u53D6 ${this.snapshot.path} \u548C\u5176\u4E2D\u660E\u78BA\u5F15\u7528\u7684\u4F86\u6E90\u3002\u4FDD\u7559\u539F\u59CB\u8F38\u5165\u8207\u4F7F\u7528\u8005\u4FEE\u6B63\uFF0C\u4F9D\u76EE\u6A19\u3001\u904E\u7A0B\u3001\u7D50\u679C\u3001\u672A\u4F86\u8A08\u5283\u589E\u91CF\u6574\u7406\uFF1B\u5340\u5206\u4F86\u6E90\u4E8B\u5BE6\u3001\u4F7F\u7528\u8005\u9673\u8FF0\u8207 AI \u5EFA\u8B70\u3002\u4E0D\u63A8\u65B7\u5B8C\u6210\u7387\u3002\u4FEE\u6539\u524D\u91CD\u8B80\uFF0C\u6700\u5F8C\u56DE\u5831\u5BE6\u969B\u4FEE\u6539\u7684\u6A94\u6848\u548C\u5F85\u78BA\u8A8D\u4E8B\u9805\u3002

${wiki(this.snapshot.path)}`);
      new import_obsidian6.Notice("\u5DF2\u8907\u88FD\u6307\u4EE4\uFF1B\u5C1A\u672A\u57F7\u884C AI\u3002");
    });
    button(tools, "\u8907\u88FD\uFF0F\u532F\u51FA", () => new TextPreviewModal(this.host, "\u532F\u51FA\u9810\u89BD", body()).open());
    submit(this, "\u5132\u5B58\u4FEE\u6B63", async () => {
      await filesFor(this.host).update(this.snapshot, {}, body());
      this.close();
      new import_obsidian6.Notice("\u5DF2\u5132\u5B58\u4FEE\u6B63\u3002");
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var DiaryModal = class extends import_obsidian6.Modal {
  constructor(host, records, day) {
    super(host.app);
    this.host = host;
    this.records = records;
    this.day = day;
    this.setTitle("\u65E5\u8A18 Journal");
  }
  closed = false;
  onOpen() {
    this.contentEl.addClass("lr-modal");
    const date = field(this.contentEl, "\u65E5\u671F", this.day, "date");
    this.contentEl.createEl("p", { cls: "lr-muted", text: "\u53EA\u7D44\u5408\u6B64\u65E5\u671F\u7684\u5DF2\u6709\u5DE5\u4F5C\u8A18\u9304\u3002\u5DF2\u6709\u65E5\u8A18\u6703\u5148\u8F09\u5165\u4FEE\u6B63\u5167\u5BB9\uFF1B\u300C\u91CD\u65B0\u7D44\u5408\u300D\u63D0\u4F9B\u5C0D\u7167\uFF0C\u9700\u660E\u78BA\u5957\u7528\u3002" });
    const editor = area(this.contentEl, "\u65E5\u8A18\uFF08\u53EF\u7DE8\u8F2F\uFF09", "", 15);
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    let snapshot, loaded = false, generation = 0, dirty = false;
    editor.addEventListener("input", () => dirty = true);
    const load = async () => {
      if (dirty) {
        error.setText("\u76EE\u524D\u6709\u672A\u4FDD\u5B58\u4FEE\u6B63\uFF0C\u8ACB\u5148\u5132\u5B58\u6216\u95DC\u9589\u518D\u5207\u63DB\u65E5\u671F\u3002");
        date.value = this.day;
        return;
      }
      loaded = false;
      const epoch = ++generation;
      this.day = date.value;
      snapshot = void 0;
      try {
        const path = `${this.host.settings.folders.note}/Journal/${date.value}.md`;
        const old = this.app.vault.getFileByPath(path);
        const current = old ? await filesFor(this.host).read(path) : void 0;
        if (this.closed || epoch !== generation) return;
        snapshot = current;
        editor.value = current?.body || diaryPreview(date.value, this.records);
        loaded = true;
        error.empty();
      } catch (e) {
        error.setText(String(e));
      }
    };
    date.addEventListener("change", () => void load());
    void load();
    const tools = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(tools, "\u91CD\u65B0\u7D44\u5408\uFF0F\u5C0D\u7167", async () => {
      const latest = await filesFor(this.host).list("work-log");
      if (latest.errors.length) throw new Error(latest.errors.join("\n"));
      this.records = latest.items;
      const proposed = diaryPreview(date.value, this.records);
      const modal = new TextPreviewModal(this.host, "\u91CD\u65B0\u7D44\u5408\u9810\u89BD\uFF08\u5C1A\u672A\u5957\u7528\uFF09", `<!-- \u76EE\u524D\u5167\u5BB9 -->
${editor.value}

<!-- \u65B0\u7D44\u5408 -->
${proposed}`);
      modal.open();
      button(modal.contentEl, "\u5957\u7528\u65B0\u7D44\u5408\u5230\u8349\u7A3F", () => {
        editor.value = proposed;
        dirty = true;
        modal.close();
        new import_obsidian6.Notice("\u5DF2\u5957\u7528\u5230\u8349\u7A3F\uFF0C\u5C1A\u672A\u4FDD\u5B58\u3002");
      });
    });
    button(tools, "\u8907\u88FD", async () => {
      await copyText(editor.value);
      new import_obsidian6.Notice("\u5DF2\u8907\u88FD\u65E5\u8A18\u3002");
    });
    button(tools, "\u532F\u51FA Markdown", () => downloadMarkdown(date.value + " \u65E5\u8A18", editor.value, this.contentEl.ownerDocument));
    submit(this, "\u5132\u5B58\u65E5\u8A18", async () => {
      if (!loaded) throw new Error("\u65E5\u8A18\u4ECD\u5728\u8B80\u53D6\u3002");
      snapshot = await new RecordStore(filesFor(this.host), () => this.host.settings).diary(date.value, editor.value, snapshot);
      dirty = false;
      new import_obsidian6.Notice("\u65E5\u8A18\u5DF2\u4FDD\u5B58\u3002");
    });
  }
  onClose() {
    this.closed = true;
    this.contentEl.empty();
  }
};
function renderRecords(parent, host, component, alive, context) {
  const tools = parent.createDiv({ cls: "lr-list-toolbar" });
  button(tools, "\u7559\u4E0B\u8A18\u9304", () => new RecordModal(host, context ? { projects: [wiki(context)] } : {}).open(), { icon: "notebook-pen", cls: "lr-primary" });
  const search = field(tools, "\u67E5\u627E\u8A18\u9304");
  search.type = "search";
  const day = field(tools, "\u65E5\u671F\u7BC4\u570D\uFF1A\u5F9E", "", "date"), until = field(tools, "\u81F3", "", "date");
  const list = parent.createDiv();
  const error = parent.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
  let selected = /* @__PURE__ */ new Set();
  void (async () => {
    try {
      const data = await filesFor(host).list("work-log");
      if (!alive()) return;
      if (data.errors.length) error.setText(data.errors.join("\n"));
      let records = data.items.filter((r) => !context || Array.isArray(r.fm.projects) && r.fm.projects.some((value) => typeof value === "string" && host.index.resolve(value, r.path)?.path === context));
      button(tools, "\u65E5\u8A18", async () => {
        const latest = await filesFor(host).list("work-log");
        if (latest.errors.length) throw new Error(latest.errors.join("\n"));
        new DiaryModal(host, latest.items, localStamp(Date.now(), host.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10)).open();
      }, { icon: "book-open" });
      button(tools, "\u9810\u89BD\u9078\u5B9A\u8A18\u9304", () => {
        const chosen = records.filter((r) => selected.has(r.path));
        if (!chosen.length) throw new Error("\u8ACB\u5148\u52FE\u9078\u8A18\u9304\u3002");
        new TextPreviewModal(host, "\u9078\u5B9A\u8A18\u9304\u532F\u51FA", chosen.map((r) => `\u4F86\u6E90\uFF1A${wiki(r.path)}

${r.body}`).join("\n\n---\n\n")).open();
      });
      const draw = () => {
        list.empty();
        const filtered = records.filter((r) => r.fm.status !== "archived" && (!day.value || String(r.fm.date) >= day.value) && (!until.value || String(r.fm.date) <= until.value) && [r.fm.title, r.body].join(" ").toLocaleLowerCase().includes(search.value.toLocaleLowerCase())).sort((a, b) => String(b.fm.date).localeCompare(String(a.fm.date)) || String(b.fm.created).localeCompare(String(a.fm.created)));
        if (!filtered.length) {
          empty(list, "notebook-pen", "\u5C1A\u7121\u7B26\u5408\u7684\u8A18\u9304", "\u8CBC\u4E00\u6BB5\u6587\u5B57\u5373\u53EF\u4FDD\u5B58\u539F\u6587\u3001\u65E5\u671F\u8207\u95DC\u806F\uFF0C\u4E4B\u5F8C\u518D\u6574\u7406\u3002");
          return;
        }
        for (const record of filtered.slice(0, 50)) {
          const row = list.createDiv({ cls: "lr-record-row" });
          const check = row.createEl("input", { attr: { type: "checkbox", "aria-label": "\u9078\u64C7 " + String(record.fm.title) } });
          check.checked = selected.has(record.path);
          check.addEventListener("change", () => {
            if (check.checked) selected.add(record.path);
            else selected.delete(record.path);
          });
          const info = row.createDiv({ cls: "lr-row-info" });
          button(info, String(record.fm.title || record.path), () => new RecordDetailModal(host, record).open(), { cls: "lr-row-title", title: record.path });
          info.createDiv({ cls: "lr-row-meta", text: `${String(record.fm.date || "\u65E5\u671F\u672A\u8A2D\u5B9A")} \xB7 ${String(record.fm.status || "\u672A\u6307\u5B9A")}` });
          const result = continuation(record);
          if (result.result) info.createEl("p", { cls: "lr-muted", text: result.result.slice(0, 150) });
          button(row, "\u539F\u6A94", () => host.openFile(record.path), { cls: "lr-quiet" });
        }
        if (filtered.length > 50) list.createEl("p", { cls: "lr-muted", text: "\u986F\u793A\u524D 50 \u9805\uFF1B\u8ACB\u7E2E\u5C0F\u65E5\u671F\u7BC4\u570D\u6216\u641C\u5C0B\u3002" });
      };
      for (const input of [search, day, until]) input.addEventListener("input", draw);
      draw();
    } catch (e) {
      if (alive()) error.setText(String(e));
    }
  })();
}
function renderContinue(parent, host, component, alive, context) {
  void (async () => {
    try {
      const data = await filesFor(host).list("work-log");
      if (!alive()) return;
      const records = data.items.filter((r) => r.fm.status !== "archived" && (!context || Array.isArray(r.fm.projects) && r.fm.projects.some((p) => typeof p === "string" && host.index.resolve(p, r.path)?.path === context))).sort((a, b) => String(b.fm.date).localeCompare(String(a.fm.date)) || String(b.fm.created).localeCompare(String(a.fm.created)));
      if (!records.length) {
        empty(parent, "rotate-ccw", "\u5C1A\u672A\u7559\u4E0B\u7E8C\u63A5\u8A18\u9304", "\u5148\u8A18\u4E0B\u7D50\u679C\u3001\u554F\u984C\u6216\u4E0B\u4E00\u6B65\uFF0C\u9019\u88E1\u6703\u5F15\u7528\u539F\u59CB\u8A18\u9304\u3002", { label: "\u7559\u4E0B\u8A18\u9304", run: () => new RecordModal(host, context ? { projects: [wiki(context)] } : {}).open() });
        return;
      }
      const record = records[0], value = continuation(record);
      parent.createDiv({ cls: "lr-row-meta", text: String(record.fm.date) + " \xB7 " + String(record.fm.title) });
      for (const [label, text2] of [["\u4E0A\u6B21\u7D50\u679C", value.result], ["\u4E0B\u4E00\u6B65\uFF0F\u672A\u89E3\u554F\u984C", value.next]]) {
        parent.createEl("h3", { text: label });
        if (text2) {
          const el = parent.createDiv({ cls: "lr-continuation markdown-rendered" });
          void import_obsidian6.MarkdownRenderer.render(host.app, text2, el, record.path, component);
        } else parent.createEl("p", { cls: "lr-muted", text: "\u5C1A\u672A\u8A18\u9304\u3002" });
      }
      const tools = parent.createDiv({ cls: "lr-detail-actions" });
      button(tools, "\u4E0A\u6B21\u8A18\u9304", () => new RecordDetailModal(host, record).open());
      button(tools, "\u539F\u59CB\u7B46\u8A18", () => host.openFile(record.path));
      button(tools, "\u65B0\u589E\u672C\u6B21\u8A18\u9304", () => new RecordModal(host, { projects: Array.isArray(record.fm.projects) ? record.fm.projects : [], task: String(record.fm.task || ""), source: wiki(record.path) }).open());
      button(tools, "\u8907\u88FD\u7E8C\u63A5\u4E0A\u4E0B\u6587", async () => {
        await copyText(`\u4F86\u6E90\uFF1A${wiki(record.path)}

\u76EE\u524D\u76EE\u6A19\uFF1A
${value.goal || "\u5C1A\u672A\u8A18\u9304"}

\u4E0A\u6B21\u7D50\u679C\uFF1A
${value.result || "\u5C1A\u672A\u8A18\u9304"}

\u4E0B\u4E00\u6B65\uFF0F\u672A\u89E3\u554F\u984C\uFF1A
${value.next || "\u5C1A\u672A\u8A18\u9304"}

\u76F8\u95DC\u6750\u6599\uFF1A${String(record.fm.source || "\u5C1A\u672A\u8A18\u9304")}

\u8ACB\u5148\u8B80\u4F86\u6E90\u518D\u7E8C\u63A5\uFF0C\u4FDD\u7559\u539F\u6587\u8207\u4FEE\u6B63\uFF0C\u4E0D\u63A8\u65B7\u5B8C\u6210\u72C0\u614B\u3002`);
        new import_obsidian6.Notice("\u5DF2\u8907\u88FD\u4F86\u6E90\u8207\u7E8C\u63A5\u5167\u5BB9\u3002");
      });
      if (data.errors.length) parent.createDiv({ cls: "lr-form-error", text: data.errors.join("\n") });
    } catch (e) {
      if (alive()) parent.createDiv({ cls: "lr-form-error", text: String(e) });
    }
  })();
}

// src/ui/task-panel.ts
var TaskModal = class extends import_obsidian7.Modal {
  constructor(host, store, task) {
    super(host.app);
    this.host = host;
    this.store = store;
    this.task = task;
    this.setTitle("\u5F85\u8FA6\u8A73\u60C5");
  }
  onOpen() {
    this.contentEl.addClass("lr-modal");
    const title = field(this.contentEl, "\u5167\u5BB9\uFF08\u53EF\u542B Wikilinks\uFF09", this.task.text);
    const priority = select(this.contentEl, "\u512A\u5148\u7D1A", [["", "\u672A\u6307\u5B9A"], ["high", "\u512A\u5148"], ["normal", "\u4E00\u822C"], ["low", "\u7A0D\u5F8C"]], this.task.priority || "");
    const due = field(this.contentEl, "\u65E5\u671F\uFF08\u9078\u586B\uFF09", this.task.due || "", "date");
    this.contentEl.createEl("p", { cls: "lr-muted", text: this.task.suggested ? "AI \u5019\u9078\u4E8B\u9805\uFF0C\u63A1\u7D0D\u524D\u4E0D\u6703\u6392\u5165\u65E5\u66C6\u3002" : "\u5B8C\u6210\u72C0\u614B\u7531\u6E05\u55AE\u6838\u53D6\u65B9\u584A\u6C7A\u5B9A\uFF1B\u5B89\u6392\u6642\u9593\u4E0D\u6703\u5B8C\u6210\u5F85\u8FA6\u3002" });
    const tools = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(tools, "\u958B\u555F\u539F\u59CB\u6E05\u55AE", () => this.host.openFile(this.store.path), { icon: "file-pen-line" });
    button(tools, "\u8907\u88FD\u4EFB\u52D9\u9023\u7D50", async () => {
      this.task = await this.store.identify(this.task);
      await copyText(wiki(this.store.path, this.task.id));
      new import_obsidian7.Notice("\u5DF2\u8907\u88FD\u4EFB\u52D9\u9023\u7D50\u3002");
    });
    button(tools, "\u65B0\u589E\u76F8\u95DC\u8A18\u9304", async () => {
      this.task = await this.store.identify(this.task);
      new RecordModal(this.host, { task: wiki(this.store.path, this.task.id) }).open();
    });
    if (this.task.id) {
      const target = wiki(this.store.path, this.task.id);
      const linked = this.host.index.all().filter((e) => e.links.some((l) => l.includes("#^" + this.task.id)));
      if (linked.length) {
        this.contentEl.createEl("h3", { text: "\u660E\u78BA\u76F8\u95DC\u7684\u5B89\u6392\u8207\u8A18\u9304" });
        for (const entry of linked) button(this.contentEl, entry.name, () => this.host.openFile(entry.path), { cls: "lr-quiet", title: target + " \xB7 " + entry.path });
      }
    }
    submit(this, this.task.suggested ? "\u63A1\u7D0D\u4E26\u5132\u5B58" : "\u5132\u5B58", async () => {
      if (due.value && !validDay(due.value)) throw new Error("\u65E5\u671F\u683C\u5F0F\u932F\u8AA4\u3002");
      await this.store.edit(this.task, { text: title.value, priority: priority.value, due: due.value, suggested: false });
      this.close();
      new import_obsidian7.Notice("\u5DF2\u5132\u5B58\u5F85\u8FA6\u3002");
    });
    title.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function renderTaskPanel(parent, host, options) {
  const store = new TaskStore(host.app, `${host.settings.folders.note}/Tasks.md`);
  const form = parent.createDiv({ cls: "lr-task-capture" });
  const input = form.createEl("input", { cls: "lr-task-input", attr: { type: "text", placeholder: "\u4E00\u53E5\u8A71\u65B0\u589E\u5F85\u8FA6\u2026", "aria-label": "\u65B0\u589E\u5F85\u8FA6\u5167\u5BB9" } });
  input.value = options.draft.text;
  input.addEventListener("input", () => options.draft.text = input.value);
  const error = parent.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
  const add = button(form, "\u65B0\u589E\u5F85\u8FA6", async () => {
    if (add.disabled) return;
    add.disabled = true;
    try {
      await store.add(input.value + (options.project ? " " + wiki(options.project) : ""));
      options.draft.text = "";
      input.value = "";
      await draw();
    } catch (e) {
      error.setText(String(e));
    } finally {
      add.disabled = false;
    }
  }, { icon: "plus", cls: "lr-primary" });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      add.click();
    }
  });
  const tools = parent.createDiv({ cls: "lr-task-tools" });
  const search = tools.createEl("input", { cls: "lr-search-input", attr: { type: "search", placeholder: "\u67E5\u627E\u5F85\u8FA6", "aria-label": "\u67E5\u627E\u5F85\u8FA6" } });
  search.value = options.draft.query || "";
  const mode = select(tools, "\u72C0\u614B", [["open", "\u672A\u5B8C\u6210"], ["all", "\u542B\u5DF2\u5B8C\u6210"], ["suggested", "AI \u5019\u9078"]], options.draft.mode || "open");
  button(tools, "\u539F\u59CB\u6E05\u55AE", async () => {
    if (!host.app.vault.getFileByPath(store.path)) throw new Error("\u65B0\u589E\u7B2C\u4E00\u9805\u5F85\u8FA6\u5F8C\u624D\u5EFA\u7ACB\u6E05\u55AE\u3002");
    await host.openFile(store.path);
  }, { cls: "lr-quiet" });
  const list = parent.createDiv();
  let generation = 0;
  let limit = options.compact ? 6 : 30;
  const draw = async () => {
    const current = ++generation;
    try {
      const content = await store.read();
      if (!options.alive() || current !== generation) return;
      let tasks = parseTasks(content).filter((t) => mode.value === "suggested" ? t.suggested : !t.suggested && (mode.value === "all" || !t.done));
      if (options.project) tasks = tasks.filter((t) => [...t.text.matchAll(/\[\[([^\]]+)\]\]/g)].some((m) => host.index.resolve(m[0], store.path)?.path === options.project));
      tasks = tasks.filter((t) => t.text.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));
      tasks.sort((a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1) || (a.due || "9999").localeCompare(b.due || "9999") || a.line - b.line);
      list.empty();
      if (!tasks.length) {
        empty(list, "list-checks", "\u76EE\u524D\u6C92\u6709\u7B26\u5408\u7684\u5F85\u8FA6", "\u5F85\u8FA6\u5728\u540C\u4E00\u4EFD Markdown \u4E2D\u4FDD\u5B58\uFF1B\u5019\u9078\u5EFA\u8B70\u9700\u5148\u63A1\u7D0D\u3002");
        return;
      }
      for (const task of tasks.slice(0, limit)) {
        const row = list.createDiv({ cls: `lr-task-row ${task.done ? "is-done" : ""}` });
        const check = row.createEl("input", { attr: { type: "checkbox", "aria-label": `${task.done ? "\u91CD\u65B0\u958B\u555F" : "\u5B8C\u6210"} ${task.text}` } });
        check.checked = task.done;
        check.disabled = !!task.suggested;
        const text2 = row.createDiv({ cls: "lr-task-text" });
        void import_obsidian7.MarkdownRenderer.render(host.app, task.text, text2, store.path, options.component);
        const meta = text2.createDiv({ cls: "lr-row-meta", text: [task.priority === "high" ? "\u512A\u5148" : "", task.due || "", task.suggested ? "\u5019\u9078" : ""].filter(Boolean).join(" \xB7 ") });
        if (!meta.textContent) meta.remove();
        button(row, task.suggested ? "\u6AA2\u8996\uFF0F\u63A1\u7D0D" : "\u8A73\u60C5", () => new TaskModal(host, store, task).open(), { cls: "lr-quiet" });
        check.addEventListener("change", () => {
          void (async () => {
            check.disabled = true;
            try {
              await store.toggle(task);
              await draw();
            } catch (e) {
              check.checked = task.done;
              error.setText(String(e));
            } finally {
              check.disabled = false;
            }
          })();
        });
      }
      if (tasks.length > limit) button(list, "\u986F\u793A\u66F4\u591A", () => {
        limit += 30;
        return draw();
      }, { cls: "lr-quiet" });
    } catch (e) {
      error.setText(String(e));
    }
  };
  search.addEventListener("input", () => {
    options.draft.query = search.value;
    void draw();
  });
  mode.addEventListener("change", () => {
    options.draft.mode = mode.value;
    void draw();
  });
  void draw();
}

// src/ui/calendar.ts
var import_obsidian8 = require("obsidian");

// src/data/calendar.ts
init_portable();
function arrangement(snapshot) {
  const { fm } = snapshot;
  if (typeof fm.start !== "string" || typeof fm.end !== "string" || !rangeValid(fm.start, fm.end) || typeof fm.title !== "string") throw new Error(`${snapshot.path}\uFF1A\u5B89\u6392\u7F3A\u5C11\u6709\u6548 title/start/end\u3002`);
  return { ...snapshot, title: fm.title, start: fm.start, end: fm.end, timezone: String(fm.timezone ?? "UTC"), task: String(fm.task ?? ""), projects: Array.isArray(fm.projects) ? fm.projects.filter((v) => typeof v === "string") : [], course: String(fm.course ?? ""), archived: fm.status === "archived" };
}
var CalendarStore = class {
  constructor(files, settings) {
    this.files = files;
    this.settings = settings;
  }
  async list() {
    const data = await this.files.list("schedule");
    const items = [];
    for (const snapshot of data.items) {
      try {
        items.push(arrangement(snapshot));
      } catch (e) {
        data.errors.push(String(e));
      }
    }
    return { items, errors: data.errors };
  }
  async save(values, body, snapshot, id = newId()) {
    if (!values.title.trim() || !rangeValid(values.start, values.end)) throw new Error("\u8ACB\u586B\u6A19\u984C\uFF0C\u7D50\u675F\u6642\u9593\u9808\u665A\u65BC\u958B\u59CB\u6642\u9593\u3002");
    const fm = { ...values, title: values.title.trim(), kind: "schedule" };
    return arrangement(snapshot ? await this.files.update(snapshot, fm, body) : await this.files.create(`${this.settings().folders.note}/Schedule`, values.title, fm, body, id));
  }
  async archive(snapshot) {
    return this.files.update(snapshot, { status: "archived" });
  }
  async restore(snapshot) {
    return this.files.update(snapshot, { status: void 0 });
  }
  async duplicate(item) {
    return arrangement(await this.files.create(`${this.settings().folders.note}/Schedule`, item.title + "\uFF08\u526F\u672C\uFF09", { ...item.fm, created: (/* @__PURE__ */ new Date()).toISOString(), title: item.title + "\uFF08\u526F\u672C\uFF09" }, item.body, newId()));
  }
};
function layoutEvents(events) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start) || a.path.localeCompare(b.path));
  const result = /* @__PURE__ */ new Map();
  let group = [], end = 0;
  const flush = () => {
    group.forEach((e, i) => result.set(e.path, { column: i, columns: group.length }));
    group = [];
  };
  for (const event of sorted) {
    if (group.length && Date.parse(event.start) >= end) flush();
    group.push(event);
    end = Math.max(group.length === 1 ? 0 : end, Date.parse(event.end));
  }
  flush();
  return result;
}

// src/ui/calendar.ts
init_portable();
init_tasks();
var storeFor = (host) => new CalendarStore(new PortableStore(host.app, () => host.settings), () => host.settings);
var ArrangementModal = class extends import_obsidian8.Modal {
  constructor(host, state, change, initial, entry) {
    super(host.app);
    this.host = host;
    this.state = state;
    this.change = change;
    this.initial = initial;
    this.entry = entry;
    this.setTitle(entry ? "\u5B89\u6392\u8A73\u60C5" : "\u65B0\u589E\u5B89\u6392");
  }
  id = newId();
  closed = false;
  onOpen() {
    this.contentEl.addClass("lr-modal");
    const zone = this.host.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const title = field(this.contentEl, "\u6A19\u984C", this.entry?.title || "");
    const times = this.contentEl.createDiv({ cls: "lr-fields-row" });
    const start = field(times, "\u958B\u59CB", localStamp(this.initial.start, zone), "datetime-local");
    const end = field(times, "\u7D50\u675F", localStamp(this.initial.end, zone), "datetime-local");
    const warning = this.contentEl.createDiv({ cls: "lr-warning lr-hidden", attr: { role: "status" } });
    this.contentEl.createEl("p", { cls: "lr-muted", text: `\u6642\u5340 ${zone} \xB7 \u5B89\u6392\u662F\u8A08\u5283\uFF0C\u4E0D\u8868\u793A\u5DF2\u5B8C\u6210\u5DE5\u4F5C\u3002` });
    const note = area(this.contentEl, "\u7C21\u8A18\uFF08\u9078\u586B\uFF09", this.entry?.body || "", 3);
    const details = fold(this.contentEl, "\u95DC\u806F \xB7 \u9078\u586B");
    let projects = [...this.entry?.projects || []], course = this.entry?.course || "";
    relation(details, this.host, "\u7814\u7A76\u5C08\u6848", "project", projects, true, (v) => projects = v);
    relation(details, this.host, "\u8AB2\u7A0B", "course", course ? [course] : [], false, (v) => course = v[0] || "");
    const taskSelect = select(details, "\u5F85\u8FA6", [["", "\u4E0D\u9023\u7D50\u5F85\u8FA6"]], this.entry?.task || this.initial.task || "");
    const tasks = new TaskStore(this.app, `${this.host.settings.folders.note}/Tasks.md`);
    let choices = [];
    let loaded = false;
    void (async () => {
      try {
        choices = parseTasks(await tasks.read()).filter((t) => !t.suggested);
        if (this.closed) return;
        for (const task of choices) taskSelect.createEl("option", { value: String(task.line), text: `${task.done ? "\u2713 " : ""}${task.text}` });
        const value = this.entry?.task || this.initial.task || "";
        const linked = choices.find((t) => t.id && wiki(tasks.path, t.id) === value);
        if (linked) taskSelect.value = String(linked.line);
        else if (value) {
          taskSelect.createEl("option", { value, text: value });
          taskSelect.value = value;
        }
        loaded = true;
      } catch (e) {
        warning.removeClass("lr-hidden");
        warning.setText("\u5F85\u8FA6\u8B80\u53D6\u5931\u6557\uFF1A" + String(e));
      }
    })();
    const store = storeFor(this.host);
    const checkOverlap = async () => {
      try {
        const range = { start: toInstant(start.value, zone), end: toInstant(end.value, zone) };
        const data = await store.list();
        if (this.closed) return;
        const count = data.items.filter((e) => !e.archived && e.path !== this.entry?.path && overlaps(e, range)).length;
        warning.toggleClass("lr-hidden", !count);
        warning.setText(count ? `\u8207 ${count} \u9805\u5B89\u6392\u91CD\u758A\uFF1B\u53EF\u7167\u5E38\u4FDD\u5B58\uFF0C\u4E0D\u6703\u79FB\u52D5\u5176\u4ED6\u5B89\u6392\u3002` : "");
      } catch {
      }
    };
    start.addEventListener("change", () => void checkOverlap());
    end.addEventListener("change", () => void checkOverlap());
    void checkOverlap();
    if (this.entry) {
      const entry = this.entry, tools = this.contentEl.createDiv({ cls: "lr-modal-actions" });
      button(tools, "\u958B\u555F\u539F\u6A94", () => this.host.openFile(entry.path));
      button(tools, "\u76F8\u95DC\u5DE5\u4F5C\u8A18\u9304", () => new RecordModal(this.host, { projects: entry.projects, task: entry.task, source: wiki(entry.path), course: entry.course }).open());
      const duplicate = button(tools, "\u8907\u88FD\u5B89\u6392", async () => {
        if (duplicate.disabled) return;
        duplicate.disabled = true;
        try {
          await store.duplicate(entry);
          this.close();
          this.change();
          new import_obsidian8.Notice("\u5DF2\u5EFA\u7ACB\u7368\u7ACB\u526F\u672C\u3002");
        } finally {
          duplicate.disabled = false;
        }
      });
      const remove = button(tools, "\u522A\u9664\uFF08\u53EF\u6062\u5FA9\uFF09", async () => {
        if (remove.disabled) return;
        remove.disabled = true;
        try {
          const current = await store.archive(entry);
          this.state.undo = { current, old: entry, archive: true };
          this.close();
          this.change();
          new import_obsidian8.Notice("\u5DF2\u5C01\u5B58\u5B89\u6392\u3002\u53EF\u5728\u65E5\u66C6\u64A4\u92B7\uFF0C\u6216\u5F9E Library \u6062\u5FA9 status\u3002");
        } finally {
          remove.disabled = false;
        }
      });
    }
    submit(this, "\u5132\u5B58\u5B89\u6392", async () => {
      if (!loaded) throw new Error("\u5F85\u8FA6\u4ECD\u5728\u8B80\u53D6\uFF1B\u8ACB\u7A0D\u5019\u3002");
      let task = this.entry?.task || this.initial.task || "";
      const selected = choices.find((t) => String(t.line) === taskSelect.value);
      if (selected) {
        const identified = await tasks.identify(selected);
        task = wiki(tasks.path, identified.id);
      } else task = taskSelect.value;
      const result = await store.save({ title: title.value, start: toInstant(start.value, zone), end: toInstant(end.value, zone), timezone: zone, projects, course, task }, note.value, this.entry, this.id);
      if (this.entry) this.state.undo = { current: result, old: this.entry };
      this.close();
      this.change();
      new import_obsidian8.Notice("\u5B89\u6392\u5DF2\u4FDD\u5B58\u5230\u672C\u5730 Markdown\u3002");
    });
    title.focus();
  }
  onClose() {
    this.closed = true;
    this.contentEl.empty();
  }
};
function renderCalendar(parent, host, state, component, alive, refresh) {
  const store = storeFor(host), zone = host.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const header = parent.createDiv({ cls: "lr-calendar-toolbar" });
  header.createEl("h1", { text: host.settings.homeMode === "today" ? "\u4ECA\u65E5\u5B89\u6392" : "\u672C\u9031\u5B89\u6392" });
  const tools = header.createDiv({ cls: "lr-calendar-controls" });
  button(tools, "", () => {
    state.day = shiftDay(state.day, host.settings.homeMode === "today" ? -1 : -7);
    refresh();
  }, { icon: "chevron-left", title: "\u4E0A\u4E00\u6BB5\u65E5\u671F" });
  button(tools, "\u4ECA\u5929", () => {
    state.day = localStamp(Date.now(), zone).slice(0, 10);
    refresh();
  });
  button(tools, "", () => {
    state.day = shiftDay(state.day, host.settings.homeMode === "today" ? 1 : 7);
    refresh();
  }, { icon: "chevron-right", title: "\u4E0B\u4E00\u6BB5\u65E5\u671F" });
  const mode = select(tools, "\u6AA2\u8996", [["week", "\u672C\u9031 Week"], ["today", "\u4ECA\u65E5 Today"]], host.settings.homeMode || "week");
  mode.addEventListener("change", () => {
    host.settings.homeMode = mode.value;
    void host.saveSettings().then(refresh).catch((e) => new import_obsidian8.Notice(String(e)));
  });
  const startDay = host.settings.homeMode === "today" ? state.day : weekStart(state.day);
  const days = Array.from({ length: host.settings.homeMode === "today" ? 1 : 7 }, (_, n) => shiftDay(startDay, n));
  const open = (day, minute = 540, endMinute = minute + 60) => {
    const endDay = endMinute >= 1440 ? shiftDay(day, 1) : day;
    new ArrangementModal(host, state, refresh, { start: toInstant(day + "T" + clock(minute), zone), end: toInstant(endDay + "T" + clock(endMinute % 1440), zone) }).open();
  };
  button(tools, "\u5B89\u6392", () => open(state.day), { icon: "plus", cls: "lr-primary" });
  if (state.undo) button(tools, "\u64A4\u92B7", async () => {
    const undo = state.undo;
    await store.files.update(undo.current, { title: undo.old.title, start: undo.old.start, end: undo.old.end, status: undo.old.fm.status, task: undo.old.fm.task, projects: undo.old.fm.projects, course: undo.old.fm.course, timezone: undo.old.fm.timezone }, undo.old.body);
    state.undo = void 0;
    refresh();
    new import_obsidian8.Notice("\u5DF2\u64A4\u92B7\u3002");
  }, { icon: "undo-2" });
  parent.createDiv({ cls: "lr-calendar-caption", text: `${days[0]} \u2014 ${days[days.length - 1]} \xB7 ${zone} \xB7 15 \u5206\u9418\u5438\u9644\uFF0C\u8A73\u60C5\u53EF\u7CBE\u78BA\u8F38\u5165` });
  const error = parent.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
  const loading = parent.createDiv({ cls: "lr-muted", text: "\u6B63\u5728\u8B80\u53D6\u5B89\u6392\u2026", attr: { role: "status" } });
  void (async () => {
    try {
      let point2 = function(ev) {
        const col = cols.find((c) => {
          const r = c.getBoundingClientRect();
          return ev.clientX >= r.left && ev.clientX <= r.right;
        });
        if (!col) return null;
        const slots = col.querySelector(".lr-day-slots"), rect = slots.getBoundingClientRect();
        return { day: col.dataset.day, minute: snapMinute((ev.clientY - rect.top) * 1.5), slots };
      }, begin2 = function(ev, item, resize = false) {
        if (ev.button !== 0) return;
        const p = point2(ev);
        if (!p) return;
        ev.preventDefault();
        const ghost = p.slots.createDiv({ cls: "lr-calendar-ghost" });
        drag = { pointer: ev.pointerId, x: ev.clientX, y: ev.clientY, day: p.day, minute: p.minute, item, resize, moved: false, ghost };
        grid.setPointerCapture(ev.pointerId);
      };
      var point = point2, begin = begin2;
      const data = await store.list();
      if (!alive()) return;
      loading.remove();
      if (data.errors.length) error.setText(data.errors.join("\n"));
      const entries = data.items.filter((e) => !e.archived);
      const visible = entries.filter((e) => days.some((day) => localStamp(e.start, zone).slice(0, 10) <= day && localStamp(Date.parse(e.end) - 1, zone).slice(0, 10) >= day));
      const agenda = parent.createDiv({ cls: `lr-agenda ${host.settings.homeMode === "today" ? "is-today" : ""}` });
      for (const day of days) {
        const block = agenda.createEl("section");
        const h = block.createDiv({ cls: "lr-section-head" });
        h.createEl("h3", { text: day });
        button(h, "\u5B89\u6392", () => open(day), { icon: "plus", cls: "lr-quiet" });
        const daily = visible.filter((e) => localStamp(e.start, zone).slice(0, 10) <= day && localStamp(Date.parse(e.end) - 1, zone).slice(0, 10) >= day).sort((a, b) => a.start.localeCompare(b.start));
        if (!daily.length) block.createEl("p", { cls: "lr-muted", text: "\u5C1A\u7121\u5B89\u6392" });
        for (const e of daily) {
          const row = button(block, `${localStamp(e.start, zone).slice(11)}\u2013${localStamp(e.end, zone).slice(11)}  ${e.title}`, () => new ArrangementModal(host, state, refresh, e, e).open(), { cls: "lr-agenda-event", title: e.title });
          if (e.task) row.createSpan({ cls: "lr-badge", text: "\u5F85\u8FA6" });
        }
      }
      const scroll = parent.createDiv({ cls: `lr-calendar-scroll ${host.settings.homeMode === "today" ? "is-today" : ""}` });
      const grid = scroll.createDiv({ cls: "lr-calendar-grid" });
      grid.style.setProperty("--lr-days", String(days.length));
      const labels = grid.createDiv({ cls: "lr-time-labels" });
      for (let h = 0; h < 24; h++) {
        const label = labels.createSpan({ text: clock(h * 60) });
        label.style.top = `${h * 40}px`;
      }
      const cols = [];
      const today = localStamp(Date.now(), zone).slice(0, 10);
      for (const day of days) {
        const col = grid.createDiv({ cls: `lr-day-column ${day === today ? "is-today" : ""}`, attr: { "data-day": day, "aria-label": day } });
        cols.push(col);
        const head = col.createDiv({ cls: "lr-day-heading" });
        button(head, day.slice(5) + " " + new Intl.DateTimeFormat("zh-TW", { weekday: "short", timeZone: "UTC" }).format(/* @__PURE__ */ new Date(day + "T12:00:00Z")), () => open(day), { cls: "lr-quiet", title: day + " \xB7 \u65B0\u589E\u5B89\u6392" });
        const slots = col.createDiv({ cls: "lr-day-slots", attr: { "data-day": day } });
        const daily = visible.filter((e) => localStamp(e.start, zone).slice(0, 10) <= day && localStamp(Date.parse(e.end) - 1, zone).slice(0, 10) >= day);
        const layout = layoutEvents(daily);
        for (const e of daily) {
          const s = localStamp(e.start, zone), t = localStamp(e.end, zone);
          const from = s.slice(0, 10) < day ? 0 : minuteOf(s), to = t.slice(0, 10) > day ? 1440 : minuteOf(t);
          const conflicts = daily.filter((other) => overlaps(e, other)).sort((a, b) => a.start.localeCompare(b.start) || a.path.localeCompare(b.path));
          const event = slots.createEl("button", { cls: "lr-calendar-event", attr: { type: "button", "aria-label": `${e.title} ${s} \u81F3 ${t}`, title: `${e.title}
${s} \u2192 ${t}${conflicts.length > 1 ? "\n\u6642\u9593\u91CD\u758A" : ""}` } });
          event.style.top = `${from / 1.5}px`;
          event.style.height = `${Math.max(16, (to - from) / 1.5)}px`;
          event.style.left = `${layout.get(e.path).column / layout.get(e.path).columns * 100}%`;
          event.style.width = `${100 / layout.get(e.path).columns}%`;
          event.createSpan({ cls: "lr-event-time", text: s.slice(11) });
          event.createSpan({ cls: "lr-event-title", text: e.title });
          const handle = event.createSpan({ cls: "lr-event-resize", attr: { "aria-hidden": "true" } });
          event.addEventListener("click", (ev) => {
            if (ev.detail === 0) new ArrangementModal(host, state, refresh, e, e).open();
          });
          event.addEventListener("pointerdown", (ev) => begin2(ev, e, handle === ev.target));
        }
        slots.addEventListener("pointerdown", (ev) => {
          if (ev.target === slots) begin2(ev);
        });
      }
      scroll.scrollTop = state.scroll ?? 7 * 40;
      scroll.addEventListener("scroll", () => state.scroll = scroll.scrollTop);
      const controller = new AbortController();
      component.register(() => controller.abort());
      let drag;
      grid.addEventListener("pointermove", (ev) => {
        if (!drag || ev.pointerId !== drag.pointer) return;
        const p = point2(ev);
        if (!p) return;
        drag.moved = drag.moved || Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 5;
        p.slots.appendChild(drag.ghost);
        const from = drag.item && !drag.resize ? p.minute : Math.min(drag.minute, p.minute), to = drag.item && !drag.resize ? p.minute + Math.round((Date.parse(drag.item.end) - Date.parse(drag.item.start)) / 6e4) : Math.max(drag.minute + 15, p.minute + 15);
        drag.ghost.style.top = `${from / 1.5}px`;
        drag.ghost.style.height = `${Math.max(15, to - from) / 1.5}px`;
        drag.ghost.setText(`${clock(from)} \xB7 ${drag.resize ? "\u8ABF\u6574\u7D50\u675F" : "\u5B89\u6392"}`);
      }, { signal: controller.signal });
      grid.addEventListener("pointercancel", () => {
        drag?.ghost.remove();
        drag = void 0;
      }, { signal: controller.signal });
      grid.addEventListener("pointerup", (ev) => {
        if (!drag) return;
        const d = drag, p = point2(ev);
        drag = void 0;
        d.ghost.remove();
        if (!p) return;
        if (d.item) {
          if (!d.moved) {
            new ArrangementModal(host, state, refresh, d.item, d.item).open();
            return;
          }
          const item = d.item;
          const startStamp = localStamp(item.start, zone);
          const startMinute = snapMinute(minuteOf(startStamp) + p.minute - d.minute);
          let start, end;
          try {
            start = d.resize ? item.start : toInstant(p.day + "T" + clock(startMinute), zone);
            const endMinute = p.minute + 15;
            end = d.resize ? toInstant((endMinute === 1440 ? shiftDay(p.day, 1) : p.day) + "T" + clock(endMinute % 1440), zone) : new Date(Date.parse(start) + Date.parse(item.end) - Date.parse(item.start)).toISOString();
          } catch (e) {
            error.setText(String(e));
            return;
          }
          const buttons = grid.querySelectorAll(".lr-calendar-event");
          for (const b of buttons) b.addEventListener("click", (event) => {
            event.stopImmediatePropagation();
            event.preventDefault();
          }, { once: true, capture: true });
          void (async () => {
            try {
              const next = await store.save({ title: item.title, start, end, timezone: zone, task: item.task, projects: item.projects, course: item.course }, item.body, item);
              state.undo = { current: next, old: item };
              const overlap = entries.some((e) => e.path !== item.path && overlaps(e, next));
              new import_obsidian8.Notice(overlap ? "\u5DF2\u4FDD\u5B58\uFF1B\u8207\u5176\u4ED6\u5B89\u6392\u91CD\u758A\u3002" : "\u5DF2\u4FDD\u5B58\u5B89\u6392\u3002");
              refresh();
            } catch (e) {
              error.setText(String(e));
            }
          })();
        } else {
          try {
            const from = d.day === p.day ? Math.min(d.minute, p.minute) : p.minute;
            const to = d.day === p.day ? Math.max(d.minute + 15, p.minute + 15) : p.minute + 15;
            open(p.day, from, to);
          } catch (e) {
            error.setText(String(e));
          }
        }
      }, { signal: controller.signal });
      if (!visible.length) parent.createEl("p", { cls: "lr-muted", text: `${host.settings.homeMode === "today" ? "\u4ECA\u65E5" : "\u672C\u9031"}\u5C1A\u7121\u5B89\u6392\u3002\u9EDE\u65E5\u671F\u3001\u7A7A\u767D\u6642\u6BB5\u6216\u300C\u5B89\u6392\u300D\u5373\u53EF\u65B0\u589E\u3002` });
    } catch (e) {
      if (alive()) {
        loading.remove();
        error.setText(String(e));
      }
    }
  })();
}

// src/ui/planning.ts
var import_obsidian9 = require("obsidian");
init_portable();
init_tasks();
var ProgressModal = class extends import_obsidian9.Modal {
  constructor(host, entry) {
    super(host.app);
    this.host = host;
    this.entry = entry;
    this.setTitle(`\u5C08\u6848\u9032\u5EA6 \xB7 ${entry.name}`);
  }
  onOpen() {
    this.contentEl.addClass("lr-modal");
    this.contentEl.createEl("p", { cls: "lr-modal-intro", text: "\u586B\u5BEB\u4F60\u78BA\u8A8D\u7684\u9032\u5EA6\uFF0C\u6216\u7531 AI \u4F9D\u4F60\u7684\u6BCF\u65E5\u66F4\u65B0\u4FEE\u6539\u5C08\u6848\u7B46\u8A18\u7684 progress\u3002\u7559\u7A7A\u8868\u793A\u5C1A\u672A\u8A2D\u5B9A\u3002" });
    let input;
    new import_obsidian9.Setting(this.contentEl).setName("\u9032\u5EA6 %").addText((t) => {
      input = t.inputEl;
      input.type = "number";
      input.min = "0";
      input.max = "100";
      input.step = "any";
      input.setAttribute("aria-label", "\u5C08\u6848\u9032\u5EA6\u767E\u5206\u6BD4");
      t.setValue(this.entry.progress == null ? "" : String(this.entry.progress));
    });
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const actions = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(actions, "\u53D6\u6D88", () => this.close());
    const save = button(actions, "\u5132\u5B58\u9032\u5EA6", async () => {
      if (save.disabled) return;
      const raw = input.value.trim();
      const value = raw === "" ? void 0 : progressValue(Number(raw));
      if (input.validity.badInput || raw !== "" && value == null) {
        error.setText("\u8ACB\u586B\u5BEB 0 \u81F3 100 \u7684\u6578\u5B57\uFF0C\u6216\u7559\u7A7A\u3002");
        return;
      }
      save.disabled = true;
      try {
        if (!snapshot) throw new Error("\u5C08\u6848\u4ECD\u5728\u8B80\u53D6\u3002");
        await store.update(snapshot, { progress: value });
        this.close();
        new import_obsidian9.Notice("\u5DF2\u66F4\u65B0\u5C08\u6848\u9032\u5EA6\u3002");
      } catch (e) {
        error.setText(e instanceof Error ? e.message : String(e));
        save.disabled = false;
      }
    }, { cls: "lr-primary" });
    const store = new PortableStore(this.app, () => this.host.settings);
    let snapshot;
    save.disabled = true;
    void store.read(this.entry.path).then((value) => {
      snapshot = value;
      input.value = value.fm.progress == null ? "" : String(value.fm.progress);
      save.disabled = false;
    }).catch((e) => error.setText(String(e)));
    input.focus();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/views/workspace-view.ts
var VIEW_TYPE = "learning-research-workspace";
var NAV = [["home", "\u9996\u9801", "Home", "house"], ["tasks", "\u5F85\u8FA6", "Tasks", "list-checks"], ["records", "\u8A18\u9304", "Records", "notebook-pen"], ["courses", "\u8AB2\u7A0B", "Courses", "graduation-cap"], ["research", "\u7814\u7A76", "Research", "flask-conical"], ["papers", "\u8AD6\u6587", "Papers", "file-text"], ["experiments", "\u5BE6\u9A57", "Experiments", "test-tubes"], ["ideas", "\u60F3\u6CD5", "Ideas", "lightbulb"], ["inbox", "\u6536\u4EF6\u5323", "Inbox", "inbox"]];
var SECTION_TYPES = { courses: "course", research: "project", papers: "paper", experiments: "experiment", ideas: "idea" };
var GROUPS = [["lecture", "\u8B1B\u7FA9 Lectures"], ["note", "\u7B46\u8A18 Notes"], ["assignment", "\u4F5C\u696D Assignments"], ["resource", "\u8CC7\u6E90 Resources"], ["review", "\u8907\u7FD2 Review"]];
var WorkspaceView = class extends import_obsidian10.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
  }
  route = { section: "home" };
  body;
  main;
  trail = [];
  unsubscribe;
  rendered;
  epoch = 0;
  closed = false;
  taskDraft = { text: "" };
  calendarState = { day: "" };
  goalsOpen = false;
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Learning & Research";
  }
  getIcon() {
    return "panels-top-left";
  }
  getState() {
    return { ...this.route };
  }
  async setState(state, result) {
    const valid = ["home", "courses", "research", "papers", "experiments", "ideas", "inbox", "recent", "library", "detail", "tasks", "records"];
    this.route = { section: valid.includes(String(state.section)) ? state.section : "home", path: typeof state.path === "string" ? state.path : void 0, filter: typeof state.filter === "string" ? state.filter : void 0, query: typeof state.query === "string" ? state.query : void 0 };
    if (this.body) this.render();
    await super.setState(state, result);
  }
  async onOpen() {
    this.closed = false;
    this.contentEl.empty();
    this.contentEl.addClass("lr-workspace");
    this.unsubscribe = this.host.index.subscribe(() => {
      if (!this.closed) this.render();
    });
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (this.route.path === oldPath || this.route.path?.startsWith(oldPath + "/")) this.route.path = file.path + this.route.path.slice(oldPath.length);
      this.trail = this.trail.map((r) => r.path === oldPath ? { ...r, path: file.path } : r);
    }));
    this.body = this.contentEl.createDiv({ cls: "lr-shell" });
    this.render();
  }
  async onClose() {
    this.closed = true;
    this.epoch++;
    this.unsubscribe?.();
    if (this.rendered) this.removeChild(this.rendered);
    this.contentEl.empty();
  }
  navigate(route, back = false) {
    if (!back) this.trail.push({ ...this.route });
    if (this.main) this.main.scrollTop = 0;
    this.route = route;
    this.render();
    this.app.workspace.requestSaveLayout();
    this.main?.querySelector("h1")?.focus();
  }
  render() {
    if (!this.body || this.closed) return;
    const oldScroll = this.main?.scrollTop ?? 0;
    const focused = this.contentEl.ownerDocument.activeElement;
    const searching = focused?.classList.contains("lr-search-input");
    const capturing = focused?.classList.contains("lr-task-input");
    const selection = searching || capturing ? focused?.selectionStart : null;
    this.epoch++;
    if (this.rendered) this.removeChild(this.rendered);
    this.rendered = new import_obsidian10.Component();
    this.addChild(this.rendered);
    this.body.empty();
    this.renderSidebar();
    const workspace = this.body.createDiv({ cls: "lr-work-area" });
    this.renderToolbar(workspace);
    this.main = workspace.createEl("main", { cls: "lr-main", attr: { "aria-label": "\u5DE5\u4F5C\u5340\u5167\u5BB9" } });
    if (this.host.index.error) {
      empty(this.main, "triangle-alert", "\u7121\u6CD5\u8B80\u53D6\u5DE5\u4F5C\u5340", this.host.index.error, { label: "\u91CD\u65B0\u5EFA\u7ACB\u7D22\u5F15", run: () => this.host.index.rebuild() });
      return;
    }
    if (!this.host.index.ready) {
      empty(this.main, "loader-circle", "\u6B63\u5728\u8B80\u53D6\u6A94\u6848", "\u7D22\u5F15\u6703\u5F9E Vault \u81EA\u52D5\u5EFA\u7ACB\u3002");
      this.main.setAttribute("aria-busy", "true");
      return;
    }
    if (this.route.section === "home") this.renderHome();
    else if (this.route.section === "tasks") {
      heading(this.main, "\u5F85\u8FA6", "TASKS", "\u4E00\u4EFD\u6E05\u55AE\uFF0C\u6240\u6709\u9801\u9762\u5171\u7528\u3002");
      this.renderTasks();
    } else if (this.route.section === "records") {
      heading(this.main, "\u5DE5\u4F5C\u8A18\u9304", "RECORDS", "\u76EE\u6A19\u3001\u904E\u7A0B\u3001\u7D50\u679C\u8207\u672A\u4F86\u8A08\u5283\uFF0C\u4FDD\u7559\u539F\u6587\u3002");
      const epoch = this.epoch;
      renderRecords(this.main, this.host, this.rendered, () => epoch === this.epoch && !this.closed);
    } else if (this.route.section === "detail") this.renderDetail();
    else this.renderListing();
    this.main.querySelector("h1")?.setAttribute("tabindex", "-1");
    this.main.scrollTop = oldScroll;
    if (capturing) {
      const input = this.body.querySelector(".lr-task-input");
      input?.focus();
      if (selection != null) input?.setSelectionRange(selection, selection);
    }
    if (searching) {
      const input = this.body.querySelector(".lr-search-input");
      input?.focus();
      if (selection != null) input?.setSelectionRange(selection, selection);
    }
  }
  renderSidebar() {
    const rail = this.body.createEl("aside", { cls: "lr-sidebar", attr: { "aria-label": "\u4E3B\u8981\u5C0E\u89BD" } });
    const brand = rail.createDiv({ cls: "lr-brand" });
    icon(brand, "book-open", "lr-brand-mark");
    const name = brand.createDiv();
    name.createEl("strong", { text: "Learning" });
    name.createEl("small", { text: "& Research" });
    const nav = rail.createEl("nav");
    for (const [section, zh, en, glyph] of NAV) {
      if (section === "home" || section === "courses") nav.createDiv({ cls: "lr-nav-group-label", text: section === "home" ? "\u65E5\u5E38\u5DE5\u4F5C" : "\u5B78\u7FD2\u8207\u7814\u7A76" });
      const active = this.route.section === section || this.route.section === "detail" && SECTION_TYPES[section] === this.host.index.entries.get(this.route.path ?? "")?.type;
      const b = button(nav, "", () => this.navigate({ section }), { icon: glyph, cls: `lr-nav ${active ? "is-active" : ""}`, title: `${zh} ${en}` });
      if (active) b.setAttribute("aria-current", "page");
      const labels = b.createSpan({ cls: "lr-nav-label" });
      labels.createSpan({ text: zh });
      labels.createEl("small", { text: en });
      if (section === "inbox") {
        const count = this.host.index.all().filter((e) => isInbox(e, this.host.settings)).length;
        if (count) b.createSpan({ cls: "lr-nav-count", text: String(count) });
      }
    }
    const secondary = rail.createDiv({ cls: "lr-nav-secondary" });
    button(secondary, "\u6700\u8FD1 Recent", () => this.navigate({ section: "recent" }), { icon: "history", cls: `lr-nav ${this.route.section === "recent" ? "is-active" : ""}` });
    button(secondary, "\u7F6E\u9802 Pinned", () => this.navigate({ section: "library", filter: "pinned" }), { icon: "pin", cls: "lr-nav" });
    button(secondary, "\u8CC7\u6599 Library", () => this.navigate({ section: "library" }), { icon: "library", cls: `lr-nav ${this.route.section === "library" ? "is-active" : ""}` });
    const foot = rail.createDiv({ cls: "lr-sidebar-foot" });
    button(foot, "\u6A94\u6848\u700F\u89BD\u5668", () => this.app.workspace.leftSplit.expand(), { icon: "folder-open", cls: "lr-nav" });
    button(foot, "\u4F7F\u7528\u6307\u5357", () => this.host.openFile("99 System/Documentation/README.md"), { icon: "circle-help", cls: "lr-nav" });
    foot.createDiv({ cls: "lr-local", text: "LOCAL WORKSPACE" });
  }
  renderToolbar(parent) {
    const top = parent.createEl("header", { cls: "lr-topbar" });
    const crumb = top.createDiv({ cls: "lr-breadcrumb" });
    const back = button(crumb, "", () => {
      const r = this.trail.pop();
      if (r) this.navigate(r, true);
    }, { icon: "arrow-left", cls: "lr-icon-button", title: "\u8FD4\u56DE\u4E0A\u4E00\u9801" });
    back.disabled = !this.trail.length;
    crumb.createSpan({ text: "Personal workspace" });
    icon(crumb, "chevron-right");
    crumb.createSpan({ text: NAV.find((n) => n[0] === this.route.section)?.[2] ?? (this.route.section === "detail" ? "Detail" : this.route.section === "recent" ? "Recent" : "Library") });
    const actions = top.createDiv({ cls: "lr-top-actions" });
    button(actions, "\u641C\u5C0B", () => this.host.nativeSearch(), { icon: "search", cls: "lr-quiet", title: "\u641C\u5C0B\u6574\u500B Vault \xB7 Obsidian Search" });
    button(actions, "\u6536\u96C6", () => this.host.capture(), { icon: "inbox", cls: "lr-quiet" });
    const create = button(actions, "\u65B0\u589E", () => {
      const menu = new import_obsidian10.Menu();
      menu.addItem((i) => i.setTitle("\u5DE5\u4F5C\u8A18\u9304").setIcon("notebook-pen").onClick(() => new RecordModal(this.host).open()));
      menu.addItem((i) => i.setTitle("\u5FEB\u901F\u6536\u96C6 Quick capture").setIcon("inbox").onClick(() => this.host.capture()));
      menu.addSeparator();
      for (const type of TYPES) menu.addItem((i) => i.setTitle(LABELS[type]).setIcon(ICONS[type]).onClick(() => type === "idea" ? this.host.capture(true) : this.host.newObject(type)));
      const r = create.getBoundingClientRect();
      menu.showAtPosition({ x: r.left, y: r.bottom });
    }, { icon: "plus", cls: "lr-primary" });
  }
  section(parent, title, subtitle, more) {
    const block = parent.createEl("section", { cls: "lr-section" });
    const head = block.createDiv({ cls: "lr-section-head" });
    const names = head.createDiv();
    names.createEl("h2", { text: title });
    if (subtitle) names.createEl("p", { text: subtitle });
    if (more) button(head, "\u67E5\u770B\u5168\u90E8", () => this.navigate(more), { icon: "arrow-up-right", cls: "lr-quiet" });
    return block;
  }
  renderHome() {
    const epoch = this.epoch, alive = () => epoch === this.epoch && !this.closed;
    if (!this.calendarState.day) this.calendarState.day = localStamp(Date.now(), this.host.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10);
    const calendar = this.main.createEl("section", { cls: "lr-calendar" });
    renderCalendar(calendar, this.host, this.calendarState, this.rendered, alive, () => this.render());
    const columns = this.main.createDiv({ cls: "lr-home-columns lr-daily-columns" });
    const tasks = this.section(columns, "\u512A\u5148\u8207\u63A5\u4E0B\u4F86 Tasks", "\u65E5\u671F\u8207\u512A\u5148\u7D1A\u9078\u586B\uFF1B\u4E0D\u6BCF\u5929\u8907\u88FD\u3002", { section: "tasks" });
    renderTaskPanel(tasks, this.host, { component: this.rendered, alive, compact: true, draft: this.taskDraft });
    const resume = this.section(columns, "\u7E7C\u7E8C\u4E0A\u6B21\u5DE5\u4F5C", "\u5F15\u7528\u5DF2\u6709\u8A18\u9304\uFF0C\u4E0D\u63A8\u6E2C\u9032\u5C55\u3002", { section: "records" });
    renderContinue(resume, this.host, this.rendered, alive);
    const goals = this.main.createEl("details", { cls: "lr-home-goals" });
    goals.open = this.goalsOpen;
    goals.createEl("summary", { text: "\u8FD1\u671F\u65B9\u5411 \xB7 Courses / Research" });
    goals.addEventListener("toggle", () => this.goalsOpen = goals.open);
    const courses = this.section(goals, "\u8AB2\u7A0B Courses", "", { section: "courses" });
    const current = this.host.index.ofType("course").filter((e) => !["archived", "completed"].includes(e.status));
    if (current.length) {
      const grid = courses.createDiv({ cls: "lr-card-grid" });
      for (const entry of recent(current, 6)) this.card(grid, entry);
    } else empty(courses, "graduation-cap", "\u5C1A\u7121\u8AB2\u7A0B", "\u5F9E\u4E00\u9580\u8AB2\u958B\u59CB\u3002", { label: "\u5EFA\u7ACB\u8AB2\u7A0B", run: () => this.host.newObject("course") });
    const research = this.section(goals, "\u7814\u7A76 Research", "", { section: "research" });
    const active = this.host.index.ofType("project").filter((e) => !["completed", "archived"].includes(e.status));
    if (active.length) for (const entry of recent(active, 4)) this.projectCard(research, entry);
    else empty(research, "flask-conical", "\u5C1A\u7121\u7814\u7A76\u5C08\u6848", "\u5F9E\u4E00\u500B\u554F\u984C\u958B\u59CB\u3002", { label: "\u5EFA\u7ACB\u5C08\u6848", run: () => this.host.newObject("project") });
  }
  renderProgress(parent, entry) {
    const box = parent.createDiv({ cls: "lr-project-progress" });
    const label = box.createDiv({ cls: "lr-progress-label" });
    label.createSpan({ text: entry.progress == null ? "\u9032\u5EA6\u5C1A\u672A\u8A2D\u5B9A" : `\u5C08\u6848\u9032\u5EA6 ${entry.progress}%` });
    button(label, entry.progress == null ? "\u8A2D\u5B9A\u9032\u5EA6" : "\u66F4\u65B0\u9032\u5EA6", () => new ProgressModal(this.host, entry).open(), { cls: "lr-quiet", title: `\u66F4\u65B0 ${entry.name} \u7684\u9032\u5EA6` });
    if (entry.progress != null) box.createEl("progress", { attr: { value: String(entry.progress), max: "100", "aria-label": `${entry.name} \u7684\u5C08\u6848\u9032\u5EA6`, "aria-valuetext": `${entry.progress}%` } });
    else box.createDiv({ cls: "lr-progress-unset", attr: { "aria-hidden": "true" } });
  }
  renderTasks() {
    const epoch = this.epoch;
    renderTaskPanel(this.main, this.host, { component: this.rendered, alive: () => epoch === this.epoch && !this.closed, draft: this.taskDraft });
  }
  card(parent, entry) {
    const el = parent.createEl("article", { cls: `lr-card lr-type-${entry.type}` });
    const top = el.createDiv({ cls: "lr-card-top" });
    icon(top, ICONS[entry.type ?? "note"], "lr-card-icon");
    this.badge(top, entry.status);
    button(el, entry.name, () => this.openEntry(entry), { cls: "lr-card-title" });
    const related = this.host.index.related(entry.path, entry.type === "course" ? "course" : "project");
    el.createEl("p", { text: related.length ? `${related.length} \u4EFD\u76F8\u95DC\u8CC7\u6599` : "\u7B49\u5F85\u7B2C\u4E00\u4EFD\u8CC7\u6599", cls: "lr-card-summary" });
    const foot = el.createDiv({ cls: "lr-card-foot" });
    foot.createSpan({ text: displayDate(entry.mtime) });
    button(foot, "", () => this.host.openFile(entry.path), { icon: "file-pen-line", cls: "lr-icon-button", title: `\u958B\u555F\u539F\u59CB\u7B46\u8A18\uFF1A${entry.name}` });
  }
  projectCard(parent, entry) {
    const el = parent.createEl("article", { cls: "lr-project-card lr-type-project" });
    icon(el, "flask-conical", "lr-card-icon");
    const info = el.createDiv({ cls: "lr-project-info" });
    button(info, entry.name, () => this.openEntry(entry), { cls: "lr-card-title" });
    const related = this.host.index.related(entry.path, "project");
    info.createEl("p", { text: [["paper", "papers"], ["note", "notes"], ["experiment", "experiments"], ["idea", "ideas"]].map(([type, label]) => `${related.filter((e) => e.type === type).length} ${label}`).join(" \xB7 ") });
    this.renderProgress(info, entry);
    this.badge(el, entry.status);
    button(el, "", () => this.host.openFile(entry.path), { icon: "file-pen-line", cls: "lr-icon-button", title: `\u958B\u555F\u539F\u59CB\u7B46\u8A18\uFF1A${entry.name}` });
  }
  badge(parent, status) {
    if (status) parent.createSpan({ cls: `lr-badge ${status === "failed" ? "is-failed" : ""}`, text: STATUS_LABELS[status] ?? status });
  }
  openEntry(entry) {
    if (["course", "project", "paper"].includes(entry.type ?? "")) this.navigate({ section: "detail", path: entry.path });
    else if (entry.kind === "work-log") run(async () => new RecordDetailModal(this.host, await new PortableStore(this.app, () => this.host.settings).read(entry.path)).open());
    else run(() => this.host.openFile(entry.path));
  }
  row(parent, entry) {
    const row = parent.createEl("article", { cls: `lr-row lr-type-${entry.type ?? "file"}` });
    icon(row, entry.type ? ICONS[entry.type] : entry.ext === "pdf" ? "file-text" : ["png", "jpg", "jpeg", "webp", "svg"].includes(entry.ext) ? "image" : "file", "lr-row-icon");
    const info = row.createDiv({ cls: "lr-row-info" });
    button(info, entry.name, () => this.openEntry(entry), { cls: "lr-row-title" });
    info.createDiv({ cls: "lr-row-meta", text: `${entry.type ? LABELS[entry.type] : entry.ext.toUpperCase()} \xB7 ${displayDate(entry.mtime)}` });
    this.badge(row, entry.status);
    const actions = row.createDiv({ cls: "lr-row-actions" });
    if (isInbox(entry, this.host.settings)) button(actions, "\u6574\u7406", () => this.host.organize(entry), { cls: "lr-quiet" });
    if (entry.ext === "md" && isInbox(entry, this.host.settings)) {
      const task = button(actions, "\u8F49\u5F85\u8FA6", async () => {
        if (task.disabled) return;
        task.disabled = true;
        try {
          await new TaskStore(this.app, `${this.host.settings.folders.note}/Tasks.md`).add(`${entry.name} ${wiki(entry.path)}`);
          task.setText("\u5DF2\u52A0\u5165");
        } catch (e) {
          task.disabled = false;
          throw e;
        }
      }, { cls: "lr-quiet" });
      button(actions, "\u5C01\u5B58", async () => {
        const file = this.app.vault.getFileByPath(entry.path);
        if (!file) throw new Error("\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\u3002");
        await this.host.actions.update(file, { status: "archived" });
      }, { cls: "lr-quiet", title: "\u4FDD\u5B58\u539F\u6587\u4E26\u6A19\u8A18 archived\uFF1B\u4ECD\u53EF\u5728 Library \u627E\u5230" });
    }
    if (entry.ext === "md") button(actions, "", async () => {
      const f = this.app.vault.getFileByPath(entry.path);
      if (!f) throw new Error("\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\u3002");
      await this.host.actions.update(f, { pinned: entry.pinned ? void 0 : true });
    }, { icon: entry.pinned ? "pin-off" : "pin", cls: "lr-icon-button", title: entry.pinned ? "\u53D6\u6D88\u7F6E\u9802" : "\u7F6E\u9802" });
    button(actions, "", () => this.host.openFile(entry.path), { icon: "arrow-up-right", cls: "lr-icon-button", title: `\u5728\u539F\u751F\u5206\u9801\u958B\u555F\uFF1A${entry.name}` });
  }
  rows(parent, entries, title = "\u5C1A\u7121\u5167\u5BB9", description = "\u52A0\u5165\u76F8\u95DC\u6A94\u6848\u5F8C\uFF0C\u6703\u81EA\u52D5\u51FA\u73FE\u5728\u9019\u88E1\u3002") {
    if (!entries.length) {
      empty(parent, "files", title, description);
      return;
    }
    const rows = parent.createDiv({ cls: "lr-rows" });
    for (const entry of entries) this.row(rows, entry);
  }
  renderListing() {
    const section = this.route.section;
    const type = SECTION_TYPES[section];
    const titles = { courses: ["\u8AB2\u7A0B", "COURSES", "\u5F9E\u8B1B\u7FA9\u5230\u8907\u7FD2\uFF0C\u4FDD\u7559\u5B8C\u6574\u7684\u5B78\u7FD2\u8108\u7D61\u3002"], research: ["\u7814\u7A76\u5C08\u6848", "RESEARCH", "\u4E32\u8D77\u8AD6\u6587\u3001\u5BE6\u9A57\u8207\u4E0B\u4E00\u500B\u554F\u984C\u3002"], papers: ["\u8AD6\u6587", "PAPERS", "\u95B1\u8B80\u3001\u7406\u89E3\uFF0C\u518D\u9023\u56DE\u4F60\u7684\u7814\u7A76\u3002"], experiments: ["\u5BE6\u9A57", "EXPERIMENTS", "\u4FDD\u7559\u65B9\u6CD5\u3001\u7D50\u679C\u8207\u8B49\u64DA\uFF0C\u5305\u62EC\u5931\u6557\u7684\u5617\u8A66\u3002"], ideas: ["\u60F3\u6CD5", "IDEAS", "\u5148\u8A18\u4E0B\u4F86\uFF0C\u8B93\u9023\u7D50\u6162\u6162\u5F62\u6210\u3002"], inbox: ["\u6536\u4EF6\u5323", "INBOX", "\u4E0D\u5FC5\u73FE\u5728\u6C7A\u5B9A\u6240\u6709\u5206\u985E\u3002"], recent: ["\u6700\u8FD1\u4FEE\u6539", "RECENT", "\u56DE\u5230\u4F60\u6700\u8FD1\u7DE8\u8F2F\u6216\u532F\u5165\u7684\u6A94\u6848\u3002"], library: ["\u5168\u90E8\u8CC7\u6599", "LIBRARY", "\u7B46\u8A18\u3001\u8CC7\u6E90\u8207\u9644\u4EF6\uFF0C\u90FD\u53EF\u4EE5\u5728\u9019\u88E1\u627E\u5230\u3002"] };
    const t = titles[section];
    const h = heading(this.main, t[0], t[1], t[2]);
    if (type) button(h, type === "idea" ? "\u6355\u6349\u60F3\u6CD5" : `\u65B0\u589E${t[0]}`, () => type === "idea" ? this.host.capture(true) : this.host.newObject(type), { icon: "plus", cls: "lr-primary" });
    if (section === "research") this.renderResearchMap();
    if (section === "library" && this.route.filter === "note") button(h, "\u65B0\u589E\u6982\u5FF5\u7B46\u8A18", () => this.host.newObject("note", { kind: "concept" }), { icon: "notebook-pen", cls: "lr-primary" });
    if (section === "inbox") this.renderDropzone(this.main);
    const toolbar = this.main.createDiv({ cls: "lr-list-toolbar" });
    const searchWrap = toolbar.createDiv({ cls: "lr-search" });
    icon(searchWrap, "search");
    const input = searchWrap.createEl("input", { cls: "lr-search-input", attr: { type: "search", placeholder: "\u7BE9\u9078\u6A19\u984C\u3001\u4E3B\u984C\u3001\u4F5C\u8005\u2026", "aria-label": "\u7BE9\u9078\u76EE\u524D\u5217\u8868" } });
    input.value = this.route.query ?? "";
    const scope = toolbar.createEl("select", { attr: { "aria-label": "\u9078\u64C7\u6AA2\u8996" } });
    let options = [["all", "\u5168\u90E8 All"]];
    if (section === "papers") options = [...options, ["inbox", "\u5F85\u6574\u7406 Inbox"], ["skimming", "\u7565\u8B80 Skimming"], ["reading", "\u95B1\u8B80\u4E2D Reading"], ["synthesized", "\u5DF2\u6574\u5408 Synthesized"], ["read", "\u5DF2\u8B80 Read"], ["recent", "\u6700\u8FD1\u52A0\u5165"], ["by-project", "\u4F9D\u7814\u7A76\u5C08\u6848"], ["by-topic", "\u4F9D\u4E3B\u984C"], ["reference", "\u53C3\u8003 Reference"], ["archived", "\u5C01\u5B58"]];
    else if (type) options = [...options, ...(type === "course" ? ["active", "planned", "completed", "archived"] : type === "project" ? ["active", "paused", "completed", "archived"] : type === "experiment" ? ["planned", "running", "completed", "failed", "paused"] : ["inbox", "archived"]).map((s) => [s, STATUS_LABELS[s] ?? s])];
    else if (section === "inbox") options = [...options, ["md", "\u7B46\u8A18"], ["pdf", "PDF"], ["images", "\u5716\u7247"]];
    else if (section === "library") options = [...options, ["note", "\u77E5\u8B58\u8207\u7B46\u8A18 Notes"], ["concept", "\u53EF\u91CD\u7528\u6982\u5FF5 Concepts"], ["resource", "\u8CC7\u6E90 Resources"], ["attachments", "\u9644\u4EF6"], ["pinned", "\u7F6E\u9802 Pinned"]];
    for (const [value, label] of options) scope.createEl("option", { value, text: label });
    scope.value = options.some((o) => o[0] === this.route.filter) ? this.route.filter : "all";
    const count = this.main.createDiv({ cls: "lr-results-count", attr: { "aria-live": "polite" } });
    const list = this.main.createDiv();
    let limit = 50;
    const draw = () => {
      list.empty();
      let entries = this.host.index.all();
      const filter = scope.value;
      if (type) entries = entries.filter((e) => e.type === type);
      if (section === "inbox") entries = entries.filter((e) => isInbox(e, this.host.settings));
      if (type && !["all", "recent", "by-project", "by-topic"].includes(filter)) entries = entries.filter((e) => e.status === filter);
      if (section === "inbox" && filter !== "all") entries = entries.filter((e) => filter === "images" ? ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e.ext) : e.ext === filter);
      if (section === "library" && filter !== "all") entries = entries.filter((e) => filter === "pinned" ? e.pinned : filter === "attachments" ? e.ext !== "md" : filter === "concept" ? e.type === "note" && e.kind === "concept" : e.type === filter);
      entries = entries.filter((e) => matches(e, input.value));
      entries = filter === "recent" ? [...entries].sort((a, b) => b.ctime - a.ctime) : recent(entries);
      count.setText(`${entries.length} \u500B\u6A94\u6848${entries.length > limit ? ` \xB7 \u986F\u793A\u524D ${limit} \u500B` : ""}`);
      const visible = entries.slice(0, limit);
      if (!visible.length) {
        empty(list, section === "inbox" ? "inbox" : type ? ICONS[type] : "files", input.value || filter !== "all" ? "\u6C92\u6709\u7B26\u5408\u7684\u5167\u5BB9" : section === "inbox" ? "\u6C92\u6709\u5F85\u6574\u7406\u7684\u5167\u5BB9" : "\u9019\u88E1\u6E96\u5099\u597D\u4E86", input.value || filter !== "all" ? "\u8A66\u8A66\u5176\u4ED6\u7BE9\u9078\u689D\u4EF6\u3002" : "\u5EFA\u7ACB\u6216\u532F\u5165\u7B2C\u4E00\u4EFD\u8CC7\u6599\uFF0C\u5DE5\u4F5C\u5340\u5C31\u6703\u958B\u59CB\u9023\u7D50\u5B83\u5011\u3002", type ? { label: type === "idea" ? "\u6355\u6349\u60F3\u6CD5" : `\u5EFA\u7ACB ${LABELS[type]}`, run: () => type === "idea" ? this.host.capture(true) : this.host.newObject(type) } : void 0);
        return;
      }
      if (filter === "by-project" || filter === "by-topic") {
        const groups = /* @__PURE__ */ new Map();
        for (const e of visible) {
          const keys = filter === "by-project" ? e.projects : e.topics;
          for (const key of keys.length ? keys : ["\u672A\u5206\u985E"]) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(e);
          }
        }
        for (const [key, values] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
          const g = this.section(list, key.replace(/^\[\[|\]\]$/g, ""), "");
          this.rows(g, values);
        }
      } else if (type === "course") {
        const grid = list.createDiv({ cls: "lr-card-grid" });
        for (const e of visible) this.card(grid, e);
      } else if (type === "project") for (const e of visible) this.projectCard(list, e);
      else this.rows(list, visible);
      if (entries.length > limit) button(list, "\u8F09\u5165\u66F4\u591A", () => {
        limit += 50;
        draw();
      }, { cls: "lr-load-more" });
    };
    input.addEventListener("input", () => {
      this.route.query = input.value;
      limit = 50;
      draw();
    });
    scope.addEventListener("change", () => {
      this.route.filter = scope.value;
      limit = 50;
      draw();
      this.app.workspace.requestSaveLayout();
    });
    draw();
  }
  renderResearchMap() {
    const grid = this.main.createDiv({ cls: "lr-research-map", attr: { "aria-label": "\u7814\u7A76\u8CC7\u6599\u5165\u53E3" } });
    const areas = [
      ["\u77E5\u8B58\u8207\u7406\u89E3", "Knowledge", "\u4FDD\u7559\u5B8C\u6574\u601D\u8DEF\uFF1B\u9700\u8981\u91CD\u7528\u6642\u518D\u62C6\u6210\u6982\u5FF5\u3002", "notebook-pen", { section: "library", filter: "note" }, "note"],
      ["\u8AD6\u6587\u8207\u4F86\u6E90", "Sources", "\u6BCF\u7BC7\u4E00\u4EFD\u4E3B\u7B46\u8A18\uFF0C\u7406\u89E3\u8207\u539F\u6587\u4E92\u76F8\u9023\u7D50\u3002", "file-text", { section: "papers" }, "paper"],
      ["\u5BE6\u8E10\u8207\u8B49\u64DA", "Practice", "\u4FDD\u5B58\u8A2D\u5B9A\u3001\u7D50\u679C\u8207\u5931\u6557\uFF0C\u9023\u56DE\u7814\u7A76\u554F\u984C\u3002", "test-tubes", { section: "experiments" }, "experiment"]
    ];
    for (const [title, en, description, glyph, route, type] of areas) {
      const card = grid.createEl("article", { cls: `lr-research-area lr-type-${type}` });
      icon(card, glyph, "lr-card-icon");
      card.createEl("small", { text: en });
      button(card, title, () => this.navigate(route), { cls: "lr-card-title" });
      card.createEl("p", { text: description });
      card.createSpan({ cls: "lr-muted", text: `${this.host.index.ofType(type).length} \u4EFD\u6A94\u6848` });
    }
  }
  renderDropzone(parent) {
    const zone = parent.createDiv({ cls: "lr-dropzone" });
    icon(zone, "inbox", "lr-drop-icon");
    const copy = zone.createDiv();
    copy.createEl("strong", { text: "\u653E\u4E0B\u6A94\u6848\uFF0C\u7559\u4F4F\u60F3\u6CD5\u3002" });
    copy.createEl("p", { text: "\u62D6\u5165 PDF\u3001\u5716\u7247\u6216\u6587\u5B57\uFF1B\u4E5F\u53EF\u4EE5\u76F4\u63A5\u8A18\u4E0B\u4E00\u6BB5\u5167\u5BB9\u3002" });
    const actions = zone.createDiv({ cls: "lr-drop-actions" });
    const input = picker(actions, "", true, (files) => run(() => this.host.importInbox(files)));
    button(actions, "\u532F\u5165\u6A94\u6848", () => input.click(), { icon: "upload" });
    button(actions, "\u5FEB\u901F\u6536\u96C6", () => this.host.capture(), { icon: "plus", cls: "lr-primary" });
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.addClass("is-dragover");
    });
    zone.addEventListener("dragleave", () => zone.removeClass("is-dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.removeClass("is-dragover");
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) run(() => this.host.importInbox(files));
      else {
        const text2 = e.dataTransfer?.getData("text/plain");
        if (text2) run(() => this.host.actions.capture(text2, false));
      }
    });
  }
  renderDetail() {
    const entry = this.host.index.entries.get(this.route.path ?? "");
    if (!entry) {
      empty(this.main, "file-question", "\u627E\u4E0D\u5230\u9019\u4EFD\u5167\u5BB9", "\u6A94\u6848\u53EF\u80FD\u5DF2\u79FB\u52D5\u6216\u522A\u9664\uFF0C\u53EF\u56DE\u5230\u5217\u8868\u91CD\u65B0\u5C0B\u627E\u3002", { label: "\u56DE\u5230\u9996\u9801", run: () => this.navigate({ section: "home" }) });
      return;
    }
    const h = heading(this.main, entry.name, entry.type ? LABELS[entry.type].toUpperCase() : entry.ext.toUpperCase());
    const actions = h.createDiv({ cls: "lr-detail-actions" });
    this.badge(actions, entry.status);
    button(actions, "\u958B\u555F\u539F\u59CB\u7B46\u8A18", () => this.host.openFile(entry.path), { icon: "file-pen-line", cls: "lr-primary" });
    if (entry.ext === "md") button(actions, "\u7DE8\u8F2F\u5C6C\u6027", () => this.host.edit(entry), { icon: "sliders-horizontal" });
    button(actions, entry.pinned ? "\u5DF2\u7F6E\u9802" : "\u7F6E\u9802", async () => {
      const file = this.app.vault.getFileByPath(entry.path);
      if (!file) throw new Error("\u6A94\u6848\u5DF2\u79FB\u52D5\u6216\u522A\u9664\u3002");
      await this.host.actions.update(file, { pinned: entry.pinned ? void 0 : true });
    }, { icon: "pin", cls: "lr-quiet" });
    if (entry.issues.length) {
      const warning = this.main.createDiv({ cls: "lr-warning", attr: { role: "status" } });
      for (const issue of entry.issues) warning.createEl("p", { text: issue });
    }
    const links = this.main.createDiv({ cls: "lr-detail-links" });
    for (const value of [...entry.projects, ...entry.course ? [entry.course] : []]) {
      const file = this.host.index.resolve(value, entry.path);
      const link = button(links, file?.basename ?? value, () => {
        if (file) {
          const target = this.host.index.entries.get(file.path);
          if (target) this.openEntry(target);
          else run(() => this.host.openFile(file.path));
        }
      }, { icon: file ? "link" : "unlink", cls: "lr-chip", title: file ? file.path : `\u9023\u7D50\u5C1A\u672A\u627E\u5230\uFF1A${value}` });
      link.disabled = !file;
    }
    for (const topic of entry.topics) links.createSpan({ cls: "lr-topic", text: topic });
    if (entry.type === "paper") this.renderPaper(entry);
    else if (entry.type === "course") this.renderCourse(entry);
    else if (entry.type === "project") this.renderProject(entry);
    else this.renderMarkdown(this.main, entry);
  }
  renderCourse(entry) {
    const epoch = this.epoch;
    const tasks = this.section(this.main, "\u76F8\u95DC\u5F85\u8FA6 Tasks", "\u660E\u78BA\u9023\u7D50\u6B64\u8AB2\u7A0B\u7684\u4E8B\u9805\u3002");
    renderTaskPanel(tasks, this.host, { component: this.rendered, alive: () => epoch === this.epoch && !this.closed, project: entry.path, draft: this.taskDraft });
    const overview = this.section(this.main, "\u6982\u89BD Overview", "");
    this.renderMarkdown(overview, entry);
    const related = this.host.index.related(entry.path, "course");
    for (const [kind, label] of GROUPS) {
      const block = this.section(this.main, label, "");
      button(block, `\u65B0\u589E${label.split(" ")[0]}`, () => this.host.newObject(kind === "resource" ? "resource" : "note", { course: `[[${entry.path.replace(/\.md$/, "")}]]`, kind: ["lecture", "assignment", "review"].includes(kind) ? kind : "" }), { icon: "plus", cls: "lr-section-add" });
      this.rows(block, recent(related.filter((e) => courseGroup(e) === kind)));
    }
  }
  renderProject(entry) {
    this.renderProgress(this.main, entry);
    const epoch = this.epoch;
    const tasks = this.section(this.main, "\u76F8\u95DC\u5F85\u8FA6 Tasks", "\u53EA\u5217\u51FA\u660E\u78BA\u9023\u5230\u6B64\u5C08\u6848\u7684\u5F85\u8FA6\u3002");
    renderTaskPanel(tasks, this.host, { component: this.rendered, alive: () => epoch === this.epoch && !this.closed, project: entry.path, draft: this.taskDraft });
    const resume = this.section(this.main, "\u7E7C\u7E8C\u6B64\u5C08\u6848", "");
    renderContinue(resume, this.host, this.rendered, () => epoch === this.epoch && !this.closed, entry.path);
    const records = this.main.createEl("details", { cls: "lr-more" });
    records.createEl("summary", { text: "\u5DE5\u4F5C\u8A18\u9304 Records" });
    renderRecords(records, this.host, this.rendered, () => epoch === this.epoch && !this.closed, entry.path);
    const overview = this.section(this.main, "\u7814\u7A76\u5099\u5FD8 Research brief", "\u7814\u7A76\u554F\u984C\u3001\u7576\u524D\u91CD\u9EDE\u8207\u91CD\u8981\u6C7A\u7B56\u3002");
    this.renderMarkdown(overview, entry);
    const related = this.host.index.related(entry.path, "project");
    for (const type of ["paper", "experiment", "note", "idea", "resource"]) {
      const block = this.section(this.main, type === "note" ? "\u77E5\u8B58\u8207\u7B46\u8A18 Notes" : LABELS[type], "");
      button(block, "\u65B0\u589E", () => this.host.newObject(type, { projects: [`[[${entry.path.replace(/\.md$/, "")}]]`] }), { icon: "plus", cls: "lr-section-add" });
      this.rows(block, recent(related.filter((e) => e.type === type)));
    }
    this.rows(this.section(this.main, "\u6700\u8FD1\u4FEE\u6539 Recent", ""), recent(related, 5));
  }
  renderPaper(entry) {
    const meta = this.main.createDiv({ cls: "lr-paper-meta" });
    if (entry.authors.length) meta.createSpan({ text: entry.authors.join(" \xB7 ") });
    if (entry.year) meta.createSpan({ text: entry.year });
    const pdf = this.host.index.resolve(entry.pdf, entry.path);
    const tools = this.main.createDiv({ cls: "lr-paper-tools" });
    if (pdf) {
      button(tools, "\u958B\u555F PDF", () => this.host.openFile(pdf.path), { icon: "file-text", cls: "lr-primary" });
      button(tools, "PDF \uFF0B \u95B1\u8B80\u7B46\u8A18", async () => {
        const note = this.app.vault.getFileByPath(entry.path);
        if (note) await this.host.openPaperPair(note, pdf);
      }, { icon: "columns-2" });
    } else tools.createEl("p", { cls: "lr-muted", text: entry.pdf ? "PDF \u9023\u7D50\u5C1A\u672A\u627E\u5230\uFF0C\u8ACB\u5728\u539F\u59CB\u7B46\u8A18\u4FEE\u6B63 pdf \u5C6C\u6027\u3002" : "\u5C1A\u672A\u9023\u7D50 PDF\u3002\u53EF\u5728\u539F\u59CB\u7B46\u8A18\u7684 pdf \u5C6C\u6027\u52A0\u5165\u6A94\u6848\u9023\u7D50\u3002" });
    if (/^https?:\/\//i.test(entry.source)) tools.createEl("a", { text: "\u958B\u555F\u4F86\u6E90 \u2197", href: entry.source, attr: { target: "_blank", rel: "noopener noreferrer" } });
    const connect = this.section(this.main, "\u9023\u7D50\u7406\u89E3\u8207\u5BE6\u8E10 Connect", "\u5F9E\u95B1\u8B80\u4E2D\u7559\u4E0B\u6982\u5FF5\u6216\u5BE6\u9A57\u7DDA\u7D22\uFF1B\u4F86\u6E90\u9023\u7D50\u6703\u81EA\u52D5\u4FDD\u7559\u3002");
    const context = { projects: entry.projects, course: entry.course, body: `
## \u4F86\u6E90 Source

[[${entry.path.replace(/\.md$/, "")}]]
` };
    const actions = connect.createDiv({ cls: "lr-paper-tools" });
    button(actions, "\u5EFA\u7ACB\u6982\u5FF5\u7B46\u8A18", () => this.host.newObject("note", { ...context, kind: "concept" }), { icon: "notebook-pen" });
    button(actions, "\u8A18\u4E0B\u5BE6\u9A57\u7DDA\u7D22", () => this.host.newObject("experiment", context), { icon: "test-tubes" });
    this.renderMarkdown(this.section(this.main, "\u95B1\u8B80\u7B46\u8A18 Reading notes", "\u9010\u9801\u5F15\u7528\u7559\u5728\u4E3B\u7B46\u8A18\uFF1B\u539F\u6587\u8207\u81EA\u5DF1\u7684\u89E3\u8B80\u5206\u958B\u5BEB\u3002"), entry);
    const epoch = this.epoch;
    const tasks = this.section(this.main, "\u76F8\u95DC\u5F85\u8FA6 Tasks", "\u660E\u78BA\u5F15\u7528\u9019\u7BC7\u8AD6\u6587\u7684\u5F85\u8FA6\u3002");
    renderTaskPanel(tasks, this.host, { component: this.rendered, alive: () => epoch === this.epoch && !this.closed, project: entry.path, draft: this.taskDraft });
    const related = this.host.index.connected(entry.path);
    this.rows(this.section(this.main, "\u76F8\u95DC\u7B46\u8A18\u8207\u5BE6\u9A57 Related", "\u8207\u9019\u7BC7\u8AD6\u6587\u4E92\u76F8\u9023\u7D50\u7684\u7B46\u8A18\u8207\u5BE6\u9A57\u3002"), recent(related));
  }
  renderMarkdown(parent, entry) {
    const el = parent.createDiv({ cls: "lr-note-preview markdown-rendered" });
    const epoch = this.epoch;
    const component = this.rendered;
    run(async () => {
      const file = this.app.vault.getFileByPath(entry.path);
      if (!file) return;
      const content = await this.app.vault.cachedRead(file);
      if (this.closed || epoch !== this.epoch) return;
      const body = content.slice((0, import_obsidian10.getFrontMatterInfo)(content).contentStart).replace(/^\s*# [^\n]+\n/, "").trim();
      if (!body.replace(/<!--[\s\S]*?-->/g, "").replace(/^#+[^\n]*$/gm, "").trim()) el.createEl("p", { cls: "lr-muted", text: "\u5728\u539F\u59CB\u7B46\u8A18\u4E2D\u5BEB\u4E0B\u5167\u5BB9\uFF0C\u9019\u88E1\u6703\u540C\u6B65\u986F\u793A\u3002" });
      else await import_obsidian10.MarkdownRenderer.render(this.app, body, el, entry.path, component);
    });
  }
};

// src/settings.ts
var import_obsidian11 = require("obsidian");
init_domain();
var WorkspaceSettingsTab = class extends import_obsidian11.PluginSettingTab {
  constructor(app, workspacePlugin) {
    super(app, workspacePlugin);
    this.workspacePlugin = workspacePlugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian11.Setting(this.containerEl).setName("\u555F\u52D5\u6642\u958B\u555F Workspace").setDesc("\u4FDD\u7559\u5176\u4ED6\u5206\u9801\uFF0C\u9032\u5165\u5DE5\u4F5C\u5340\u9996\u9801\u3002").addToggle((t) => t.setValue(this.workspacePlugin.settings.openOnStartup).onChange(async (value) => {
      this.workspacePlugin.settings.openOnStartup = value;
      await this.workspacePlugin.saveSettings();
    }));
    new import_obsidian11.Setting(this.containerEl).setName("\u65E5\u66C6\u6642\u5340").setDesc("IANA \u540D\u7A31\uFF0C\u4F8B\u5982 Asia/Hong_Kong\uFF1B\u4FEE\u6539\u53EA\u6539\u986F\u793A\uFF0C\u4E0D\u6539\u5DF2\u4FDD\u5B58\u7684\u6642\u9593\u3002").addText((t) => {
      t.setValue(this.workspacePlugin.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      t.inputEl.addEventListener("change", () => {
        void (async () => {
          if (!validZone(t.getValue())) {
            new import_obsidian11.Notice("\u7121\u6548\u6642\u5340\u3002");
            return;
          }
          this.workspacePlugin.settings.timezone = t.getValue();
          await this.workspacePlugin.saveSettings();
          await this.workspacePlugin.index.rebuild();
        })().catch((error) => new import_obsidian11.Notice(String(error)));
      });
    });
    new import_obsidian11.Setting(this.containerEl).setName("\u91CD\u5EFA\u7D22\u5F15").setDesc("\u7D22\u5F15\u53EA\u5B58\u5728\u8A18\u61B6\u9AD4\u4E2D\uFF1B\u6B64\u64CD\u4F5C\u4E0D\u6539\u52D5\u4EFB\u4F55\u5167\u5BB9\u3002").addButton((b) => b.setButtonText("\u91CD\u5EFA").onClick(async () => {
      await this.workspacePlugin.index.rebuild();
      new import_obsidian11.Notice("\u7D22\u5F15\u5DF2\u91CD\u5EFA\u3002");
    }));
    new import_obsidian11.Setting(this.containerEl).setName("\u8CC7\u6599\u593E\u8207\u7BC4\u672C").setHeading();
    this.containerEl.createEl("p", { text: "\u9019\u4E9B\u4F4D\u7F6E\u6C7A\u5B9A\u65B0\u5167\u5BB9\u7684\u5B58\u653E\u8655\u3002\u66F4\u6539\u8A2D\u5B9A\u4E0D\u6703\u642C\u79FB\u73FE\u6709\u6A94\u6848\uFF1B\u4EE5 type \u8207\u9023\u7D50\u6A19\u793A\u7684\u5167\u5BB9\u4ECD\u53EF\u88AB\u627E\u5230\u3002", cls: "setting-item-description" });
    for (const [key, value] of Object.entries(this.workspacePlugin.settings.folders)) {
      const label = key === "inbox" ? "Inbox" : key === "attachments" ? "Attachments" : key === "templates" ? "Templates" : LABELS[key];
      new import_obsidian11.Setting(this.containerEl).setName(label).addText((t) => {
        t.setValue(value);
        t.inputEl.addEventListener("change", () => {
          void (async () => {
            const folder = t.getValue().trim().replace(/\/$/, "");
            if (!validateFolder(folder)) {
              new import_obsidian11.Notice("\u8ACB\u4F7F\u7528 Vault \u5167\u7684\u76F8\u5C0D\u8CC7\u6599\u593E\u8DEF\u5F91\u3002");
              t.setValue(value);
              return;
            }
            this.workspacePlugin.settings.folders[key] = folder;
            await this.workspacePlugin.saveSettings();
            await this.workspacePlugin.index.rebuild();
          })().catch((error) => new import_obsidian11.Notice(String(error)));
        });
      });
    }
  }
};

// src/main.ts
var WorkspacePlugin = class extends import_obsidian12.Plugin {
  settings = structuredClone(DEFAULT_SETTINGS);
  index;
  actions;
  disposed = false;
  async onload() {
    const saved = await this.loadData();
    this.settings = { openOnStartup: saved?.openOnStartup !== false, folders: { ...DEFAULT_SETTINGS.folders }, timezone: validZone(saved?.timezone) ? saved.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone, homeMode: saved?.homeMode === "today" ? "today" : "week" };
    for (const key of Object.keys(this.settings.folders)) {
      const value = saved?.folders?.[key];
      if (typeof value === "string" && validateFolder(value)) this.settings.folders[key] = value;
    }
    this.index = new VaultIndex(this.app, () => this.settings);
    this.addChild(this.index);
    this.actions = new FileActions(this.app, () => this.settings);
    this.registerView(VIEW_TYPE, (leaf) => new WorkspaceView(leaf, this));
    this.addRibbonIcon("panels-top-left", "Open Learning & Research Workspace", () => run(() => this.openWorkspace()));
    this.addCommand({ id: "open-workspace", name: "Open Workspace", callback: () => run(() => this.openWorkspace()) });
    this.addCommand({ id: "open-inbox", name: "Open Inbox", callback: () => run(() => this.openWorkspace({ section: "inbox" })) });
    this.addCommand({ id: "quick-capture", name: "Quick capture", callback: () => this.capture() });
    this.addCommand({ id: "capture-idea", name: "Capture idea", callback: () => this.capture(true) });
    for (const type of TYPES.filter((t) => t !== "idea")) this.addCommand({ id: `new-${type}`, name: type === "paper" ? "Add paper" : `New ${type === "project" ? "research project" : type}`, callback: () => this.newObject(type) });
    this.addCommand({ id: "open-tasks", name: "\u958B\u555F\u5F85\u8FA6 Tasks", callback: () => run(() => this.openWorkspace({ section: "tasks" })) });
    this.addCommand({ id: "open-records", name: "\u958B\u555F\u5DE5\u4F5C\u8A18\u9304 Records", callback: () => run(() => this.openWorkspace({ section: "records" })) });
    this.addCommand({ id: "new-record", name: "\u65B0\u589E\u5DE5\u4F5C\u8A18\u9304", callback: () => new RecordModal(this).open() });
    this.addCommand({ id: "rebuild-index", name: "Rebuild workspace index", callback: () => run(() => this.index.rebuild()) });
    this.addSettingTab(new WorkspaceSettingsTab(this.app, this));
    this.registerObsidianProtocolHandler(VIEW_TYPE, (params) => {
      if (!params.vault || params.vault === this.app.vault.getName()) run(() => this.openWorkspace());
    });
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof import_obsidian12.TFile)) return;
      const entry = this.index.entries.get(file.path);
      if (!entry) return;
      if (["course", "project", "paper"].includes(entry.type ?? "")) menu.addItem((i) => i.setTitle("\u5728\u5DE5\u4F5C\u5340\u4E2D\u6AA2\u8996").setIcon("panels-top-left").onClick(() => run(() => this.openWorkspace({ section: "detail", path: file.path }))));
      menu.addItem((i) => i.setTitle("\u6574\u7406\u81F3\u5B78\u7FD2\u7814\u7A76\u5DE5\u4F5C\u5340").setIcon("inbox").onClick(() => this.organize(entry)));
    }));
    this.app.workspace.onLayoutReady(() => run(async () => {
      if (this.disposed) return;
      await this.index.rebuild();
      if (this.settings.openOnStartup && !this.disposed) await this.openWorkspace();
    }));
  }
  onunload() {
    this.disposed = true;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async openWorkspace(route = { section: "home" }) {
    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    const first = !leaf;
    if (!leaf) {
      const current = workspace.getLeaf(false);
      leaf = current.view.getViewType() === "empty" ? current : workspace.getLeaf("tab");
    }
    await leaf.setViewState({ type: VIEW_TYPE, active: true, state: { ...route } });
    await workspace.revealLeaf(leaf);
    if (first) workspace.leftSplit.collapse();
  }
  async openFile(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) throw new Error(`\u627E\u4E0D\u5230\u6A94\u6848\uFF1A${path}`);
    await this.app.workspace.getLeaf("tab").openFile(file, { active: true });
  }
  async openPaperPair(file, pdf) {
    const noteLeaf = this.app.workspace.getLeaf("tab");
    await noteLeaf.openFile(file, { active: true });
    const pdfLeaf = this.app.workspace.createLeafBySplit(noteLeaf, "vertical");
    await pdfLeaf.openFile(pdf, { active: true });
  }
  newObject(type, context = {}) {
    new NewObjectModal(this, type, context).open();
  }
  capture(idea = false) {
    new CaptureModal(this, idea).open();
  }
  organize(entry) {
    new MetadataModal(this, entry, true).open();
  }
  edit(entry) {
    new MetadataModal(this, entry).open();
  }
  nativeSearch(query = "") {
    window.open(`obsidian://search?vault=${encodeURIComponent(this.app.vault.getName())}&query=${encodeURIComponent(query)}`);
  }
  async importInbox(files) {
    const imported = await this.actions.importFiles(files);
    new import_obsidian12.Notice(`\u5DF2\u532F\u5165 ${imported.length} \u500B\u6A94\u6848\u81F3 Inbox\u3002`);
  }
};
