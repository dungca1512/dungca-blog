import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const POSTS_DIR = path.join(CONTENT_ROOT, "posts");
const PROJECTS_DIR = path.join(CONTENT_ROOT, "projects");
const FEATURED_REPOS_FILE = path.join(PROJECTS_DIR, "featured-repos.json");

type MatterData = Record<string, unknown>;

export type PostListItem = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
};

export type Post = PostListItem & {
  contentHtml: string;
};

export type ProjectListItem = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  order: number;
  repo?: string;
  demoUrl?: string;
};

export type Project = ProjectListItem & {
  contentHtml: string;
};

export type FeaturedReposConfig = {
  githubUser: string;
  featured: string[];
};

const DEFAULT_FEATURED_REPOS_CONFIG: FeaturedReposConfig = {
  githubUser: "dungca1512",
  featured: [],
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeDate(value: unknown): string {
  const raw = asString(value);
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toISOString().slice(0, 10);
}

function compareDateDesc(a: string, b: string): number {
  const left = Date.parse(a);
  const right = Date.parse(b);

  if (Number.isNaN(left) && Number.isNaN(right)) {
    return 0;
  }

  if (Number.isNaN(left)) {
    return 1;
  }

  if (Number.isNaN(right)) {
    return -1;
  }

  return right - left;
}

function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

async function readMarkdownFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("_"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readMarkdownFile(
  directory: string,
  slug: string,
): Promise<string | null> {
  const fullPath = path.join(directory, `${slug}.md`);

  try {
    return await fs.readFile(fullPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function markdownToHtml(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml)
    .process(markdown);

  return processed.toString();
}

function parsePostMeta(slug: string, data: MatterData): PostListItem {
  const title = asString(data.title, slug);
  const summary = asString(data.summary, "Chưa có tóm tắt.");
  const date = normalizeDate(data.date);
  const tags = asStringArray(data.tags);

  return {
    slug,
    title,
    summary,
    date,
    tags,
  };
}

function parseProjectMeta(slug: string, data: MatterData): ProjectListItem {
  const title = asString(data.title, slug);
  const summary = asString(data.summary, "Chưa có tóm tắt.");
  const date = normalizeDate(data.date);
  const tags = asStringArray(data.tags);
  const order = asNumber(data.order, 999);
  const repo = asString(data.repo);
  const demoUrl = asString(data.demoUrl);

  return {
    slug,
    title,
    summary,
    date,
    tags,
    order,
    repo: repo || undefined,
    demoUrl: demoUrl || undefined,
  };
}

export async function getPostSlugs(): Promise<string[]> {
  const files = await readMarkdownFiles(POSTS_DIR);
  return files.map(stripMarkdownExtension);
}

export async function getAllPosts(): Promise<PostListItem[]> {
  const files = await readMarkdownFiles(POSTS_DIR);

  const posts = await Promise.all(
    files.map(async (fileName) => {
      const slug = stripMarkdownExtension(fileName);
      const source = await fs.readFile(path.join(POSTS_DIR, fileName), "utf8");
      const parsed = matter(source);
      const data = parsed.data as MatterData;

      if (asBoolean(data.draft, false)) {
        return null;
      }

      return parsePostMeta(slug, data);
    }),
  );

  return posts
    .filter((item): item is PostListItem => item !== null)
    .sort((a, b) => compareDateDesc(a.date, b.date));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const source = await readMarkdownFile(POSTS_DIR, slug);
  if (!source) {
    return null;
  }

  const parsed = matter(source);
  const data = parsed.data as MatterData;

  if (asBoolean(data.draft, false)) {
    return null;
  }

  const meta = parsePostMeta(slug, data);
  const contentHtml = await markdownToHtml(parsed.content);

  return {
    ...meta,
    contentHtml,
  };
}

export async function getProjectSlugs(): Promise<string[]> {
  const files = await readMarkdownFiles(PROJECTS_DIR);
  return files.map(stripMarkdownExtension);
}

export async function getAllProjects(): Promise<ProjectListItem[]> {
  const files = await readMarkdownFiles(PROJECTS_DIR);

  const projects = await Promise.all(
    files.map(async (fileName) => {
      const slug = stripMarkdownExtension(fileName);
      const source = await fs.readFile(path.join(PROJECTS_DIR, fileName), "utf8");
      const parsed = matter(source);
      const data = parsed.data as MatterData;

      if (!asBoolean(data.published, true)) {
        return null;
      }

      return parseProjectMeta(slug, data);
    }),
  );

  return projects
    .filter((item): item is ProjectListItem => item !== null)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return compareDateDesc(left.date, right.date);
    });
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const source = await readMarkdownFile(PROJECTS_DIR, slug);
  if (!source) {
    return null;
  }

  const parsed = matter(source);
  const data = parsed.data as MatterData;

  if (!asBoolean(data.published, true)) {
    return null;
  }

  const meta = parseProjectMeta(slug, data);
  const contentHtml = await markdownToHtml(parsed.content);

  return {
    ...meta,
    contentHtml,
  };
}

export async function getFeaturedReposConfig(): Promise<FeaturedReposConfig> {
  try {
    const source = await fs.readFile(FEATURED_REPOS_FILE, "utf8");
    const parsed = JSON.parse(source) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_FEATURED_REPOS_CONFIG;
    }

    const data = parsed as Record<string, unknown>;
    const githubUser =
      asString(data.githubUser, DEFAULT_FEATURED_REPOS_CONFIG.githubUser) ||
      DEFAULT_FEATURED_REPOS_CONFIG.githubUser;

    return {
      githubUser,
      featured: asStringArray(data.featured),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_FEATURED_REPOS_CONFIG;
    }

    console.warn("Không đọc được featured-repos.json", error);
    return DEFAULT_FEATURED_REPOS_CONFIG;
  }
}
