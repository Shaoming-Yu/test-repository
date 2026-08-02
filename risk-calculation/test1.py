def calculate_risk(issue):
    total_risk = 0.0

    for cause in issue["causes"]:
        p_c = cause["probability"]

        for effect in cause["effects"]:
            p_e_given_c = effect["probability"]
            severity = effect["severity"]

            total_risk += p_c * p_e_given_c * severity

    return total_risk


def calculate_max_risk(issue, max_severity=5):
    max_risk = 0.0

    for cause in issue["causes"]:
        for effect in cause["effects"]:
            max_risk += 1 * 1 * max_severity

    return max_risk


def normalize_risk(risk, max_risk):
    if max_risk == 0:
        return 0
    return (risk / max_risk) * 100


def classify_risk(normalized_risk):
    if normalized_risk < 30:
        return "Low"
    elif normalized_risk < 60:
        return "Medium"
    else:
        return "High"


def map_to_rpd_severity(normalized_risk):
    if normalized_risk >= 90:
        return 10
    elif normalized_risk >= 80:
        return 9
    elif normalized_risk >= 70:
        return 8
    elif normalized_risk >= 60:
        return 7
    elif normalized_risk >= 50:
        return 6
    elif normalized_risk >= 40:
        return 5
    elif normalized_risk >= 30:
        return 4
    elif normalized_risk >= 20:
        return 3
    elif normalized_risk >= 10:
        return 2
    else:
        return 1


# 示例数据
issue = {
    "causes": [
        {
            "id": "C1",
            "probability": 0.85,
            "effects": [
                {"id": "E1", "probability": 0.56, "severity": 3},
                {"id": "E2", "probability": 0.45, "severity": 3},
            ]
        }
    ]
}

# 执行
risk = calculate_risk(issue)
max_risk = calculate_max_risk(issue)
normalized = normalize_risk(risk, max_risk)
level = classify_risk(normalized)
rpd_severity = map_to_rpd_severity(normalized)

print("Risk:", risk)
print("Normalized:", normalized)
print("Level:", level)
print("RpD Severity:", rpd_severity)
