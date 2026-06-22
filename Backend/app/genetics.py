# Backend/app/genetics.py: contains backend logic for the Animal Breed Registry System.
"""
Genetic computation module for the Animal Breed Registry System.

Implements:
  1. Wright's Coefficient of Inbreeding (COI) — industry-standard formula
     used by livestock registries worldwide.
  2. Breeding Pair Recommendation Engine — ranks available sires by projected
     offspring COI plus normalized performance, health, fertility, offspring,
     breeding-outcome history, and confidence data.
  3. Gestation-based due-date calculation with species-specific periods.
"""

from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from . import models

@dataclass

# Defines the animal breeding profile structure used by this module.
class AnimalBreedingProfile:
    """
    Read-model used by the genetics engine.

    The Animal table remains the identity source, while mutable values are pulled
    from normalized history tables. Animal columns are kept as a compatibility
    fallback for existing deployments and older records.
    """

    animal: Any
    birth_weight: Optional[float] = None
    current_weight: Optional[float] = None
    weaning_weight: Optional[float] = None
    mature_weight: Optional[float] = None
    body_condition_score: Optional[float] = None
    average_daily_gain: Optional[float] = None
    health_status: Optional[str] = None
    vaccination_status: Optional[str] = None
    disease_history: Optional[str] = None
    hereditary_conditions: Optional[str] = None
    vet_notes: Optional[str] = None
    fertility_status: Optional[str] = None
    age_at_first_service_months: Optional[float] = None
    services_per_conception: Optional[float] = None
    birth_interval_days: Optional[float] = None
    offspring_count: Optional[int] = None
    offspring_survival_rate: Optional[float] = None
    offspring_quality_score: Optional[float] = None
    production_type: Optional[str] = None
    daily_milk_yield: Optional[float] = None
    milk_fat_percent: Optional[float] = None
    egg_count_annual: Optional[int] = None
    failed_breedings: int = 0
    successful_breedings: int = 0
    last_breeding_status: Optional[str] = None
    last_breeding_outcome: Optional[str] = None
    data_sources: List[str] = field(default_factory=list)

    # Internal helper for getattr.
    def __getattr__(self, name: str) -> Any:
        return getattr(self.animal, name)

# Internal helper for latest record.
def _latest_record(db: Session, model: Any, animal_id: int, date_column: str = "record_date") -> Any:
    """Return newest normalized record for an animal, or None."""

    column = getattr(model, date_column)
    return (
        db.query(model)
        .filter(model.animal_id == animal_id)
        .order_by(column.desc(), model.id.desc())
        .first()
    )

# Internal helper for value or fallback.
def _value_or_fallback(value: Any, fallback: Any) -> Any:
    return fallback if value is None else value

# Handles build animal breeding profile logic for this module.
def build_animal_breeding_profile(animal: models.Animal, db: Optional[Session] = None) -> AnimalBreedingProfile:
    """
    Build the scoring read-model from normalized tables.

    Priority order:
    1. Latest normalized history record.
    2. Backward-compatible value stored directly on animals.
    3. None, which lowers confidence but does not break scoring.
    """

    profile = AnimalBreedingProfile(
        animal=animal,
        birth_weight=getattr(animal, "birth_weight", None),
        current_weight=getattr(animal, "current_weight", None),
        weaning_weight=getattr(animal, "weaning_weight", None),
        mature_weight=getattr(animal, "mature_weight", None),
        body_condition_score=getattr(animal, "body_condition_score", None),
        average_daily_gain=getattr(animal, "average_daily_gain", None),
        health_status=getattr(animal, "health_status", None),
        vaccination_status=getattr(animal, "vaccination_status", None),
        disease_history=getattr(animal, "disease_history", None),
        hereditary_conditions=getattr(animal, "hereditary_conditions", None),
        vet_notes=getattr(animal, "vet_notes", None),
        fertility_status=getattr(animal, "fertility_status", None),
        age_at_first_service_months=getattr(animal, "age_at_first_service_months", None),
        services_per_conception=getattr(animal, "services_per_conception", None),
        birth_interval_days=getattr(animal, "birth_interval_days", None),
        offspring_count=getattr(animal, "offspring_count", None),
        offspring_survival_rate=getattr(animal, "offspring_survival_rate", None),
        offspring_quality_score=getattr(animal, "offspring_quality_score", None),
        production_type=getattr(animal, "production_type", None),
        daily_milk_yield=getattr(animal, "daily_milk_yield", None),
        milk_fat_percent=getattr(animal, "milk_fat_percent", None),
        egg_count_annual=getattr(animal, "egg_count_annual", None),
        data_sources=["animals_legacy_fields"],
    )

    if db is None:
        return profile

    measurement = (
        db.query(models.AnimalMeasurement)
        .filter(models.AnimalMeasurement.animal_id == animal.id)
        .order_by(models.AnimalMeasurement.measured_at.desc(), models.AnimalMeasurement.id.desc())
        .first()
    )

    if measurement:
        if (measurement.measurement_type or "weight").lower() == "weight":
            profile.current_weight = measurement.value

        profile.data_sources.append("animal_measurements")

    health = _latest_record(db, models.AnimalHealthRecord, animal.id)

    if health:
        profile.health_status = _value_or_fallback(health.health_status, profile.health_status)
        profile.vaccination_status = _value_or_fallback(health.vaccination_status, profile.vaccination_status)
        profile.disease_history = _value_or_fallback(health.disease_history, profile.disease_history)
        profile.hereditary_conditions = _value_or_fallback(health.hereditary_conditions, profile.hereditary_conditions)
        profile.vet_notes = _value_or_fallback(health.vet_notes, profile.vet_notes)
        profile.data_sources.append("animal_health_records")

    fertility = _latest_record(db, models.AnimalFertilityRecord, animal.id)

    if fertility:
        profile.fertility_status = _value_or_fallback(fertility.fertility_status, profile.fertility_status)
        profile.age_at_first_service_months = _value_or_fallback(fertility.age_at_first_service_months, profile.age_at_first_service_months)
        profile.services_per_conception = _value_or_fallback(fertility.services_per_conception, profile.services_per_conception)
        profile.birth_interval_days = _value_or_fallback(fertility.birth_interval_days, profile.birth_interval_days)
        profile.data_sources.append("animal_fertility_records")

    production = _latest_record(db, models.AnimalProductionRecord, animal.id)

    if production:
        profile.production_type = _value_or_fallback(production.production_type, profile.production_type)
        profile.daily_milk_yield = _value_or_fallback(production.daily_milk_yield, profile.daily_milk_yield)
        profile.milk_fat_percent = _value_or_fallback(production.milk_fat_percent, profile.milk_fat_percent)
        profile.egg_count_annual = _value_or_fallback(production.egg_count_annual, profile.egg_count_annual)
        profile.average_daily_gain = _value_or_fallback(production.average_daily_gain, profile.average_daily_gain)
        profile.data_sources.append("animal_production_records")

    offspring = _latest_record(db, models.AnimalOffspringRecord, animal.id)

    if offspring:
        profile.offspring_count = _value_or_fallback(offspring.offspring_count, profile.offspring_count)
        profile.offspring_survival_rate = _value_or_fallback(offspring.offspring_survival_rate, profile.offspring_survival_rate)
        profile.offspring_quality_score = _value_or_fallback(offspring.offspring_quality_score, profile.offspring_quality_score)
        profile.data_sources.append("animal_offspring_records")

    breeding_events = (
        db.query(models.BreedingEvent)
        .filter((models.BreedingEvent.sire_id == animal.id) | (models.BreedingEvent.dam_id == animal.id))
        .order_by(models.BreedingEvent.breeding_date.desc(), models.BreedingEvent.id.desc())
        .all()
    )

    if breeding_events:
        profile.last_breeding_status = breeding_events[0].status
        profile.last_breeding_outcome = breeding_events[0].outcome
        failure_outcomes = {"failed_conception", "miscarriage", "stillbirth", "abortion", "failed"}
        success_outcomes = {"live_birth", "successful", "delivered"}
        profile.failed_breedings = sum(1 for event in breeding_events if (event.outcome or event.status or "").lower() in failure_outcomes)
        profile.successful_breedings = sum(1 for event in breeding_events if (event.outcome or event.status or "").lower() in success_outcomes)
        profile.data_sources.append("breeding_events")
    return profile

GESTATION_DAYS: Dict[str, int] = {
    "cattle":  283,
    "sheep":   147,
    "goat":    150,
    "pig":     114,
    "horse":   340,
    "dog":      63,
    "poultry":  21,
    "other":   200,
}

# Retrieves gestation days records from the database.
def get_gestation_days(animal_type: str) -> int:
    return GESTATION_DAYS.get(animal_type.lower(), 200)

# Handles build pedigree graph logic for this module.
def build_pedigree_graph(
    db: Session,
    root_id: int,
    max_depth: int = 8,

) -> Dict[int, Tuple[Optional[int], Optional[int]]]:
    """
    Walk the pedigree tree upward from `root_id` up to `max_depth` generations.
    Returns {animal_db_id: (sire_db_id | None, dam_db_id | None)}.
    Uses BFS to avoid recursion limits on deep pedigrees.
    """

    graph: Dict[int, Tuple[Optional[int], Optional[int]]] = {}
    queue = [(root_id, 0)]
    visited: set = set()

    while queue:
        animal_id, depth = queue.pop(0)

        if animal_id in visited or depth > max_depth:
            continue

        visited.add(animal_id)

        animal = db.query(models.Animal).filter(models.Animal.id == animal_id).first()

        if not animal:
            continue

        graph[animal_id] = (animal.sire_id, animal.dam_id)

        if depth < max_depth:
            if animal.sire_id:
                queue.append((animal.sire_id, depth + 1))

            if animal.dam_id:
                queue.append((animal.dam_id, depth + 1))
    return graph

# Internal helper for get ancestors with paths.
def _get_ancestors_with_paths(
    animal_id: Optional[int],
    graph: Dict[int, Tuple[Optional[int], Optional[int]]],
    depth: int = 0,
    max_depth: int = 8,

) -> Dict[int, List[int]]:
    """
    Recursively collect ancestors of `animal_id`.
    Returns {ancestor_id: [list of path lengths to this ancestor]}.
    Multiple paths to the same ancestor indicate a common ancestor — the
    key ingredient for computing the inbreeding coefficient.
    """

    if animal_id is None or depth > max_depth:
        return {}

    result: Dict[int, List[int]] = defaultdict(list)

    result[animal_id].append(depth)

    parents = graph.get(animal_id)

    if not parents:
        return result

    sire_id, dam_id = parents

    for parent_id in (sire_id, dam_id):
        if parent_id is None:
            continue

        for ancestor, paths in _get_ancestors_with_paths(parent_id, graph, depth + 1, max_depth).items():
            result[ancestor].extend(paths)
    return result

# Calculates inbreeding coefficient for the requested data.
def compute_inbreeding_coefficient(
    sire_id: int,
    dam_id: int,
    db: Session,
    max_depth: int = 8,
) -> float:
    """
    Calculate Wright's Coefficient of Inbreeding (F) for a hypothetical
    offspring of `sire_id` × `dam_id`.

    Formula:  F = Σ [ (0.5)^(L1 + L2 + 1) × (1 + F_A) ]
    where the sum is over all common ancestors A, L1 is the number of
    generations from the sire to A, L2 from the dam to A, and F_A is
    the inbreeding coefficient of ancestor A (assumed 0 for simplicity
    beyond max_depth).

    Returns a value in [0.0, 1.0].  Multiply by 100 for a percentage.
    """

    sire_graph = build_pedigree_graph(db, sire_id, max_depth)
    dam_graph = build_pedigree_graph(db, dam_id,  max_depth)
    sire_ancestors = _get_ancestors_with_paths(sire_id, sire_graph, 0, max_depth)
    dam_ancestors = _get_ancestors_with_paths(dam_id,  dam_graph,  0, max_depth)
    common = set(sire_ancestors.keys()) & set(dam_ancestors.keys())

    F = 0.0

    for ancestor_id in common:
        sire_paths = sire_ancestors[ancestor_id]
        dam_paths = dam_ancestors[ancestor_id]

        for l1 in sire_paths:
            for l2 in dam_paths:
                F += (0.5) ** (l1 + l2 + 1)
    return round(min(F, 1.0), 6)

# Handles analyze pedigree completeness logic for this module.
def analyze_pedigree_completeness(
    animal_id: int,
    db: Session,
    max_depth: int = 4,

) -> Dict[str, Any]:
    """
    Estimate how complete the recorded pedigree is up to `max_depth`.

    COI is only as reliable as the recorded parentage. Missing ancestors can
    make a pairing look less related than it really is, so this helper returns
    a conservative warning that can be shown in the UI.
    """

    if not animal_id:
        return {
            "generations_requested": max_depth,
            "generations_available": 0,
            "known_ancestor_slots": 0,
            "expected_ancestor_slots": sum(2 ** generation for generation in range(1, max_depth + 1)),
            "completeness_percent": 0.0,
            "missing_ancestor_slots": sum(2 ** generation for generation in range(1, max_depth + 1)),
            "warning": "No animal selected; pedigree completeness cannot be assessed.",
        }

    known_slots = 0
    expected_slots = 0
    missing_slots = 0
    deepest_generation = 0
    queue = [(animal_id, 0)]

    while queue:
        current_id, generation = queue.pop(0)

        if generation >= max_depth:
            continue

        animal = db.query(models.Animal).filter(models.Animal.id == current_id).first()

        if not animal:
            continue

        next_generation = generation + 1

        for parent_id in (animal.sire_id, animal.dam_id):
            expected_slots += 1

            if parent_id:
                known_slots += 1
                deepest_generation = max(deepest_generation, next_generation)
                queue.append((parent_id, next_generation))

            else:
                missing_slots += 1

    completeness = (known_slots / expected_slots) if expected_slots else 0.0

    warning = None

    if completeness < 0.50:
        warning = "Pedigree depth is limited; projected COI may be underestimated."

    elif completeness < 0.80:
        warning = "Some ancestors are missing; interpret projected COI with caution."
    return {
        "generations_requested": max_depth,
        "generations_available": deepest_generation,
        "known_ancestor_slots": known_slots,
        "expected_ancestor_slots": expected_slots,
        "completeness_percent": round(completeness * 100, 1),
        "missing_ancestor_slots": missing_slots,
        "warning": warning,
    }

# Handles combine pedigree completeness logic for this module.
def combine_pedigree_completeness(
    sire_id: int,
    dam_id: int,
    db: Session,
    max_depth: int = 8,

) -> Dict[str, Any]:
    """Return pair-level pedigree completeness for a proposed mating."""

    sire = analyze_pedigree_completeness(sire_id, db, max_depth=max_depth)
    dam = analyze_pedigree_completeness(dam_id, db, max_depth=max_depth)
    expected = sire["expected_ancestor_slots"] + dam["expected_ancestor_slots"]
    known = sire["known_ancestor_slots"] + dam["known_ancestor_slots"]
    missing = sire["missing_ancestor_slots"] + dam["missing_ancestor_slots"]
    completeness = (known / expected) if expected else 0.0
    warnings = [w for w in (sire.get("warning"), dam.get("warning")) if w]
    pair_warning = None

    if completeness < 0.50:
        pair_warning = "Pedigree depth is limited; projected COI may be underestimated."

    elif completeness < 0.80:
        pair_warning = "Some ancestors are missing; interpret projected COI with caution."

    if pair_warning and pair_warning not in warnings:
        warnings.insert(0, pair_warning)
    return {
        "generations_requested": max_depth,
        "generations_available": min(sire["generations_available"], dam["generations_available"]),
        "known_ancestor_slots": known,
        "expected_ancestor_slots": expected,
        "completeness_percent": round(completeness * 100, 1),
        "missing_ancestor_slots": missing,
        "sire": sire,
        "dam": dam,
        "warnings": warnings,
    }

# Handles classify coi logic for this module.
def classify_coi(coi: float) -> dict:
    """
    Map a COI value to a plain-language risk category.
    Thresholds are based on standard livestock breeding guidelines.
    """

    pct = coi * 100

    if pct < 1.0:
        return {"level": "Excellent", "color": "#059669", "description": "No detectable inbreeding. Ideal pairing."}

    elif pct < 3.125:
        return {"level": "Good",      "color": "#16a34a", "description": "Very low inbreeding. Equivalent to 4th-degree relatives."}

    elif pct < 6.25:
        return {"level": "Moderate",  "color": "#ca8a04", "description": "Mild inbreeding. Monitor for trait expression."}

    elif pct < 12.5:
        return {"level": "Caution",   "color": "#ea580c", "description": "Noticeable inbreeding. Increased risk of recessive traits."}

    else:
        return {"level": "High Risk", "color": "#dc2626", "description": "High inbreeding. Avoid this pairing if alternatives exist."}

SCORING_WEIGHTS = {
    "genetic_diversity": 0.25,
    "performance": 0.25,
    "health": 0.20,
    "fertility": 0.15,
    "offspring": 0.10,
    "confidence": 0.05,
}

HIGH_RISK_RELATED_PAIRS = {
    "same_animal",
    "sire_is_dam_parent",
    "dam_is_sire_parent",
    "full_siblings",
    "half_siblings",
}

# Internal helper for clamp.
def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))

# Internal helper for score from range.
def _score_from_range(value: Optional[float], low: float, high: float) -> Optional[float]:
    """Normalise a positive measurable trait to 0..1."""

    if value is None:
        return None

    if high <= low:
        return None
    return _clamp((float(value) - low) / (high - low))

# Internal helper for average.
def _average(values: List[Optional[float]], default: float = 0.5) -> float:
    present = [v for v in values if v is not None]

    if not present:
        return default
    return _clamp(sum(present) / len(present))

# Internal helper for field present.
def _field_present(value) -> bool:
    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())
    return True

# Internal helper for has negative keyword.
def _has_negative_keyword(value: Optional[str], keywords: List[str]) -> bool:
    if not value:
        return False

    text = value.lower()
    return any(keyword in text for keyword in keywords)

# Handles detect relationship risks logic for this module.
def detect_relationship_risks(sire: models.Animal, dam: models.Animal) -> List[str]:
    """Return explainable close-relationship flags for the proposed pair."""

    flags: List[str] = []

    if sire.id == dam.id:
        flags.append("same_animal")

    if sire.id == dam.sire_id or sire.id == dam.dam_id:
        flags.append("sire_is_dam_parent")

    if dam.id == sire.sire_id or dam.id == sire.dam_id:
        flags.append("dam_is_sire_parent")

    if sire.sire_id and dam.sire_id and sire.sire_id == dam.sire_id and sire.dam_id and dam.dam_id and sire.dam_id == dam.dam_id:
        flags.append("full_siblings")

    elif (sire.sire_id and dam.sire_id and sire.sire_id == dam.sire_id) or (sire.dam_id and dam.dam_id and sire.dam_id == dam.dam_id):
        flags.append("half_siblings")
    return flags

# Handles score genetic diversity logic for this module.
def score_genetic_diversity(coi: float) -> float:
    """COI-aware score where lower inbreeding is better."""

    if coi >= 0.125:
        return 0.05

    if coi >= 0.0625:
        return 0.35

    if coi >= 0.03125:
        return 0.65

    if coi >= 0.01:
        return 0.85
    return 1.0

# Handles score performance logic for this module.
def score_performance(animal: Any) -> float:
    """Score measurable body/production performance using breeder-friendly fields."""

    animal_type = (animal.animal_type or "").lower()
    scores: List[Optional[float]] = []
    scores.append(_score_from_range(animal.body_condition_score, 1, 5))
    scores.append(_score_from_range(animal.average_daily_gain, 0, 2.0))

    if animal_type in {"cattle", "goat", "sheep"}:
        scores.append(_score_from_range(animal.current_weight, 0, 800 if animal_type == "cattle" else 120))

        scores.append(_score_from_range(animal.weaning_weight, 0, 250 if animal_type == "cattle" else 40))

    elif animal_type == "pig":
        scores.append(_score_from_range(animal.current_weight, 0, 250))

        scores.append(_score_from_range(animal.weaning_weight, 0, 40))

    elif animal_type == "poultry":
        scores.append(_score_from_range(animal.current_weight, 0, 5))

    else:
        scores.append(_score_from_range(animal.current_weight, 0, 500))

    scores.append(_score_from_range(animal.daily_milk_yield, 0, 45))

    scores.append(_score_from_range(animal.milk_fat_percent, 2, 7))

    scores.append(_score_from_range(animal.egg_count_annual, 0, 320))
    return _average(scores, default=0.50)

# Handles score health logic for this module.
def score_health(animal: Any) -> float:
    score = 0.70

    if animal.vaccination_status and animal.vaccination_status.lower() in {"complete", "up_to_date", "up-to-date", "current"}:
        score += 0.15

    elif animal.vaccination_status and animal.vaccination_status.lower() in {"none", "missing", "unknown"}:
        score -= 0.15

    negative_terms = ["chronic", "recurrent", "lameness", "mastitis", "defect", "disease", "sick", "positive"]

    if _has_negative_keyword(animal.disease_history, negative_terms):
        score -= 0.25

    if _has_negative_keyword(animal.hereditary_conditions, ["carrier", "affected", "defect", "positive", "hereditary"]):
        score -= 0.40

    if animal.health_status and animal.health_status.lower() in {"poor", "sick", "quarantined", "unfit"}:
        score -= 0.35

    elif animal.health_status and animal.health_status.lower() in {"excellent", "good", "healthy"}:
        score += 0.10
    return _clamp(score)

# Handles score fertility logic for this module.
def score_fertility(animal: Any) -> float:
    scores: List[Optional[float]] = []

    fertility_status = (animal.fertility_status or "").lower()

    if fertility_status in {"proven", "fertile", "good", "excellent"}:
        scores.append(0.90)

    elif fertility_status in {"poor", "infertile", "unknown problem"}:
        scores.append(0.20)

    if animal.services_per_conception is not None:
        scores.append(_clamp(1 - ((float(animal.services_per_conception) - 1) / 3)))

    if animal.birth_interval_days is not None:
        scores.append(_clamp(1 - ((float(animal.birth_interval_days) - 365) / 365)))

    if animal.age_at_first_service_months is not None:
        scores.append(_clamp(1 - abs(float(animal.age_at_first_service_months) - 18) / 24))

    successful = getattr(animal, "successful_breedings", 0) or 0

    failed = getattr(animal, "failed_breedings", 0) or 0

    if successful or failed:
        scores.append(_clamp(successful / max(successful + failed, 1)))
    return _average(scores, default=0.50)

# Handles score offspring logic for this module.
def score_offspring(animal: Any) -> float:
    scores: List[Optional[float]] = []

    if animal.offspring_survival_rate is not None:
        rate = float(animal.offspring_survival_rate)

        if rate > 1:
            rate = rate / 100.0

        scores.append(_clamp(rate))

    if animal.offspring_quality_score is not None:
        scores.append(_clamp(float(animal.offspring_quality_score) / 100.0))

    if animal.offspring_count is not None:
        scores.append(_score_from_range(float(animal.offspring_count), 0, 10))
    return _average(scores, default=0.50)

# Handles score data confidence logic for this module.
def score_data_confidence(animal: Any) -> Tuple[float, List[str]]:
    """Estimate how reliable the recommendation is based on actual available data."""

    important_fields = {
        "birth_weight": animal.birth_weight,
        "current_weight": animal.current_weight,
        "weaning_weight": animal.weaning_weight,
        "body_condition_score": animal.body_condition_score,
        "average_daily_gain": animal.average_daily_gain,
        "health_status": animal.health_status,
        "vaccination_status": animal.vaccination_status,
        "disease_history": animal.disease_history,
        "hereditary_conditions": animal.hereditary_conditions,
        "fertility_status": animal.fertility_status,
        "services_per_conception": animal.services_per_conception,
        "offspring_survival_rate": animal.offspring_survival_rate,
        "offspring_quality_score": animal.offspring_quality_score,
        "latest_normalized_records": len(getattr(animal, "data_sources", [])) > 1,
        "breeding_outcome_history": bool((getattr(animal, "failed_breedings", 0) or 0) + (getattr(animal, "successful_breedings", 0) or 0)),
    }

    missing = [name for name, value in important_fields.items() if not _field_present(value)]
    present = len(important_fields) - len(missing)
    confidence = present / len(important_fields)
    return round(_clamp(confidence), 4), missing

# Handles build risk penalties logic for this module.
def build_risk_penalties(sire: Any, dam: Any, coi: float, relationship_flags: List[str]) -> Tuple[float, List[str]]:
    penalties = 0.0
    risk_flags: List[str] = []

    if coi >= 0.125:
        penalties += 0.40
        risk_flags.append("Projected COI is high; avoid this pairing if alternatives exist.")

    elif coi >= 0.0625:
        penalties += 0.20
        risk_flags.append("Projected COI is elevated; use caution.")

    elif coi >= 0.03125:
        penalties += 0.08
        risk_flags.append("Projected COI is moderate; monitor offspring closely.")

    for flag in relationship_flags:
        if flag in HIGH_RISK_RELATED_PAIRS:
            penalties += 0.25
            risk_flags.append(flag.replace("_", " ").capitalize())

    if _has_negative_keyword(sire.hereditary_conditions, ["affected", "carrier", "positive", "defect"]):
        penalties += 0.35
        risk_flags.append("Sire has recorded hereditary-condition risk.")

    if _has_negative_keyword(sire.health_status, ["poor", "sick", "unfit", "quarantined"]):
        penalties += 0.20
        risk_flags.append("Sire health status is not suitable for breeding.")

    if _has_negative_keyword(sire.fertility_status, ["poor", "infertile"]):
        penalties += 0.20
        risk_flags.append("Sire fertility status is poor.")

    failed_breedings = getattr(sire, "failed_breedings", 0) or 0
    successful_breedings = getattr(sire, "successful_breedings", 0) or 0

    if failed_breedings >= 3 and successful_breedings == 0:
        penalties += 0.20
        risk_flags.append("Sire has repeated failed breeding outcomes recorded.")

    elif failed_breedings > successful_breedings and failed_breedings >= 2:
        penalties += 0.10
        risk_flags.append("Sire has more failed than successful breeding outcomes.")
    return _clamp(penalties, 0, 0.90), risk_flags

# Handles recommendation level logic for this module.
def recommendation_level(final_score: float, confidence_score: float, risk_flags: List[str]) -> str:
    if any("avoid" in flag.lower() or "hereditary" in flag.lower() for flag in risk_flags):
        return "Avoid / Review"

    if confidence_score < 0.35:
        return "Collect More Data"

    if final_score >= 0.80:
        return "Recommended based on records"

    if final_score >= 0.65:
        return "Acceptable based on records"

    if final_score >= 0.50:
        return "Caution"
    return "Not Recommended"

# Handles explain recommendation logic for this module.
def explain_recommendation(scores: Dict[str, float], risk_flags: List[str], missing_data: List[str]) -> str:
    strong = max((k for k in scores if k != "confidence"), key=lambda k: scores[k])
    weak = min((k for k in scores if k != "confidence"), key=lambda k: scores[k])
    parts = [f"Strongest area: {strong.replace('_', ' ')}.", f"Weakest area: {weak.replace('_', ' ')}."]

    if risk_flags:
        parts.append(f"Risks: {'; '.join(risk_flags[:3])}.")

    if missing_data:
        parts.append(f"Missing data reduces confidence: {', '.join(missing_data[:4])}.")
    return " ".join(parts)

# Handles evaluate pair logic for this module.
def evaluate_pair(sire: models.Animal, dam: models.Animal, db: Session, max_depth: int = 6) -> dict:
    coi = compute_inbreeding_coefficient(sire.id, dam.id, db, max_depth)
    classification = classify_coi(coi)
    relationship_flags = detect_relationship_risks(sire, dam)
    pedigree_completeness = combine_pedigree_completeness(sire.id, dam.id, db, max_depth=min(max_depth, 4))
    sire_profile = build_animal_breeding_profile(sire, db)
    dam_profile = build_animal_breeding_profile(dam, db)
    confidence_score, missing_data = score_data_confidence(sire_profile)

    scores = {
        "genetic_diversity": score_genetic_diversity(coi),
        "performance": score_performance(sire_profile),
        "health": score_health(sire_profile),
        "fertility": score_fertility(sire_profile),
        "offspring": score_offspring(sire_profile),
        "confidence": confidence_score,
    }

    weighted_score = sum(scores[key] * weight for key, weight in SCORING_WEIGHTS.items())
    penalty_score, risk_flags = build_risk_penalties(sire_profile, dam_profile, coi, relationship_flags)

    for warning in pedigree_completeness.get("warnings", []):
        if warning and warning not in risk_flags:
            risk_flags.append(warning)

    final_score = _clamp(weighted_score - penalty_score)
    return {
        "coi": coi,
        "coi_percent": round(coi * 100, 2),
        "coi_level": classification["level"],
        "coi_color": classification["color"],
        "coi_description": classification["description"],
        "genetic_diversity_score": round(scores["genetic_diversity"] * 100, 1),
        "performance_score": round(scores["performance"] * 100, 1),
        "health_score": round(scores["health"] * 100, 1),
        "fertility_score": round(scores["fertility"] * 100, 1),
        "offspring_score": round(scores["offspring"] * 100, 1),
        "confidence_score": round(confidence_score * 100, 1),
        "penalty_score": round(penalty_score * 100, 1),
        "risk_flags": risk_flags,
        "missing_data": missing_data,
        "data_sources": sire_profile.data_sources,
        "pedigree_completeness": pedigree_completeness,
        "pedigree_depth_analyzed": pedigree_completeness["generations_requested"],
        "pedigree_depth_available": pedigree_completeness["generations_available"],
        "pedigree_completeness_percent": pedigree_completeness["completeness_percent"],
        "last_breeding_status": sire_profile.last_breeding_status,
        "last_breeding_outcome": sire_profile.last_breeding_outcome,
        "recommendation_level": recommendation_level(final_score, confidence_score, risk_flags),
        "explanation": explain_recommendation(scores, risk_flags, missing_data),
        "final_score": round(final_score, 4),
    }

# Handles recommend sires logic for this module.
def recommend_sires(
    dam_id: int,
    db: Session,
    top_n: int = 10,
    max_depth: int = 8,

) -> List[dict]:
    """
    Rank available sires of the same animal_type using a confidence-weighted
    breeding decision model. The score combines projected COI/genetic diversity,
    measurable performance, health, fertility, offspring evidence, and data
    confidence, then subtracts explainable risk penalties.
    """

    dam = db.query(models.Animal).filter(models.Animal.id == dam_id).first()

    if not dam:
        return []

    sires = (

        db.query(models.Animal, models.Breeder)
        .join(models.Breeder, models.Breeder.id == models.Animal.breeder_id, isouter=True)

        .filter(
            models.Animal.gender == "male",
            models.Animal.animal_type == dam.animal_type,
            models.Animal.id != dam_id,
        )

        .all()
    )

    results = []

    for sire, breeder in sires:
        evaluation = evaluate_pair(sire, dam, db, max_depth=max_depth)
        results.append({
            "sire_id": sire.id,
            "sire_animal_id": sire.animal_id,
            "breed": sire.breed,
            "date_of_birth": str(sire.date_of_birth),
            "farm_name": breeder.farm_name if breeder else "Unknown",
            "farm_prefix": breeder.farm_prefix if breeder else "—",
            **evaluation,
        })

    results.sort(key=lambda x: (x["final_score"], x["confidence_score"], -x["coi"]), reverse=True)
    return results[:top_n]
