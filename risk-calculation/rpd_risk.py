from dataclasses import dataclass

@dataclass
class Cause:
    cause_id : str    # 编号
    name     : str    # 描述
    p_occurs : float  # 发生的概率

@dataclass
class Effect:
    effect_id     : str          # 编号
    name          : str          # 描述
    severity      : int          # 严重程度
    p_given_cause : dict         # 可能由哪些原因触发，以及对应的概率

@dataclass
class RpDItem:
    item_id     : str           # 编号
    description : str           # 描述
    causes      : list[Cause]   # 这个条目涉及哪些原因
    effects     : list[Effect]  # 这个条目涉及哪些后果

def calculate_risk(item: RpDItem):

    # 把该条目涉及的所有原因放进字典，方便快速查找
    cause_map = {c.cause_id: c for c in item.causes}

    raw_risk = 0.0

    # 遍历该条目涉及的所有后果
    for effect in item.effects:

        # 遍历可能触发这个后果的所有原因
        for cause_id, p_eff_given_cause in effect.p_given_cause.items():

            # 如果该原因不属于当前条目，跳过
            if cause_id not in cause_map:
                continue

            cause = cause_map[cause_id]

            # 套用公式
            contrib = cause.p_occurs * p_eff_given_cause * effect.severity
            raw_risk += contrib

    return raw_risk
