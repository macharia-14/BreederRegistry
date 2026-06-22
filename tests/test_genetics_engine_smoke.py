# tests/test_genetics_engine_smoke.py: contains backend logic for the Animal Breed Registry System.
from types import SimpleNamespace
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from Backend.app.genetics import (
    score_data_confidence,
    score_health,
    score_performance,
    score_offspring,
    detect_relationship_risks,
)

# Handles animal logic for this module.
def animal(**kwargs):
    defaults = dict(
        id=1, animal_type='cattle', sire_id=None, dam_id=None,
        birth_weight=None, current_weight=None, weaning_weight=None,
        mature_weight=None, body_condition_score=None, average_daily_gain=None,
        health_status=None, vaccination_status=None, disease_history=None,
        hereditary_conditions=None, vet_notes=None, fertility_status=None,
        age_at_first_service_months=None, services_per_conception=None,
        birth_interval_days=None, offspring_count=None, offspring_survival_rate=None,
        offspring_quality_score=None, production_type=None, daily_milk_yield=None,
        milk_fat_percent=None, egg_count_annual=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)

# Handles test confidence increases with data logic for this module.
def test_confidence_increases_with_data():
    low, _ = score_data_confidence(animal())
    high, _ = score_data_confidence(animal(current_weight=450, body_condition_score=4, health_status='good', vaccination_status='complete', fertility_status='proven'))
    assert high > low

# Handles test hereditary condition reduces health score logic for this module.
def test_hereditary_condition_reduces_health_score():
    healthy = score_health(animal(health_status='good'))
    risky = score_health(animal(health_status='good', hereditary_conditions='carrier positive'))
    assert risky < healthy

# Handles test performance and offspring scores are bounded logic for this module.
def test_performance_and_offspring_scores_are_bounded():
    a = animal(current_weight=10000, body_condition_score=10, offspring_survival_rate=120, offspring_quality_score=150)
    assert 0 <= score_performance(a) <= 1
    assert 0 <= score_offspring(a) <= 1

# Handles test relationship flags half siblings logic for this module.
def test_relationship_flags_half_siblings():
    sire = animal(id=10, sire_id=1, dam_id=2)
    dam = animal(id=11, sire_id=1, dam_id=3)
    assert 'half_siblings' in detect_relationship_risks(sire, dam)

# Handles test fertility score uses breeding outcome history logic for this module.
def test_fertility_score_uses_breeding_outcome_history():
    proven = animal(fertility_status='proven', successful_breedings=3, failed_breedings=0)
    repeated_failures = animal(fertility_status='proven', successful_breedings=0, failed_breedings=3)
    from Backend.app.genetics import score_fertility
    assert score_fertility(proven) > score_fertility(repeated_failures)
