export type RpdIssueCategory =
  | "Data-Centric"
  | "Code-Centric"
  | "Documentation-Centric"
  | "Human-Centric"
  | "Tool-Centric"
  | "Version-Centric"
  | "Legal Issues";

export type RpdIssueStatus =
  | "Open"
  | "Mitigating"
  | "Reduced"
  | "Accepted";

export type AuthUser = {
  user_id: number;
  email: string;
  name: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type Team = {
  team_id: number;
  name: string;
  description: string | null;
  created_by: number | null;
};

export type TeamInvitation = {
  invitation_id: number;
  team_id: number;
  team_name: string;
  invited_email: string;
  invited_by: number | null;
  status: string;
};

export type TeamMember = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export type Project = {
  project_id: number;
  team_id: number;
  name: string;
  description: string | null;
  created_by: number | null;
};

export type PatternSearchResult = {
  pattern_id: number;
  pattern_code: string;
  category: RpdIssueCategory;
  name: string;
  cause_summary: string | null;
};

export type PatternRecommendation = {
  strategy_id: number;
  strategy_code: string;
  recommendation: string;
};

export type PatternDetail = {
  pattern_id: number;
  pattern_code: string;
  category: RpdIssueCategory;
  name: string;
  cause_summary: string | null;
  cause_count: number;
  effect_count: number;
  why_this_matters: string[];
  recommendations: PatternRecommendation[];
};

export type RpdIssue = {
  issue_id: number;
  project_id: number;
  category: RpdIssueCategory;
  description: string;
  status: RpdIssueStatus;
  owner: string;
  review_date: string;
  selected_pattern_id: number | null;
};

export type IssueActionStatus = "pending" | "in_progress" | "done";

export type IssueActionSource = "recommended" | "custom";

export type IssueAction = {
  issue_action_id: number;
  issue_id: number;
  strategy_id: number | null;
  action_text: string;
  source: IssueActionSource;
  status: IssueActionStatus;
  sort_order: number;
  created_at: string;
};

export type CreateIssueActionRequest = {
  strategy_id?: number | null;
  action_text: string;
  source?: IssueActionSource;
  status?: IssueActionStatus;
  sort_order?: number;
};

export type UpdateIssueActionRequest = {
  action_text?: string;
  status?: IssueActionStatus;
  sort_order?: number;
};

export type Cause = {
  cause_id: number;
  category: RpdIssueCategory;
  description: string | null;
  p_c: number;
};

export type Effect = {
  effect_id: number;
  description: string | null;
  p_e_given_c: number;
  severity: number;
};

export type CauseWithEffects = {
  cause_id: number;
  description: string | null;
  effects: Effect[];
};

export type IssueCauseEffectsResponse = {
  issue_id: number;
  causes: CauseWithEffects[];
};

export type UpdateIssueCausesRequest = {
  cause_ids: number[];
};

export type CreateRpdIssueRequest = {
  project_id: number;
  category: RpdIssueCategory;
  description: string;
  status?: RpdIssueStatus;
  owner?: string;
  review_date?: string;
};