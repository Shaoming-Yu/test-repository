import type {
  AuthUser,
  Cause,
  CreateIssueActionRequest,
  CreateRpdIssueRequest,
  IssueAction,
  IssueCauseEffectsResponse,
  PatternDetail,
  PatternSearchResult,
  Project,
  RpdIssue,
  Team,
  TeamInvitation,
  TeamMember,
  TokenResponse,
  UpdateIssueActionRequest,
  UpdateIssueCausesRequest,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const ACCESS_TOKEN_KEY = "rpd_access_token";

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function getAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const token = getAccessToken();

  return {
    ...(extraHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function setAccessToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/* =========================
   Auth
========================= */

export async function registerUser(payload: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthUser> {
  return fetchJson<AuthUser>(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.append("username", payload.email);
  body.append("password", payload.password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function getCurrentUser(): Promise<AuthUser> {
  return fetchJson<AuthUser>(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  });
}

/* =========================
   Teams
========================= */

export async function getTeams(): Promise<Team[]> {
  return fetchJson<Team[]>(`${API_BASE_URL}/teams`, {
    headers: getAuthHeaders(),
  });
}

export async function createTeam(payload: {
  name: string;
  description?: string;
}): Promise<Team> {
  return fetchJson<Team>(`${API_BASE_URL}/teams`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  return fetchJson<TeamMember[]>(`${API_BASE_URL}/teams/${teamId}/members`, {
    headers: getAuthHeaders(),
  });
}

export async function updateTeam(
  teamId: number,
  payload: {
    name: string;
    description?: string;
  }
): Promise<Team> {
  return fetchJson<Team>(`${API_BASE_URL}/teams/${teamId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(teamId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export async function removeTeamMember(
  teamId: number,
  userId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/teams/${teamId}/members/${userId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export async function updateTeamMemberRole(
  teamId: number,
  userId: number,
  payload: { role: "admin" | "member" }
): Promise<TeamMember> {
  return fetchJson<TeamMember>(
    `${API_BASE_URL}/teams/${teamId}/members/${userId}/role`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
}

/* =========================
   Team Invitations
========================= */

export async function getMyInvitations(): Promise<TeamInvitation[]> {
  return fetchJson<TeamInvitation[]>(`${API_BASE_URL}/team-invitations`, {
    headers: getAuthHeaders(),
  });
}

export async function inviteUserToTeam(
  teamId: number,
  payload: { invited_email: string }
): Promise<TeamInvitation> {
  return fetchJson<TeamInvitation>(
    `${API_BASE_URL}/team-invitations/teams/${teamId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }
  );
}

export async function acceptInvitation(
  invitationId: number
): Promise<TeamInvitation> {
  return fetchJson<TeamInvitation>(
    `${API_BASE_URL}/team-invitations/${invitationId}/accept`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
}

export async function declineInvitation(
  invitationId: number
): Promise<TeamInvitation> {
  return fetchJson<TeamInvitation>(
    `${API_BASE_URL}/team-invitations/${invitationId}/decline`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
}

/* =========================
   Projects
========================= */

export async function getProjects(teamId?: number): Promise<Project[]> {
  const query = teamId ? `?team_id=${teamId}` : "";
  return fetchJson<Project[]>(`${API_BASE_URL}/projects${query}`, {
    headers: getAuthHeaders(),
  });
}

export async function createProject(payload: {
  team_id: number;
  name: string;
  description?: string;
}): Promise<Project> {
  return fetchJson<Project>(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(projectId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export async function updateProject(
  projectId: number,
  payload: {
    team_id: number;
    name: string;
    description?: string;
  }
): Promise<Project> {
  return fetchJson<Project>(`${API_BASE_URL}/projects/${projectId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

/* =========================
   RpD Issues
========================= */

export async function getRpdIssues(projectId?: number): Promise<RpdIssue[]> {
  const query = projectId ? `?project_id=${projectId}` : "";
  return fetchJson<RpdIssue[]>(`${API_BASE_URL}/rpd-issues/${query}`);
}

export async function createRpdIssue(
  payload: CreateRpdIssueRequest
): Promise<RpdIssue> {
  return fetchJson<RpdIssue>(`${API_BASE_URL}/rpd-issues`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRpdIssue(issueId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rpd-issues/${issueId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

export async function updateRpdIssue(
  issueId: number,
  payload: {
    category: string;
    description: string;
    status: string;
    owner?: string | null;
    review_date?: string | null;
  }
): Promise<RpdIssue> {
  return fetchJson<RpdIssue>(`${API_BASE_URL}/rpd-issues/${issueId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateIssuePattern(
  issueId: number,
  payload: { selected_pattern_id: number | null }
): Promise<RpdIssue> {
  return fetchJson<RpdIssue>(`${API_BASE_URL}/rpd-issues/${issueId}/pattern`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getIssueActions(issueId: number): Promise<IssueAction[]> {
  return fetchJson<IssueAction[]>(`${API_BASE_URL}/rpd-issues/${issueId}/actions`);
}

export async function createIssueAction(
  issueId: number,
  payload: CreateIssueActionRequest
): Promise<IssueAction> {
  return fetchJson<IssueAction>(`${API_BASE_URL}/rpd-issues/${issueId}/actions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIssueAction(
  issueId: number,
  issueActionId: number,
  payload: UpdateIssueActionRequest
): Promise<IssueAction> {
  return fetchJson<IssueAction>(
    `${API_BASE_URL}/rpd-issues/${issueId}/actions/${issueActionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteIssueAction(
  issueId: number,
  issueActionId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/rpd-issues/${issueId}/actions/${issueActionId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }
}

/* =========================
   Patterns
========================= */

export async function getPatterns(params: {
  category?: string;
  q?: string;
  limit?: number;
}): Promise<PatternSearchResult[]> {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return fetchJson<PatternSearchResult[]>(
    `${API_BASE_URL}/patterns/${query ? `?${query}` : ""}`
  );
}

export async function getPatternDetail(
  patternId: number
): Promise<PatternDetail> {
  return fetchJson<PatternDetail>(`${API_BASE_URL}/patterns/${patternId}`);
}

/* =========================
   Causes / Effects / Risk
========================= */

export async function getCausesByCategory(category: string): Promise<Cause[]> {
  const encodedCategory = encodeURIComponent(category);
  return fetchJson<Cause[]>(
    `${API_BASE_URL}/causes?category=${encodedCategory}`
  );
}

export async function getIssueCauseEffects(
  issueId: number
): Promise<IssueCauseEffectsResponse> {
  return fetchJson<IssueCauseEffectsResponse>(
    `${API_BASE_URL}/rpd-issues/${issueId}/cause-effects`
  );
}

export async function updateIssueCauses(
  issueId: number,
  payload: UpdateIssueCausesRequest
): Promise<IssueCauseEffectsResponse> {
  return fetchJson<IssueCauseEffectsResponse>(
    `${API_BASE_URL}/rpd-issues/${issueId}/causes`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function getIssueRiskScore(issueId: number): Promise<{
  issue_id: number;
  raw_risk_score: number;
  normalized_risk_score: number;
  risk_level: string;
  included_causes: number;
  included_effects: number;
}> {
  return fetchJson(`${API_BASE_URL}/risk/issues/${issueId}`);
}