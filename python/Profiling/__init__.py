"""
Component 2 - Personalised Advice Engine (EduPulse, J26-IT-397).

Takes the output of Component 1 (the ML-based academic risk model), detects
learning signals with transparent rules, and asks an OpenAI model to turn them
into personalised recommendations. Every recommendation carries the main
reason (the evidence) behind it.

PP1 scope: advice panel only (the course-content chatbot comes later).
Component 1 is developed separately, so dummy Component 1 outputs are used.
"""
