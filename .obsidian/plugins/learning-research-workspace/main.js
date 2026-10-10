"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WorkspacePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/domain.ts
var TYPES = ["course", "project", "paper", "note", "experiment", "idea", "resource"];
var DEFAULT_SETTINGS = {
  openOnStartup: true,
  folders: { course: "10 Courses", project: "20 Research", paper: "30 Papers", note: "40 Notes", experiment: "50 Experiments", idea: "60 Ideas", resource: "70 Resources", inbox: "01 Inbox", attachments: "80 Attachments", templates: "90 Templates" }
};
var LABELS = { course: "\u8AB2\u7A0B Course", project: "\u7814\u7A76\u5C08\u6848 Project", paper: "\u8AD6\u6587 Paper", note: "\u7B46\u8A18 Note", experiment: "\u5BE6\u9A57 Experiment", idea: "\u60F3\u6CD5 Idea", resource: "\u8CC7\u6E90 Resource" };
var ICONS = { course: "graduation-cap", project: "flask-conical", paper: "file-text", note: "notebook-pen", experiment: "test-tubes", idea: "lightbulb", resource: "library" };
var TEMPLATES = { course: "Course", project: "Research Project", paper: "Paper", note: "General Note", experiment: "Experiment", idea: "Idea", resource: "Resource" };
var STATUSES = {
  course: ["planned", "active", "completed", "archived"],
  project: ["active", "paused", "completed", "archived"],
  paper: ["inbox", "reading", "read", "reference", "archived"],
  experiment: ["planned", "running", "completed", "failed", "paused"],
  idea: ["inbox", "archived"],
  note: ["inbox", "archived"],
  resource: ["inbox", "reference", "archived"]
};
var STATUS_LABELS = { planned: "\u8A08\u756B\u4E2D", active: "\u9032\u884C\u4E2D", completed: "\u5DF2\u5B8C\u6210", archived: "\u5DF2\u5C01\u5B58", paused: "\u66AB\u505C", inbox: "\u5F85\u6574\u7406", reading: "\u95B1\u8B80\u4E2D", read: "\u5DF2\u8B80", reference: "\u53C3\u8003", running: "\u57F7\u884C\u4E2D", failed: "\u5931\u6557" };
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
  if (path.split("/").some((s) => s.startsWith(".")) || inFolder(path, settings.folders.templates)) return false;
  if (Object.entries(settings.folders).some(([key, folder]) => key !== "templates" && inFolder(path, folder))) return true;
  return !inFolder(path, "00 Home") && !inFolder(path, "99 System");
}
function isInbox(entry, settings) {
  return inFolder(entry.path, settings.folders.inbox) || entry.status === "inbox";
}
function normalizeEntry(file, fm = {}, links = []) {
  const issues = [];
  if (fm.type && !isObjectType(fm.type)) issues.push("\u672A\u77E5\u7684 type\uFF0C\u8ACB\u5728\u539F\u59CB\u7B46\u8A18\u4E2D\u4FEE\u6B63\u3002");
  if (fm.project && !fm.projects) issues.push("\u5075\u6E2C\u5230\u820A\u6B04\u4F4D project\uFF1B\u7DE8\u8F2F\u95DC\u806F\u6642\u6703\u6539\u7528 projects\u3002");
  for (const key of ["projects", "topics", "authors"]) if (fm[key] != null && !Array.isArray(fm[key])) issues.push(`${key} \u5EFA\u8B70\u4F7F\u7528\u6E05\u55AE\uFF1B\u76EE\u524D\u4EE5\u55AE\u4E00\u503C\u8B80\u53D6\u3002`);
  return {
    ...file,
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
  return title.normalize("NFC").replace(/[\\/:*?"<>|#\[\]\x00-\x1f]/g, " ").replace(/\s+/g, " ").replace(/^[. ]+|[. ]+$/g, "").slice(0, 160).trim();
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

// src/data/index.ts
var import_obsidian = require("obsidian");
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
  onload() {
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      this.put(file);
      this.schedule();
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.schedule()));
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

// src/data/actions.ts
var import_obsidian2 = require("obsidian");
var FileActions = class {
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
  async create(input) {
    const stem = safeStem(input.title);
    if (!stem) throw new Error("\u8ACB\u8F38\u5165\u6709\u6548\u7684\u6A19\u984C\u3002");
    if (input.type === "paper" && input.pdf) {
      const pdf = this.app.metadataCache.getFirstLinkpathDest(linkTarget(input.pdf), "");
      const existing = pdf ? this.findCompanion(pdf) : null;
      if (existing) {
        const fm = this.app.metadataCache.getFileCache(existing)?.frontmatter;
        if (fm?.type !== "paper") throw new Error(`\u6B64 PDF \u5DF2\u7531 ${existing.path} \u8AAA\u660E\uFF0C\u8ACB\u7DE8\u8F2F\u8A72\u7B46\u8A18\u3002`);
        const values = {};
        if (input.projects?.length) values.projects = [.../* @__PURE__ */ new Set([...strings(fm.projects ?? fm.project), ...input.projects])];
        if (input.course) values.course = input.course;
        if (input.source) values.source = input.source;
        if (Object.keys(values).length) await this.update(existing, values);
        return existing;
      }
    }
    const folder = this.settings().folders[input.capture ? "inbox" : input.type];
    await this.ensureFolder(folder);
    const path = this.unique(folder, `${stem}.md`);
    const templatePath = (0, import_obsidian2.normalizePath)(`${this.settings().folders.templates}/${TEMPLATES[input.type]}.md`);
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
  async capture(content, idea) {
    if (!content.trim()) throw new Error("\u5148\u5BEB\u4E0B\u4E00\u9EDE\u5167\u5BB9\u3002");
    const title = safeStem(content.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 70)) || `Capture ${import_obsidian2.moment.utc().local().format("YYYY-MM-DD HHmmss")}`;
    await this.ensureFolder(this.settings().folders.inbox);
    const yaml = `---
${idea ? "type: idea\n" : ""}status: inbox
created: ${import_obsidian2.moment.utc().local().format("YYYY-MM-DD")}
---
`;
    return this.app.vault.create(this.unique(this.settings().folders.inbox, `${title}.md`), `${yaml}
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

// src/views/workspace-view.ts
var import_obsidian4 = require("obsidian");

// src/ui/components.ts
var import_obsidian3 = require("obsidian");
function icon(parent, name, cls = "lr-icon") {
  const el = parent.createSpan({ cls, attr: { "aria-hidden": "true" } });
  (0, import_obsidian3.setIcon)(el, name);
  return el;
}
function run(action) {
  try {
    Promise.resolve(action()).catch((error) => new import_obsidian3.Notice(error instanceof Error ? error.message : String(error), 9e3));
  } catch (error) {
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
var VIEW_TYPE = "learning-research-workspace";
var NAV = [["home", "\u9996\u9801", "Home", "house"], ["courses", "\u8AB2\u7A0B", "Courses", "graduation-cap"], ["research", "\u7814\u7A76", "Research", "flask-conical"], ["papers", "\u8AD6\u6587", "Papers", "file-text"], ["experiments", "\u5BE6\u9A57", "Experiments", "test-tubes"], ["ideas", "\u60F3\u6CD5", "Ideas", "lightbulb"], ["inbox", "\u6536\u4EF6\u5323", "Inbox", "inbox"]];
var SECTION_TYPES = { courses: "course", research: "project", papers: "paper", experiments: "experiment", ideas: "idea" };
var GROUPS = [["lecture", "\u8B1B\u7FA9 Lectures"], ["note", "\u7B46\u8A18 Notes"], ["assignment", "\u4F5C\u696D Assignments"], ["resource", "\u8CC7\u6E90 Resources"], ["review", "\u8907\u7FD2 Review"]];
var WorkspaceView = class extends import_obsidian4.ItemView {
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
    const valid = ["home", "courses", "research", "papers", "experiments", "ideas", "inbox", "recent", "library", "detail"];
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
    const selection = searching ? focused?.selectionStart : null;
    this.epoch++;
    if (this.rendered) this.removeChild(this.rendered);
    this.rendered = new import_obsidian4.Component();
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
    else if (this.route.section === "detail") this.renderDetail();
    else this.renderListing();
    this.main.querySelector("h1")?.setAttribute("tabindex", "-1");
    this.main.scrollTop = oldScroll;
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
    const create = button(actions, "\u65B0\u589E", () => {
      const menu = new import_obsidian4.Menu();
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
    const welcome = heading(this.main, "\u5B78\u7FD2\u8207\u7814\u7A76\uFF0C\u5F9E\u9019\u88E1\u7E7C\u7E8C\u3002", "YOUR WORKSPACE", "\u8AB2\u7A0B\u3001\u7814\u7A76\u8207\u60F3\u6CD5\uFF0C\u90FD\u6709\u81EA\u5DF1\u7684\u4F4D\u7F6E\u3002");
    const stamp = welcome.createDiv({ cls: "lr-home-stamp" });
    icon(stamp, "sprout");
    stamp.createSpan({ text: "Learning & Research" });
    const courses = this.section(this.main, "\u8AB2\u7A0B Courses", "\u70BA\u6BCF\u4E00\u9580\u8AB2\u4FDD\u7559\u6E05\u695A\u7684\u5165\u53E3\u3002", { section: "courses" });
    const current = this.host.index.ofType("course").filter((e) => !["archived", "completed"].includes(e.status));
    if (current.length) {
      const grid = courses.createDiv({ cls: "lr-card-grid" });
      for (const entry of recent(current, 6)) this.card(grid, entry);
    } else empty(courses, "graduation-cap", "\u4F60\u7684\u7B2C\u4E00\u9580\u8AB2\u7A0B\uFF0C\u5F9E\u9019\u88E1\u958B\u59CB", "\u628A\u8B1B\u7FA9\u3001\u8AB2\u5802\u7B46\u8A18\u3001\u4F5C\u696D\u8207\u8907\u7FD2\u653E\u5728\u540C\u4E00\u500B\u8108\u7D61\u4E2D\u3002", { label: "\u5EFA\u7ACB\u8AB2\u7A0B", run: () => this.host.newObject("course") });
    const research = this.section(this.main, "\u7814\u7A76 Research", "\u6B63\u5728\u9032\u884C\u7684\u554F\u984C\u8207\u63A2\u7D22\u3002", { section: "research" });
    const active = this.host.index.ofType("project").filter((e) => e.status === "active");
    if (active.length) for (const entry of recent(active, 4)) this.projectCard(research, entry);
    else empty(research, "flask-conical", "\u5C1A\u7121\u9032\u884C\u4E2D\u7684\u7814\u7A76\u5C08\u6848", "\u6E96\u5099\u597D\u6642\uFF0C\u5F9E\u4E00\u500B\u7814\u7A76\u554F\u984C\u958B\u59CB\u3002", { label: "\u5EFA\u7ACB\u7814\u7A76\u5C08\u6848", run: () => this.host.newObject("project") });
    const columns = this.main.createDiv({ cls: "lr-home-columns" });
    const rec = this.section(columns, "\u6700\u8FD1 Recent", "\u6700\u8FD1\u4FEE\u6539\u7684\u6A94\u6848\u3002", { section: "recent" });
    this.rows(rec, recent(this.host.index.all(), 5), "\u9084\u6C92\u6709\u6700\u8FD1\u4FEE\u6539\u7684\u5167\u5BB9", "\u5EFA\u7ACB\u6216\u532F\u5165\u5167\u5BB9\u5F8C\uFF0C\u6703\u5728\u9019\u88E1\u51FA\u73FE\u3002");
    const inbox = this.section(columns, "\u6536\u4EF6\u5323 Inbox", "\u5148\u6536\u96C6\uFF0C\u7A0D\u5F8C\u518D\u6574\u7406\u3002", { section: "inbox" });
    const pending = this.host.index.all().filter((e) => isInbox(e, this.host.settings));
    if (pending.length) {
      inbox.createDiv({ cls: "lr-inbox-summary", text: `${pending.length} \u500B\u6A94\u6848\u5F85\u6574\u7406` });
      this.rows(inbox, recent(pending, 5));
    } else empty(inbox, "inbox", "\u6C92\u6709\u5F85\u6574\u7406\u7684\u5167\u5BB9", "\u96A8\u6642\u653E\u5165\u9023\u7D50\u3001\u7B46\u8A18\u3001PDF \u6216\u60F3\u6CD5\u3002", { label: "\u5FEB\u901F\u6536\u96C6", run: () => this.host.capture() });
    const pinned = this.section(this.main, "\u91CD\u8981\u8CC7\u6599 Pinned", "\u4F60\u89AA\u81EA\u9078\u64C7\u4FDD\u7559\u5728\u624B\u908A\u7684\u5167\u5BB9\u3002");
    this.rows(pinned, recent(this.host.index.all().filter((e) => e.pinned), 6), "\u91CD\u8981\u8CC7\u6599\uFF0C\u7559\u5728\u624B\u908A", "\u5728\u5167\u5BB9\u5217\u6216\u8A73\u60C5\u9801\u9078\u64C7\u7F6E\u9802\uFF0C\u5373\u53EF\u51FA\u73FE\u5728\u9019\u88E1\u3002");
  }
  card(parent, entry) {
    const el = parent.createEl("article", { cls: `lr-card lr-type-${entry.type}` });
    const top = el.createDiv({ cls: "lr-card-top" });
    icon(top, ICONS[entry.type ?? "note"], "lr-card-icon");
    this.badge(top, entry.status);
    button(el, entry.name, () => this.open(entry), { cls: "lr-card-title" });
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
    button(info, entry.name, () => this.open(entry), { cls: "lr-card-title" });
    const related = this.host.index.related(entry.path, "project");
    info.createEl("p", { text: [["paper", "papers"], ["note", "notes"], ["experiment", "experiments"], ["idea", "ideas"]].map(([type, label]) => `${related.filter((e) => e.type === type).length} ${label}`).join(" \xB7 ") });
    this.badge(el, entry.status);
    button(el, "", () => this.host.openFile(entry.path), { icon: "file-pen-line", cls: "lr-icon-button", title: `\u958B\u555F\u539F\u59CB\u7B46\u8A18\uFF1A${entry.name}` });
  }
  badge(parent, status) {
    if (status) parent.createSpan({ cls: `lr-badge ${status === "failed" ? "is-failed" : ""}`, text: STATUS_LABELS[status] ?? status });
  }
  open(entry) {
    if (["course", "project", "paper"].includes(entry.type ?? "")) this.navigate({ section: "detail", path: entry.path });
    else run(() => this.host.openFile(entry.path));
  }
  row(parent, entry) {
    const row = parent.createEl("article", { cls: `lr-row lr-type-${entry.type ?? "file"}` });
    icon(row, entry.type ? ICONS[entry.type] : entry.ext === "pdf" ? "file-text" : ["png", "jpg", "jpeg", "webp", "svg"].includes(entry.ext) ? "image" : "file", "lr-row-icon");
    const info = row.createDiv({ cls: "lr-row-info" });
    button(info, entry.name, () => this.open(entry), { cls: "lr-row-title" });
    info.createDiv({ cls: "lr-row-meta", text: `${entry.type ? LABELS[entry.type] : entry.ext.toUpperCase()} \xB7 ${displayDate(entry.mtime)}` });
    this.badge(row, entry.status);
    const actions = row.createDiv({ cls: "lr-row-actions" });
    if (isInbox(entry, this.host.settings)) button(actions, "\u6574\u7406", () => this.host.organize(entry), { cls: "lr-quiet" });
    if (entry.ext === "md") button(actions, "", async () => {
      const f = this.app.vault.getFileByPath(entry.path);
      if (f) await this.host.actions.update(f, { pinned: entry.pinned ? void 0 : true });
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
    if (section === "inbox") this.renderDropzone(this.main);
    const toolbar = this.main.createDiv({ cls: "lr-list-toolbar" });
    const searchWrap = toolbar.createDiv({ cls: "lr-search" });
    icon(searchWrap, "search");
    const input = searchWrap.createEl("input", { cls: "lr-search-input", attr: { type: "search", placeholder: "\u7BE9\u9078\u6A19\u984C\u3001\u4E3B\u984C\u3001\u4F5C\u8005\u2026", "aria-label": "\u7BE9\u9078\u76EE\u524D\u5217\u8868" } });
    input.value = this.route.query ?? "";
    const scope = toolbar.createEl("select", { attr: { "aria-label": "\u9078\u64C7\u6AA2\u8996" } });
    let options = [["all", "\u5168\u90E8 All"]];
    if (section === "papers") options = [...options, ["inbox", "\u5F85\u6574\u7406 Inbox"], ["reading", "\u95B1\u8B80\u4E2D Reading"], ["recent", "\u6700\u8FD1\u52A0\u5165"], ["by-project", "\u4F9D\u7814\u7A76\u5C08\u6848"], ["by-topic", "\u4F9D\u4E3B\u984C"], ["reference", "\u53C3\u8003 Reference"], ["archived", "\u5C01\u5B58"]];
    else if (type) options = [...options, ...(type === "course" ? ["active", "planned", "completed", "archived"] : type === "project" ? ["active", "paused", "completed", "archived"] : type === "experiment" ? ["planned", "running", "completed", "failed", "paused"] : ["inbox", "archived"]).map((s) => [s, STATUS_LABELS[s] ?? s])];
    else if (section === "inbox") options = [...options, ["md", "\u7B46\u8A18"], ["pdf", "PDF"], ["images", "\u5716\u7247"]];
    else if (section === "library") options = [...options, ["note", "\u7B46\u8A18 Notes"], ["resource", "\u8CC7\u6E90 Resources"], ["attachments", "\u9644\u4EF6"]];
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
      if (section === "library" && filter !== "all") entries = entries.filter((e) => filter === "attachments" ? e.ext !== "md" : e.type === filter);
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
      if (file) await this.host.actions.update(file, { pinned: entry.pinned ? void 0 : true });
    }, { icon: "pin", cls: "lr-quiet" });
    if (entry.issues.length) {
      const warning = this.main.createDiv({ cls: "lr-warning", attr: { role: "status" } });
      for (const issue of entry.issues) warning.createEl("p", { text: issue });
    }
    const links = this.main.createDiv({ cls: "lr-detail-links" });
    for (const value of [...entry.projects, ...entry.course ? [entry.course] : []]) {
      const file = this.host.index.resolve(value, entry.path);
      button(links, file?.basename ?? value, () => {
        if (file) {
          const target = this.host.index.entries.get(file.path);
          if (target) this.open(target);
          else run(() => this.host.openFile(file.path));
        }
      }, { icon: file ? "link" : "unlink", cls: "lr-chip", title: file ? file.path : `\u9023\u7D50\u5C1A\u672A\u627E\u5230\uFF1A${value}` });
    }
    for (const topic of entry.topics) links.createSpan({ cls: "lr-topic", text: topic });
    if (entry.type === "paper") this.renderPaper(entry);
    else if (entry.type === "course") this.renderCourse(entry);
    else if (entry.type === "project") this.renderProject(entry);
    else this.renderMarkdown(this.main, entry);
  }
  renderCourse(entry) {
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
    const overview = this.section(this.main, "\u7814\u7A76\u5099\u5FD8 Research brief", "\u7814\u7A76\u554F\u984C\u3001\u7576\u524D\u91CD\u9EDE\u8207\u91CD\u8981\u6C7A\u7B56\u3002");
    this.renderMarkdown(overview, entry);
    const related = this.host.index.related(entry.path, "project");
    for (const type of ["paper", "experiment", "note", "idea", "resource"]) {
      const block = this.section(this.main, LABELS[type], "");
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
    this.renderMarkdown(this.section(this.main, "\u95B1\u8B80\u7B46\u8A18 Reading notes", ""), entry);
    const related = this.host.index.related(entry.path, "references");
    this.rows(this.section(this.main, "\u76F8\u95DC\u7B46\u8A18\u8207\u5BE6\u9A57 Related", "\u660E\u78BA\u9023\u7D50\u5230\u9019\u7BC7\u8AD6\u6587\u7684\u5167\u5BB9\u3002"), recent(related));
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
      const body = content.slice((0, import_obsidian4.getFrontMatterInfo)(content).contentStart).replace(/^\s*# [^\n]+\n/, "").trim();
      if (!body.replace(/<!--[\s\S]*?-->/g, "").replace(/^#+[^\n]*$/gm, "").trim()) el.createEl("p", { cls: "lr-muted", text: "\u5728\u539F\u59CB\u7B46\u8A18\u4E2D\u5BEB\u4E0B\u5167\u5BB9\uFF0C\u9019\u88E1\u6703\u540C\u6B65\u986F\u793A\u3002" });
      else await import_obsidian4.MarkdownRenderer.render(this.app, body, el, entry.path, component);
    });
  }
};

// src/ui/modals.ts
var import_obsidian5 = require("obsidian");
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
    const submit = button(footer, "\u5EFA\u7ACB\u4E26\u958B\u555F", async () => {
      if (submit.disabled) return;
      error.empty();
      if (!safeStem(this.title)) {
        error.setText("\u8ACB\u5148\u8F38\u5165\u6A19\u984C\u3002");
        return;
      }
      if (this.source && !/^https?:\/\//i.test(this.source.trim())) {
        error.setText("\u4F86\u6E90\u8ACB\u4F7F\u7528 http \u6216 https \u7DB2\u5740\u3002");
        return;
      }
      submit.disabled = true;
      try {
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
        submit.disabled = false;
      }
    }, { icon: "plus", cls: "lr-primary" });
    this.contentEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit.click();
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
  onOpen() {
    this.contentEl.addClass("lr-modal");
    this.contentEl.createEl("p", { cls: "lr-modal-intro", text: "\u5BEB\u4E0B\u60F3\u6CD5\u3001\u8CBC\u4E0A\u9023\u7D50\u6216 AI \u56DE\u8986\uFF0C\u5148\u653E\u9032 Inbox\u3002" });
    const area = this.contentEl.createEl("textarea", { cls: "lr-capture", attr: { placeholder: "\u5F9E\u9019\u88E1\u958B\u59CB\u2026", "aria-label": "\u6355\u6349\u5167\u5BB9" } });
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const footer = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(footer, "\u53D6\u6D88", () => this.close());
    const submit = button(footer, "\u5B58\u5165 Inbox", async () => {
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        await this.host.actions.capture(area.value, this.idea);
        this.close();
        new import_obsidian5.Notice("\u5DF2\u5B58\u5165 Inbox\u3002");
      } catch (e) {
        error.setText(String(e));
        submit.disabled = false;
      }
    }, { icon: "inbox", cls: "lr-primary" });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit.click();
      }
    });
    area.focus();
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
    new import_obsidian5.Setting(more).setName("\u8AB2\u7A0B\u6750\u6599").addDropdown((d) => d.addOptions({ "": "\u4E00\u822C", "lecture": "\u8B1B\u7FA9 Lecture", "assignment": "\u4F5C\u696D Assignment", "review": "\u8907\u7FD2 Review" }).setValue(this.kind).onChange((v) => this.kind = v));
    new import_obsidian5.Setting(more).setName("\u4E3B\u984C Topics").setDesc("\u4EE5\u9017\u865F\u5206\u9694\uFF0C\u7121\u9700\u9810\u5148\u5EFA\u7ACB\u5206\u985E\u3002").addText((t) => t.setValue(this.topics).onChange((v) => this.topics = v));
    const error = this.contentEl.createDiv({ cls: "lr-form-error", attr: { role: "alert" } });
    const footer = this.contentEl.createDiv({ cls: "lr-modal-actions" });
    button(footer, "\u53D6\u6D88", () => this.close());
    const submit = button(footer, this.organizing ? "\u5132\u5B58\u4E26\u6574\u7406" : "\u5132\u5B58", async () => {
      if (submit.disabled) return;
      submit.disabled = true;
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
        submit.disabled = false;
      }
    }, { icon: "check", cls: "lr-primary" });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");
var WorkspaceSettingsTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, workspacePlugin) {
    super(app, workspacePlugin);
    this.workspacePlugin = workspacePlugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian6.Setting(this.containerEl).setName("\u555F\u52D5\u6642\u958B\u555F Workspace").setDesc("\u4FDD\u7559\u5176\u4ED6\u5206\u9801\uFF0C\u9032\u5165\u5DE5\u4F5C\u5340\u9996\u9801\u3002").addToggle((t) => t.setValue(this.workspacePlugin.settings.openOnStartup).onChange(async (value) => {
      this.workspacePlugin.settings.openOnStartup = value;
      await this.workspacePlugin.saveSettings();
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u91CD\u5EFA\u7D22\u5F15").setDesc("\u7D22\u5F15\u53EA\u5B58\u5728\u8A18\u61B6\u9AD4\u4E2D\uFF1B\u6B64\u64CD\u4F5C\u4E0D\u6539\u52D5\u4EFB\u4F55\u5167\u5BB9\u3002").addButton((b) => b.setButtonText("\u91CD\u5EFA").onClick(async () => {
      await this.workspacePlugin.index.rebuild();
      new import_obsidian6.Notice("\u7D22\u5F15\u5DF2\u91CD\u5EFA\u3002");
    }));
    new import_obsidian6.Setting(this.containerEl).setName("\u8CC7\u6599\u593E\u8207\u7BC4\u672C").setHeading();
    this.containerEl.createEl("p", { text: "\u9019\u4E9B\u4F4D\u7F6E\u6C7A\u5B9A\u65B0\u5167\u5BB9\u7684\u5B58\u653E\u8655\u3002\u66F4\u6539\u8A2D\u5B9A\u4E0D\u6703\u642C\u79FB\u73FE\u6709\u6A94\u6848\uFF1B\u4EE5 type \u8207\u9023\u7D50\u6A19\u793A\u7684\u5167\u5BB9\u4ECD\u53EF\u88AB\u627E\u5230\u3002", cls: "setting-item-description" });
    for (const [key, value] of Object.entries(this.workspacePlugin.settings.folders)) {
      const label = key === "inbox" ? "Inbox" : key === "attachments" ? "Attachments" : key === "templates" ? "Templates" : LABELS[key];
      new import_obsidian6.Setting(this.containerEl).setName(label).addText((t) => {
        t.setValue(value);
        t.inputEl.addEventListener("change", () => {
          void (async () => {
            const folder = t.getValue().trim().replace(/\/$/, "");
            if (!validateFolder(folder)) {
              new import_obsidian6.Notice("\u8ACB\u4F7F\u7528 Vault \u5167\u7684\u76F8\u5C0D\u8CC7\u6599\u593E\u8DEF\u5F91\u3002");
              t.setValue(value);
              return;
            }
            this.workspacePlugin.settings.folders[key] = folder;
            await this.workspacePlugin.saveSettings();
            await this.workspacePlugin.index.rebuild();
          })().catch((error) => new import_obsidian6.Notice(String(error)));
        });
      });
    }
  }
};

// src/main.ts
var WorkspacePlugin = class extends import_obsidian7.Plugin {
  settings = structuredClone(DEFAULT_SETTINGS);
  index;
  actions;
  disposed = false;
  async onload() {
    const saved = await this.loadData();
    this.settings = { openOnStartup: saved?.openOnStartup !== false, folders: { ...DEFAULT_SETTINGS.folders } };
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
    this.addCommand({ id: "rebuild-index", name: "Rebuild workspace index", callback: () => run(() => this.index.rebuild()) });
    this.addSettingTab(new WorkspaceSettingsTab(this.app, this));
    this.registerObsidianProtocolHandler(VIEW_TYPE, (params) => {
      if (!params.vault || params.vault === this.app.vault.getName()) run(() => this.openWorkspace());
    });
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof import_obsidian7.TFile)) return;
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
    new import_obsidian7.Notice(`\u5DF2\u532F\u5165 ${imported.length} \u500B\u6A94\u6848\u81F3 Inbox\u3002`);
  }
};
