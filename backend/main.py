import logging
import os
from typing import Any, Dict, List

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from .optimization.allocate import allocate_seats
    from .services.model_manager import ModelManager
    from .utils.eval import mae, rmse, mape
    from .utils.evaluation_summary import save_evaluation_summary
    from .utils.od_analysis import build_od_matrix
    from .utils.data_pipeline import load_dataset
except ImportError:
    from optimization.allocate import allocate_seats
    from services.model_manager import ModelManager
    from utils.eval import mae, rmse, mape
    from utils.evaluation_summary import save_evaluation_summary
    from utils.od_analysis import build_od_matrix
    from utils.data_pipeline import load_dataset


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('railway_ai')

BASE = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE, '..', 'sri_lanka_railway_dataset.csv')
SAVED_MODELS_DIR = os.path.join(BASE, 'saved_models')
os.makedirs(SAVED_MODELS_DIR, exist_ok=True)

model_manager = ModelManager(data_path=DATA_PATH, saved_models_dir=SAVED_MODELS_DIR)


@app.on_event('startup')
def startup():
    try:
        model_manager.load_or_train_models()
        logger.info('[STARTUP] ModelManager initialized successfully')
    except Exception as e:
        logger.exception(f'[STARTUP] Model initialization failed: {e}')
        raise


def _coerce_predictions_to_series(pred_payload: Any, periods: int) -> List[float]:
    if isinstance(pred_payload, dict) and 'pred' in pred_payload:
        return [float(v) for v in pred_payload['pred'][:periods]]

    if isinstance(pred_payload, dict):
        total = float(sum(float(v) for v in pred_payload.values())) if pred_payload else 0.0
        return [total for _ in range(periods)]

    if isinstance(pred_payload, list):
        out = [float(v) for v in pred_payload[:periods]]
        if len(out) < periods and len(out) > 0:
            out += [out[-1]] * (periods - len(out))
        return out

    return [0.0 for _ in range(periods)]


def _log_endpoint_response(endpoint: str, response_data: Any):
    print(f'API HIT: {endpoint}')
    print('Response:', response_data)
    return response_data


@app.post('/upload-data')
async def upload_data(file: UploadFile = File(...)):
    dest = os.path.join(BASE, '..', file.filename)
    with open(dest, 'wb') as f:
        f.write(await file.read())
    return {'status': 'ok', 'path': dest}


@app.post('/train-model')
def train_model(model_type: str = 'all'):
    # Research architecture: never train in endpoints.
    available = ['arima', 'prophet', 'lstm', 'gnn', 'hybrid']
    return {
        'status': 'disabled',
        'message': 'Training inside API endpoints is disabled. Models are trained/loaded only at startup.',
        'requested_model': model_type,
        'available_models': available,
    }


@app.get('/predict-demand')
def predict_demand(model_type: str = 'lstm', periods: int = 7):
    if periods <= 0:
        raise HTTPException(status_code=400, detail='periods must be positive')

    try:
        if model_type.lower() == 'lstm':
            model_manager.get_model('lstm')
        bundle = model_manager.get_forecast_bundle(model=model_type, periods=int(periods))
        response_data = {
            'labels': bundle['labels'],
            'actual': bundle['actual'],
            'predicted': bundle['predicted'],
            'model': bundle['model'],
        }
        return _log_endpoint_response('/predict-demand', response_data)
    except HTTPException:
        raise
    except KeyError as e:
        logger.exception(f'[PREDICT] Requested model not loaded: {e}')
        raise HTTPException(status_code=503, detail=f'Model unavailable: {e}')
    except Exception as e:
        logger.exception(f'[PREDICT] Prediction failed: {e}')
        raise HTTPException(status_code=500, detail=f'Prediction failed: {e}')


@app.post('/allocate-seats')
def allocate(payload: dict):
    capacities = payload.get('capacities')
    demand = payload.get('demand')
    if capacities is None or demand is None:
        raise HTTPException(status_code=400, detail='capacities and demand required')

    try:
        if isinstance(capacities, dict):
            cap_df = pd.DataFrame.from_dict(capacities, orient='index', columns=['capacity'])
        elif isinstance(capacities, list):
            routes = payload.get('routes') or [f'route_{i + 1}' for i in range(len(capacities))]
            cap_df = pd.DataFrame({'capacity': list(capacities)}, index=routes)
        else:
            raise ValueError('capacities must be a dict or list')

        if isinstance(demand, dict):
            demand_s = pd.Series(demand)
        elif isinstance(demand, list):
            routes = cap_df.index.tolist()
            demand_s = pd.Series(list(demand), index=routes[:len(demand)])
        else:
            raise ValueError('demand must be a dict or list')

        alloc, unmet = allocate_seats(cap_df, demand_s)
        utilization = None
        try:
            cap_total = cap_df['capacity'].sum()
            allocated_total = sum(float(v) for v in alloc.values())
            utilization = float((allocated_total / cap_total) * 100.0) if cap_total > 0 else 0.0
        except Exception:
            utilization = None
        response_data = {
            'allocation': alloc,
            'unmet': unmet,
            'utilization_rate': utilization,
            'status': 'optimized',
        }
        return _log_endpoint_response('/allocate-seats', response_data)

    except Exception as e:
        logger.exception(f'[ALLOCATE] Seat allocation failed: {e}')
        raise HTTPException(status_code=500, detail=f'Seat allocation failed: {e}')


@app.post('/seat-allocation')
def seat_allocation(payload: dict = None, model_type: str = 'lstm', periods: int = 7):
    """Research-facing seat allocation endpoint.
    If payload is provided it should contain 'capacities' (dict) and optionally 'demand' (dict).
    If no payload provided, capacities are built from latest route snapshot and demand is derived from model predictions.
    """
    try:
        model_manager.get_model('lstm')
        if payload is None:
            # build capacities and demand from model_manager
            route_snapshot = model_manager.get_route_demand(top_k=8)
            capacities = {r['route']: int(r['capacity']) for r in route_snapshot.get('routes', [])}
            # predicted demand: use forecast bundle and map to top routes by proportion of historical demand
            bundle = model_manager.get_forecast_bundle(model=model_type, periods=int(periods))
            predicted_total = sum(bundle.get('predicted', [])) if bundle.get('predicted') else 0.0
            # distribute predicted_total proportionally to historical latest demands
            historical = route_snapshot.get('routes', [])
            total_hist = sum(r['demand'] for r in historical) if historical else 0
            demand = {}
            for r in historical:
                if total_hist > 0:
                    share = r['demand'] / float(total_hist)
                else:
                    share = 1.0 / max(1, len(historical))
                demand[r['route']] = int(round(predicted_total * share))
        else:
            capacities = payload.get('capacities') or {}
            demand = payload.get('demand')
            if demand is None:
                # use model predictions aggregated as simple total if not provided
                bundle = model_manager.get_forecast_bundle(model=model_type, periods=int(periods))
                total_pred = sum(bundle.get('predicted', [])) if bundle.get('predicted') else 0.0
                # allocate equally across provided capacities
                routes = list(capacities.keys())
                if routes:
                    per = int(round(total_pred / len(routes)))
                    demand = {r: per for r in routes}
                else:
                    demand = {}

        # call core allocation
        alloc, unmet = allocate_seats(
            pd.DataFrame.from_dict(capacities, orient='index', columns=['capacity']),
            pd.Series(demand)
        )
        cap_total = sum(int(v) for v in capacities.values()) if capacities else 0
        allocated_total = sum(float(v) for v in alloc.values())
        utilization = float((allocated_total / cap_total) * 100.0) if cap_total > 0 else 0.0
        route_rows = []
        for route_name, capacity in capacities.items():
            allocated_value = float(alloc.get(route_name, 0))
            demand_value = float(demand.get(route_name, 0))
            unmet_value = float(unmet.get(route_name, 0)) if isinstance(unmet, dict) else 0.0
            route_rows.append({
                'route': route_name,
                'demand': int(round(demand_value)),
                'allocated': int(round(allocated_value)),
                'capacity': int(round(capacity)),
                'unmet': int(round(unmet_value)),
                'utilization': f"{((allocated_value / capacity) * 100.0):.1f}%" if capacity > 0 else '0.0%',
            })

        unmet_total = int(sum(float(value) for value in unmet.values())) if isinstance(unmet, dict) else 0
        response_data = {
            'allocation': alloc,
            'routes': route_rows,
            'utilization_rate': utilization,
            'unmet_demand': unmet_total,
            'status': 'ok',
        }
        return _log_endpoint_response('/seat-allocation', response_data)
    except Exception as e:
        logger.exception(f'[SEAT ALLOCATION] Failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/metrics')
def metrics(model_type: str = 'lstm'):
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=400, detail='Dataset not found')

    try:
        hist = model_manager.get_historical(periods=7)
        actual = hist['values']
        pred_payload = predict_demand(model_type=model_type, periods=7)
        pred = _coerce_predictions_to_series(pred_payload, periods=7)

        if len(actual) == 0 or len(pred) == 0:
            raise HTTPException(status_code=400, detail='Not enough data to compute metrics')

        return {
            'MAE': mae(actual, pred),
            'RMSE': rmse(actual, pred),
            'MAPE': mape(actual, pred),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[METRICS] Computation failed: {e}')
        raise HTTPException(status_code=500, detail=f'Metrics computation failed: {e}')


@app.get('/historical-demand')
def historical_demand(periods: int = 10):
    if periods <= 0:
        raise HTTPException(status_code=400, detail='periods must be positive')

    try:
        payload = model_manager.get_historical(periods=periods)
        if not payload['values']:
            raise HTTPException(status_code=400, detail='Historical demand is empty')
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[HISTORICAL] Failed: {e}')
        raise HTTPException(status_code=500, detail=f'Historical demand failed: {e}')


@app.get('/route-demand')
def route_demand(top_k: int = 8):
    if top_k <= 0:
        raise HTTPException(status_code=400, detail='top_k must be positive')

    try:
        return model_manager.get_route_demand(top_k=top_k)
    except Exception as e:
        logger.exception(f'[ROUTE DEMAND] Failed: {e}')
        raise HTTPException(status_code=500, detail=f'Route demand failed: {e}')


@app.get('/evaluation-summary')
async def evaluation_summary(n_test_days: int = 7):
    if n_test_days <= 0:
        raise HTTPException(status_code=400, detail='n_test_days must be positive')

    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=400, detail='Dataset not found')

    try:
        output_path = os.path.join(BASE, 'evaluation_summary_output.json')
        summary = await run_in_threadpool(
            save_evaluation_summary,
            DATA_PATH,
            SAVED_MODELS_DIR,
            output_path,
            n_test_days,
        )
        return summary
    except Exception as e:
        logger.exception(f'[EVALUATION] Failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/od-matrix')
async def od_matrix(start_date: str = None, end_date: str = None, period: str = 'all', top_k: int = 10):
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=400, detail='Dataset not found')

    if top_k <= 0:
        raise HTTPException(status_code=400, detail='top_k must be positive')

    try:
        df = await run_in_threadpool(load_dataset, DATA_PATH)
        if df.empty:
            raise HTTPException(status_code=400, detail='Dataset is empty')

        result = await run_in_threadpool(
            build_od_matrix,
            df,
            start_date,
            end_date,
            period,
            top_k,
        )

        if not result or not result.get('matrix'):
            raise HTTPException(status_code=400, detail='OD matrix could not be generated')
        # Normalize returned structure
        origins = result.get('origins') or []
        destinations = result.get('destinations') or []
        matrix = result.get('matrix') or []
        response_data = {
            'origins': origins,
            'destinations': destinations,
            'matrix': matrix,
            'top_routes': result.get('top_routes', []),
            'total_passengers': result.get('total_passengers', 0),
            'route_count': result.get('route_count', len(result.get('top_routes', []))),
            'heatmap_base64': result.get('heatmap_base64'),
            'filters': result.get('filters', {}),
        }
        return _log_endpoint_response('/od-matrix', response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[OD MATRIX] Failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
def health():
    model_names = sorted(list(model_manager.models.keys()))
    model_files = {name: os.path.exists(path) for name, path in model_manager.paths.items()}
    return {
        'status': 'ok',
        'models_in_memory': model_names,
        'model_files': model_files,
    }


@app.get('/model-comparison')
async def model_comparison(n_test_days: int = 7):
    if n_test_days <= 0:
        raise HTTPException(status_code=400, detail='n_test_days must be positive')
    try:
        payload = await run_in_threadpool(model_manager.get_comparison_cached, n_test_days)
        table = payload.get('table') if isinstance(payload, dict) else None
        if isinstance(table, list) and len(table) > 0:
            out = []
            for row in table:
                out.append({
                    'model': row.get('model'),
                    'MAE': float(row.get('MAE')),
                    'RMSE': float(row.get('RMSE')),
                    'MAPE': float(row.get('MAPE')),
                })
            return _log_endpoint_response('/model-comparison', out)
        metrics = payload.get('metrics') if isinstance(payload, dict) else None
        if isinstance(metrics, dict):
            out = []
            for k, v in metrics.items():
                out.append({'model': k, 'MAE': float(v.get('MAE')), 'RMSE': float(v.get('RMSE')), 'MAPE': float(v.get('MAPE'))})
            return _log_endpoint_response('/model-comparison', out)
        raise HTTPException(status_code=400, detail='Model comparison produced no metrics')
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[COMPARISON] Failed: {e}')
        raise HTTPException(status_code=500, detail=f'Model comparison failed: {e}')


@app.get('/dashboard')
def dashboard(periods: int = 7, model_type: str = 'lstm'):
    if periods <= 0:
        raise HTTPException(status_code=400, detail='periods must be positive')
    try:
        model_manager.get_model('lstm')
        hist = model_manager.get_historical(periods=periods)
        bundle = model_manager.get_forecast_bundle(model=model_type, periods=periods)

        actual = hist.get('values', [])
        predicted = bundle.get('predicted', [])

        total_passengers = sum(predicted)
        forecast_accuracy = None
        if actual and predicted and len(actual) == len(predicted):
            forecast_accuracy = 100.0 - float(mape(actual, predicted))

        route_snapshot = model_manager.get_route_demand(top_k=8)
        capacities = [r['capacity'] for r in route_snapshot.get('routes', [])]
        demand_vals = [r['demand'] for r in route_snapshot.get('routes', [])]
        utilization = None
        unmet_demand = None
        if capacities and demand_vals:
            cap_total = sum(capacities)
            demand_total = sum(demand_vals)
            utilization = float((min(cap_total, demand_total) / cap_total) * 100.0) if cap_total > 0 else 0.0
            unmet_demand = max(0.0, float(demand_total - cap_total))

        kpis = {
            'total_passengers': total_passengers,
            'seat_utilization': utilization,
            'forecast_accuracy': forecast_accuracy,
            'unmet_demand': unmet_demand,
        }

        chart = {
            'labels': bundle.get('labels', []),
            'actual': actual,
            'forecast': predicted,
        }

        response_data = {'kpis': kpis, 'chart': chart}
        return _log_endpoint_response('/dashboard', response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[DASHBOARD] Failed: {e}')
        raise HTTPException(status_code=500, detail=f'Dashboard failed: {e}')
