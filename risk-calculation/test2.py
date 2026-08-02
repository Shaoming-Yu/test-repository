"""
RpD-Manager: Reproducibility Debt Risk Calculation Model
=========================================================
Implements the full risk model as described in:
  "Reproducibility Debt (RpD) — Risk Calculation Guide"

Model Overview:
  Risk(issue) = Σ P(C) × P(E|C) × Severity(E)
  NormalizedRisk = Risk(issue) / MaxPossibleRisk × 100

Severity scale: 1–10 (see SeverityLevel enum)
Risk bands:     Low (0–30), Medium (30–60), High (60–100)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional
import math


# ---------------------------------------------------------------------------
# 1.  Severity Scale (1–10)
# ---------------------------------------------------------------------------

class SeverityLevel(IntEnum):
    """
    RpD Severity Scale — maps numeric levels to descriptive labels.
    Higher values indicate greater threat to scientific reproducibility.
    """
    NEGLIGIBLE_IMPACT = 1  # No meaningful effect on reproducibility
    COSMETIC_GAP = 2  # Trivial structural / documentation issues
    MINOR_STRUCTURAL_WEAKNESS = 3  # Small organisational / process inefficiencies
    OPERATIONAL_FRICTION = 4  # Delays or learning overhead; validity intact
    STRUCTURED_FRICTION = 5  # Moderate inefficiencies; feasible reproduction
    SIGNIFICANT_REWORK = 6  # Considerable effort needed; conclusions intact
    MAJOR_BREAKDOWN = 7  # Substantial reverse engineering required
    SEVERE_FAILURE = 8  # Major reconstruction needed; fragile verification
    CRITICAL_EPISTEMIC_RISK = 9  # High probability results change under replication
    SCIENTIFIC_INVALIDITY = 10  # Independent verification impossible

    @property
    def label(self) -> str:
        return {
            1: "Negligible Impact",
            2: "Cosmetic Gap",
            3: "Minor Structural Weakness",
            4: "Operational Friction",
            5: "Structured Reproducibility Friction",
            6: "Significant Rework",
            7: "Major Reproduction Breakdown",
            8: "Severe Reproducibility Failure",
            9: "Critical Epistemic Risk",
            10: "Scientific Invalidity",
        }[self.value]


# ---------------------------------------------------------------------------
# 2.  Core Data Structures
# ---------------------------------------------------------------------------

@dataclass
class Cause:
    """
    A root cause of reproducibility debt.

    Attributes
    ----------
    cause_id  : Identifier such as 'C1', 'C42', etc.
    name      : Human-readable description.
    p_occurs  : Probability that this cause occurs (0.0 – 1.0).
    """
    cause_id: str
    name: str
    p_occurs: float

    def __post_init__(self) -> None:
        if not 0.0 <= self.p_occurs <= 1.0:
            raise ValueError(
                f"[{self.cause_id}] p_occurs must be in [0, 1], got {self.p_occurs}"
            )


@dataclass
class Effect:
    """
    An observable outcome of a reproducibility debt cause.

    Attributes
    ----------
    effect_id   : Identifier such as 'E1', 'E99', etc.
    name        : Human-readable description.
    severity    : Impact level (SeverityLevel or plain int 1–10).
    p_given_cause : Mapping {cause_id: P(E|C)} — conditional probability
                    that this effect occurs given a specific cause.
    """
    effect_id: str
    name: str
    severity: int  # 1–10
    p_given_cause: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 1 <= self.severity <= 10:
            raise ValueError(
                f"[{self.effect_id}] severity must be in [1, 10], got {self.severity}"
            )
        for cid, p in self.p_given_cause.items():
            if not 0.0 <= p <= 1.0:
                raise ValueError(
                    f"[{self.effect_id}] p_given_cause[{cid}] must be in [0, 1], got {p}"
                )


@dataclass
class RpDItem:
    """
    A single Reproducibility Debt item (issue) being assessed.

    Attributes
    ----------
    item_id     : Unique identifier for this RpD item.
    description : Free-text description of the issue.
    causes      : List of Cause objects linked to this item.
    effects     : List of Effect objects linked to this item.
    """
    item_id: str
    description: str
    causes: list[Cause] = field(default_factory=list)
    effects: list[Effect] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 3.  Risk Calculation
# ---------------------------------------------------------------------------

@dataclass
class RiskContribution:
    """Stores one P(C) × P(E|C) × Severity(E) term for audit / explainability."""
    cause_id: str
    effect_id: str
    p_cause: float
    p_eff_given_cause: float
    severity: int
    contribution: float  # = p_cause × p_eff_given_cause × severity


@dataclass
class RiskResult:
    """Complete risk assessment result for one RpDItem."""
    item_id: str
    raw_risk: float
    max_possible_risk: float
    normalized_risk: float  # 0–100
    risk_band: str  # 'Low' | 'Medium' | 'High'
    contributions: list[RiskContribution]

    # ---- pretty print -------------------------------------------------------
    def summary(self) -> str:
        lines = [
            f"{'=' * 60}",
            f"RpD Item  : {self.item_id}",
            f"Raw Risk  : {self.raw_risk:.4f}",
            f"Max Risk  : {self.max_possible_risk:.4f}",
            f"Norm Risk : {self.normalized_risk:.2f} / 100",
            f"Band      : {self.risk_band}",
            f"{'─' * 60}",
            f"{'Cause':<6} {'Effect':<8} {'P(C)':>6} {'P(E|C)':>8} {'Sev':>4} {'Contrib':>10}",
            f"{'─' * 60}",
        ]
        for c in sorted(self.contributions, key=lambda x: -x.contribution):
            lines.append(
                f"{c.cause_id:<6} {c.effect_id:<8} {c.p_cause:>6.3f} "
                f"{c.p_eff_given_cause:>8.3f} {c.severity:>4} {c.contribution:>10.4f}"
            )
        lines.append(f"{'=' * 60}")
        return "\n".join(lines)


def compute_max_possible_risk(causes: list[Cause], effects: list[Effect]) -> float:
    """
    Theoretical maximum risk for a set of causes and effects.

    MaxPossibleRisk = Σ_{E} Σ_{C linked to E} 1 × 1 × 10
                    = (number of cause–effect links) × 10

    Here we derive it from the actual cause–effect pairs that exist in
    the provided Effect.p_given_cause mappings, so the normalisation
    denominator reflects only the combinations actually modelled.
    """
    cause_ids = {c.cause_id for c in causes}
    total_links = sum(
        1 for e in effects
        for cid in e.p_given_cause
        if cid in cause_ids
    )
    return total_links * 10.0 if total_links > 0 else 1.0  # avoid /0


def classify_risk_band(normalized_risk: float) -> str:
    """
    Maps a 0–100 normalised risk score to a band label.

    0  – 30  → Low
    30 – 60  → Medium
    60 – 100 → High
    """
    if normalized_risk < 30:
        return "Low"
    elif normalized_risk < 60:
        return "Medium"
    else:
        return "High"


def calculate_risk(item: RpDItem) -> RiskResult:
    """
    Core risk calculation for a single RpDItem.

    Formula
    -------
    Risk(issue) = Σ_{C} Σ_{E linked to C} P(C) × P(E|C) × Severity(E)

    Steps
    1. Build a lookup of cause_id → Cause.
    2. For every Effect, iterate over its cause-specific probabilities.
    3. If the cause belongs to this item, accumulate the contribution.
    4. Normalise and classify.

    Returns
    -------
    RiskResult with raw score, normalised score, band, and full contribution list.
    """
    cause_map: dict[str, Cause] = {c.cause_id: c for c in item.causes}

    contributions: list[RiskContribution] = []
    raw_risk = 0.0

    for effect in item.effects:
        for cause_id, p_eff_given_cause in effect.p_given_cause.items():
            if cause_id not in cause_map:
                # This effect is linked to a cause not in this item — skip
                continue
            cause = cause_map[cause_id]
            contrib = cause.p_occurs * p_eff_given_cause * effect.severity
            raw_risk += contrib
            contributions.append(
                RiskContribution(
                    cause_id=cause_id,
                    effect_id=effect.effect_id,
                    p_cause=cause.p_occurs,
                    p_eff_given_cause=p_eff_given_cause,
                    severity=effect.severity,
                    contribution=contrib,
                )
            )

    max_risk = compute_max_possible_risk(item.causes, item.effects)
    normalized = (raw_risk / max_risk) * 100.0
    normalized = min(normalized, 100.0)  # clamp to [0, 100]

    return RiskResult(
        item_id=item.item_id,
        raw_risk=raw_risk,
        max_possible_risk=max_risk,
        normalized_risk=normalized,
        risk_band=classify_risk_band(normalized),
        contributions=contributions,
    )


# ---------------------------------------------------------------------------
# 4.  Batch Assessment
# ---------------------------------------------------------------------------

def assess_portfolio(items: list[RpDItem]) -> list[RiskResult]:
    """
    Compute risk for every RpDItem in a project portfolio and return
    results sorted from highest to lowest normalised risk.
    """
    results = [calculate_risk(item) for item in items]
    results.sort(key=lambda r: -r.normalized_risk)
    return results


def portfolio_summary(results: list[RiskResult]) -> str:
    """Return a tabular summary of a portfolio assessment."""
    header = f"\n{'Item':<20} {'Raw Risk':>10} {'Norm Risk':>10} {'Band':<10}"
    sep = "─" * len(header)
    lines = [sep, header, sep]
    for r in results:
        lines.append(
            f"{r.item_id:<20} {r.raw_risk:>10.4f} {r.normalized_risk:>9.2f}%"
            f"  {r.risk_band:<10}"
        )
    lines.append(sep)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 5.  Demonstration / Worked Examples
# ---------------------------------------------------------------------------

def _run_worked_examples() -> None:
    """
    Reproduces the three worked examples from the RpD Risk Calculation Guide
    and adds a richer multi-item portfolio scenario.
    """

    print("\n" + "=" * 60)
    print("  RpD Risk Calculation — Worked Examples")
    print("=" * 60)

    # ── Example A: one cause, one effect ──────────────────────────────────
    # Expected: 0.82 × 0.45 × 3 = 1.107
    item_a = RpDItem(
        item_id="ExampleA",
        description="One cause, one effect",
        causes=[Cause("C1", "Undocumented environment dependencies", p_occurs=0.82)],
        effects=[Effect("E1", "Experiment cannot be re-run", severity=3,
                        p_given_cause={"C1": 0.45})],
    )
    result_a = calculate_risk(item_a)
    print(result_a.summary())
    assert math.isclose(result_a.raw_risk, 1.107, rel_tol=1e-4), result_a.raw_risk

    # ── Example B: one cause, two effects ─────────────────────────────────
    # Expected: (0.85×0.56×3) + (0.85×0.45×3) = 1.428 + 1.1475 = 2.5755 ≈ 2.58
    item_b = RpDItem(
        item_id="ExampleB",
        description="One cause, two effects",
        causes=[Cause("C2", "Missing random seed management", p_occurs=0.85)],
        effects=[
            Effect("E2", "Results differ across runs", severity=3,
                   p_given_cause={"C2": 0.56}),
            Effect("E3", "Publication findings unverifiable", severity=3,
                   p_given_cause={"C2": 0.45}),
        ],
    )
    result_b = calculate_risk(item_b)
    print(result_b.summary())
    assert math.isclose(result_b.raw_risk, 2.5755, rel_tol=1e-3), result_b.raw_risk

    # ── Example C: two causes, one shared effect ───────────────────────────
    # Expected: (0.80×0.60×5) + (0.40×0.70×5) = 2.4 + 1.4 = 3.8
    item_c = RpDItem(
        item_id="ExampleC",
        description="Two causes, one effect",
        causes=[
            Cause("C3", "Hardcoded file paths", p_occurs=0.80),
            Cause("C4", "No containerisation used", p_occurs=0.40),
        ],
        effects=[
            Effect("E4", "Software fails on new machine", severity=5,
                   p_given_cause={"C3": 0.60, "C4": 0.70}),
        ],
    )
    result_c = calculate_risk(item_c)
    print(result_c.summary())
    assert math.isclose(result_c.raw_risk, 3.8, rel_tol=1e-4), result_c.raw_risk

    # ── Portfolio scenario: multi-item project ────────────────────────────
    portfolio = [
        RpDItem(
            item_id="RpD-001 Environment",
            description="No Docker / virtual-env specification",
            causes=[
                Cause("C10", "No containerisation", p_occurs=0.75),
                Cause("C11", "Undocumented dependencies", p_occurs=0.60),
            ],
            effects=[
                Effect("E10", "Setup failure on new system", severity=8,
                       p_given_cause={"C10": 0.80, "C11": 0.55}),
                Effect("E11", "Version mismatch causes wrong output", severity=9,
                       p_given_cause={"C10": 0.50, "C11": 0.65}),
            ],
        ),
        RpDItem(
            item_id="RpD-002 Data",
            description="Raw data not archived; preprocessing undocumented",
            causes=[
                Cause("C20", "No data versioning", p_occurs=0.65),
                Cause("C21", "Missing preprocessing docs", p_occurs=0.70),
            ],
            effects=[
                Effect("E20", "Cannot reproduce input dataset", severity=7,
                       p_given_cause={"C20": 0.90, "C21": 0.40}),
                Effect("E21", "Pipeline outputs differ", severity=6,
                       p_given_cause={"C20": 0.35, "C21": 0.80}),
            ],
        ),
        RpDItem(
            item_id="RpD-003 Code",
            description="Notebooks with hidden state; no unit tests",
            causes=[
                Cause("C30", "Jupyter notebook execution order", p_occurs=0.55),
                Cause("C31", "No automated tests", p_occurs=0.80),
            ],
            effects=[
                Effect("E30", "Silent incorrect results", severity=10,
                       p_given_cause={"C30": 0.70, "C31": 0.60}),
                Effect("E31", "Regression undetected", severity=5,
                       p_given_cause={"C30": 0.30, "C31": 0.75}),
            ],
        ),
        RpDItem(
            item_id="RpD-004 Docs",
            description="README missing; parameter choices unexplained",
            causes=[
                Cause("C40", "No README", p_occurs=0.40),
                Cause("C41", "Undocumented hyperparameters", p_occurs=0.50),
            ],
            effects=[
                Effect("E40", "Researcher cannot replicate workflow", severity=4,
                       p_given_cause={"C40": 0.70, "C41": 0.50}),
                Effect("E41", "Wrong parameters used", severity=3,
                       p_given_cause={"C40": 0.20, "C41": 0.60}),
            ],
        ),
    ]

    results = assess_portfolio(portfolio)
    print("\n  Portfolio Assessment (sorted by risk)\n")
    print(portfolio_summary(results))
    for r in results:
        print(r.summary())


# ---------------------------------------------------------------------------
# 6.  Public API convenience wrapper
# ---------------------------------------------------------------------------

def evaluate_rpd_item(
        item_id: str,
        description: str,
        causes_data: list[dict],
        effects_data: list[dict],
) -> RiskResult:
    """
    Convenience function for programmatic use without constructing
    dataclass instances manually.

    Parameters
    ----------
    item_id      : Unique string identifier.
    description  : Free-text description of the debt item.
    causes_data  : List of dicts with keys:
                     cause_id (str), name (str), p_occurs (float)
    effects_data : List of dicts with keys:
                     effect_id (str), name (str), severity (int 1-10),
                     p_given_cause (dict {cause_id: float})

    Returns
    -------
    RiskResult

    Example
    -------
    >>> result = evaluate_rpd_item(
    ...     item_id="RpD-X",
    ...     description="My debt item",
    ...     causes_data=[{"cause_id": "C1", "name": "No versioning", "p_occurs": 0.7}],
    ...     effects_data=[{"effect_id": "E1", "name": "Data lost",
    ...                    "severity": 8, "p_given_cause": {"C1": 0.9}}],
    ... )
    >>> print(result.summary())
    """
    causes = [Cause(**d) for d in causes_data]
    effects = [Effect(**d) for d in effects_data]
    item = RpDItem(item_id=item_id, description=description,
                   causes=causes, effects=effects)
    return calculate_risk(item)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    _run_worked_examples()