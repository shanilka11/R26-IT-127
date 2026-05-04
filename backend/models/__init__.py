# Models package
from .arima_prophet import train_baseline, predict_baseline
from .lstm_model import LSTMModel, train_lstm, predict_lstm
from .gnn_model import SimpleGNN, train_gnn, predict_gnn
try:
	from .gnn_pyg import GCNNet, train_gcn_pyg, predict_gcn_pyg
except Exception:
	GCNNet = None

	def train_gcn_pyg(*args, **kwargs):
		raise ImportError('torch_geometric is required for GNN functionality')

	def predict_gcn_pyg(*args, **kwargs):
		raise ImportError('torch_geometric is required for GNN functionality')
from .hybrid_model import combine_predictions
