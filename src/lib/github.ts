import { getFeaturedReposConfig } from "@/lib/content";

const AI_KEYWORDS = [
  "ai",
  "agent",
  "gpt",
  "llm",
  "rag",
  "langchain",
  "machine learning",
  "deep learning",
  "nlp",
  "computer vision",
  "transformer",
  "openai",
  "anthropic",
  "gemini",
];

type GitHubRepoApi = {
  archived: boolean;
  description: string | null;
  fork: boolean;
  forks_count: number;
  full_name: string;
  homepage: string | null;
  html_url: string;
  language: string | null;
  name: string;
  stargazers_count: number;
  topics?: string[];
  updated_at: string;
};

export type GitHubRepo = {
  archived: boolean;
  description: string;
  fork: boolean;
  forks: number;
  fullName: string;
  homepage: string;
  language: string;
  name: string;
  stars: number;
  topics: string[];
  updatedAt: string;
  url: string;
};

function toGitHubRepo(repo: GitHubRepoApi): GitHubRepo {
  return {
    archived: repo.archived,
    description: repo.description ?? "",
    fork: repo.fork,
    forks: repo.forks_count,
    fullName: repo.full_name,
    homepage: repo.homepage ?? "",
    language: repo.language ?? "Chưa rõ",
    name: repo.name,
    stars: repo.stargazers_count,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    updatedAt: repo.updated_at,
    url: repo.html_url,
  };
}

function hasAiSignal(repo: GitHubRepo): boolean {
  const source = [repo.name, repo.description, repo.topics.join(" ")]
    .join(" ")
    .toLowerCase();

  return AI_KEYWORDS.some((keyword) => source.includes(keyword));
}

async function fetchRepositories(username: string): Promise<GitHubRepo[]> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "dungca-blog",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers },
    );

    if (!response.ok) {
      console.warn(`Không lấy được repo GitHub (${response.status})`);
      return [];
    }

    const payload = (await response.json()) as GitHubRepoApi[];
    return payload.map(toGitHubRepo);
  } catch (error) {
    console.warn("Không kết nối được GitHub API", error);
    return [];
  }
}

export function getRepositoryUrl(username: string, repoName: string): string {
  return `https://github.com/${username}/${repoName}`;
}

export async function getShowcaseRepositories(): Promise<{
  username: string;
  repositories: GitHubRepo[];
}> {
  const config = await getFeaturedReposConfig();
  const repositories = await fetchRepositories(config.githubUser);

  const featuredSet = new Set(config.featured.map((name) => name.toLowerCase()));

  const filtered = repositories
    .filter((repo) => !repo.archived)
    .filter(
      (repo) =>
        featuredSet.has(repo.name.toLowerCase()) ||
        (!repo.fork && hasAiSignal(repo)),
    )
    .sort((left, right) => {
      if (left.stars !== right.stars) {
        return right.stars - left.stars;
      }

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });

  return {
    username: config.githubUser,
    repositories: filtered,
  };
}
