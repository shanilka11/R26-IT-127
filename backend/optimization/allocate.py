import pulp
import os
import pandas as pd
import logging


logger = logging.getLogger('railway_ai')


def allocate_seats(train_capacities: pd.DataFrame, demand: pd.Series):
    """
    train_capacities: DataFrame with index=route (OD string) and column 'capacity'
    demand: Series indexed by route (OD) with predicted demand
    Returns allocation per route up to capacity, minimizing unmet demand.
    """
    if train_capacities is None or demand is None:
        raise ValueError('train_capacities and demand are required')

    if not isinstance(train_capacities, pd.DataFrame):
        raise ValueError('train_capacities must be a pandas DataFrame')
    if 'capacity' not in train_capacities.columns:
        raise ValueError("train_capacities must contain a 'capacity' column")

    demand = pd.Series(demand).copy()
    demand.index = demand.index.astype(str)
    train_capacities = train_capacities.copy()
    train_capacities.index = train_capacities.index.astype(str)
    train_capacities['capacity'] = pd.to_numeric(train_capacities['capacity'], errors='coerce').fillna(0).astype(int)
    demand = pd.to_numeric(demand, errors='coerce').fillna(0).astype(int)

    routes = list(demand.index)

    try:
        prob = pulp.LpProblem('seat_alloc', pulp.LpMaximize)
        x = pulp.LpVariable.dicts('alloc', routes, lowBound=0, cat='Integer')

        # Objective: maximize total satisfied demand (equivalently minimize unmet)
        prob += pulp.lpSum([x[r] for r in routes])

        # Constraints: allocation per route <= capacity and demand
        for r in routes:
            cap = int(train_capacities.loc[r, 'capacity']) if r in train_capacities.index else 0
            dem = int(demand.loc[r])
            prob += x[r] <= max(0, cap)
            prob += x[r] <= max(0, dem)

        status = prob.solve(pulp.PULP_CBC_CMD(msg=False))
        if status != pulp.LpStatusOptimal:
            raise RuntimeError(f'PuLP solver returned non-optimal status: {pulp.LpStatus[status]}')

        alloc = {r: int(max(0, pulp.value(x[r]) or 0)) for r in routes}
        unmet = {r: max(0, int(demand.loc[r]) - alloc[r]) for r in routes}
        return alloc, unmet

    except Exception as exc:
        logger.exception('MILP solver failed; falling back to greedy feasible allocation')
        alloc = {}
        unmet = {}
        for r in routes:
            cap = int(train_capacities.loc[r, 'capacity']) if r in train_capacities.index else 0
            dem = int(demand.loc[r])
            alloc[r] = max(0, min(cap, dem))
            unmet[r] = max(0, dem - alloc[r])
        return alloc, unmet
