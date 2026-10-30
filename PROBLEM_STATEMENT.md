# Problem Statement: From Complaints to Action

PromptWars x ASTRA | AI for Civic Impact
Format: individual / solo. Time limit: 8 hours. Output: working prototype and demo.

## Background

Communities face waterlogging, damaged roads, overflowing bins, broken streetlights, and disrupted services. Reports arrive through calls, messages, social media, and walk-ins. The same issue is often reported many times, urgent hazards sit in the same queue as routine requests, and decision-makers cannot tell what needs attention first. Citizens rarely see what happened to their complaint.

## Mission

Build an AI-powered platform that turns scattered citizen reports into prioritized, explainable, and trackable action. It must understand reports, detect patterns, surface hotspots, and help a decision-maker choose what to fix first, and why.

## Required lifecycle stages

1. **Capture:** submit text and/or an image, choose a category, and give a location (map pin, address, or coordinates). Under a minute, usable on a phone.
2. **Understand:** AI categorizes the report, summarizes it, flags likely duplicates, and assigns a priority based on urgency and impact.
3. **Reveal:** map or dashboard showing recurring problems, high-priority locations, and area-level patterns.
4. **Act:** review, assign, and track each report from submission to resolution, with visible status for the submitter.

## AI requirement

At least one meaningful AI capability beyond a basic chatbot. Examples: duplicate detection, explainable prioritization, cluster or hotspot detection, action briefs. Any model, API, library, or rule-based method is allowed. The AI must do real work in the pipeline, and we must be able to explain how it works.

## Demo (target 5 minutes)

1. Submit a new report (text and/or image, category, location).
2. Show AI processing: category, summary, duplicate check, priority, and the reasoning.
3. Surface an insight: hotspot, cluster, trend, or action brief.
4. Track the action: assign, move through the workflow, show the citizen-side status update.

## Data

Public, sample, or synthetic data. Recommended: 30 to 50 synthetic reports with deliberate duplicates, a few urgent safety issues, and at least one geographic cluster. No real personal data.

## Rules

- Solo participation. All work within the 8-hour window.
- AI assistants are allowed, but the author must understand and explain the implementation.
- Do not claim live integrations, real deployments, or AI capabilities that do not exist. Label mocks clearly.
- Stack, interface, and strategy are our choice.

## Submission checklist

- Working prototype (hosted link or runnable locally)
- Source repository with README covering setup, architecture, and the AI approach
- Short demo (live or recorded) of the full user journey
- Limitations and Honesty note: what is real, what is mocked, where AI can be wrong, what comes next

## MVP scope lock

**In scope**

- Report capture (text, category, location; image upload stored, not analyzed unless time allows)
- AI pipeline: classify, summarize, duplicate detection, explainable priority
- Hotspot detection on seeded and new reports
- `/admin` queue, map, assignment (mock teams), status workflow, history log
- `/track/[id]` citizen timeline
- Action brief for clusters and high-priority reports (LLM with template fallback)
- Works fully without an API key

**Out of scope**

- Real authentication, real authority or SMS integrations, real deployment
- Vision-based image analysis (unless Phase 7 has time)
- Persistent production database
- Multi-user concurrency and multi-city support

**Cut order if behind:** vision images → tap-to-place pin → embeddings → LLM brief (use template). Never cut the end-to-end flow, explanations, citizen view, or the limitations note.

See [PLAN.md](PLAN.md) for the phase-by-phase build plan.
