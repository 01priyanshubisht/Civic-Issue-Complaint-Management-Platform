"""
severity_service.py — AI-Assisted Visual Severity Assessment & Intelligent Prioritization

Uses rule-based heuristics based on:
1. Issue Category
2. Duplicate Complaint Count
3. AI Confidence
4. Complaint Text Keywords
"""

def assess_severity(
    category: str,
    text: str,
    duplicate_count: int,
    image_confidence: float
) -> dict:
    
    severity_score = 0
    priority_score = 0
    reasons = []

    # 1. Category Heuristics
    category_lower = category.lower() if category else ""
    if category_lower in ["pothole", "road_damage", "road damage"]:
        severity_score += 2
        priority_score += 2
        reasons.append(f"Category '{category}' generally indicates a high severity issue.")
    elif category_lower in ["broken_streetlight", "broken streetlight"]:
        severity_score += 1
        priority_score += 1
        reasons.append("Broken streetlights pose moderate safety risks.")
    elif category_lower in ["garbage", "litter"]:
        severity_score += 0
        priority_score += 0
        reasons.append("Garbage/litter is typically lower severity.")
    elif category_lower in ["waterlogging", "flooding"]:
        severity_score += 2
        priority_score += 2
        reasons.append("Waterlogging/flooding can cause significant disruption.")
    elif category:
        reasons.append(f"Standard priority for category '{category}'.")

    # 2. Duplicate Complaint Count
    if duplicate_count > 3:
        severity_score += 2
        priority_score += 2
        reasons.append(f"High duplicate count ({duplicate_count}) suggests a widespread or critical issue.")
    elif duplicate_count > 0:
        severity_score += 1
        priority_score += 1
        reasons.append(f"Multiple nearby complaints ({duplicate_count}) increase priority.")

    # 3. Text Keywords
    text_lower = text.lower() if text else ""
    high_sev_keywords = ["dangerous", "accident", "huge", "flooding", "traffic", "urgent", "emergency"]
    found_keywords = [kw for kw in high_sev_keywords if kw in text_lower]
    
    if found_keywords:
        severity_score += len(found_keywords)
        priority_score += len(found_keywords)
        reasons.append(f"Urgent keywords detected in description: {', '.join(found_keywords)}.")

    # 4. AI Confidence
    if image_confidence > 0.8:
        priority_score += 1
        reasons.append("High AI confidence in image classification solidifies priority.")

    # Map scores to labels
    severity_map = {0: "Low", 1: "Medium", 2: "High", 3: "Critical"}
    priority_map = {0: "Normal", 1: "Important", 2: "Urgent", 3: "Emergency"}

    # Cap scores
    final_severity = severity_map.get(min(severity_score, 3), "Critical")
    final_priority = priority_map.get(min(priority_score, 3), "Emergency")

    return {
        "severity": final_severity,
        "priority": final_priority,
        "reason": reasons
    }
