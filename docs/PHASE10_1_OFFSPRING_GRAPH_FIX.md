# Phase 10.1 Offspring Register Graph Fix

## Issue
The Offspring Register graph previously counted only breeding events that had a linked `offspring_id` animal record. This made the graph inaccurate when a breeder recorded a successful delivery using `offspring_count` / `live_offspring_count` but had not yet registered each newborn as an individual animal.

## Fix
The monthly trend graph now counts live-birth delivery events using this priority:

1. Linked offspring animal `date_of_birth`
2. Breeding event `outcome_date`
3. Breeding event `expected_due_date`
4. Breeding event `breeding_date`

The count now uses:

1. `live_offspring_count`
2. `offspring_count`
3. `1` when a linked `offspring_id` exists

## Result
The graph now reflects actual delivery outcomes and live offspring totals even before individual offspring animal records are created.

## Database Migration
No database migration is required.
