import os
import pickle
import numpy as np
import torch
import torch.nn as nn
import networkx as nx


class SimpleGNN(nn.Module):
    def __init__(self, num_nodes, in_feats=1, hidden=32, out_feats=1):
        super().__init__()
        self.fc1 = nn.Linear(in_feats, hidden)
        self.fc2 = nn.Linear(hidden, out_feats)

    def forward(self, x, adj):
        # x: [num_nodes, in_feats]
        h = torch.matmul(adj, x)
        h = torch.relu(self.fc1(h))
        h = self.fc2(h)
        return h


def build_adj_from_edges(edges, nodes):
    G = nx.DiGraph()
    G.add_nodes_from(nodes)
    G.add_edges_from(edges)
    A = nx.to_numpy_array(G, nodelist=nodes)
    # normalize
    row_sum = A.sum(axis=1, keepdims=True)
    row_sum[row_sum == 0] = 1
    A_norm = A / row_sum
    return A_norm


def train_gnn(node_time_series, edges, model_path, epochs=50, lr=1e-3):
    # node_time_series: dict node -> 1D array (historical demand)
    nodes = list(node_time_series.keys())
    num_nodes = len(nodes)
    # Use last value as target for simple demo
    X = np.array([ts[-1] for ts in node_time_series.values()]).reshape(num_nodes, 1).astype(float)
    y = X.copy()  # demo: try to reconstruct/denoise

    A = build_adj_from_edges(edges, nodes)
    A_t = torch.tensor(A, dtype=torch.float32)
    x_t = torch.tensor(X, dtype=torch.float32)
    y_t = torch.tensor(y, dtype=torch.float32)

    model = SimpleGNN(num_nodes)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    for ep in range(epochs):
        model.train()
        pred = model(x_t, A_t)
        loss = loss_fn(pred, y_t)
        opt.zero_grad()
        loss.backward()
        opt.step()

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    with open(model_path, 'wb') as f:
        pickle.dump({'nodes': nodes, 'state': model.state_dict()}, f)
    return model, nodes, A


def predict_gnn(model, nodes, adj, node_history, n_steps=7):
    # node_history: dict node->array
    model.eval()
    x = np.array([node_history[n][-1] for n in nodes]).reshape(len(nodes), 1).astype(float)
    x_t = torch.tensor(x, dtype=torch.float32)
    with torch.no_grad():
        out = model(x_t, torch.tensor(adj, dtype=torch.float32)).numpy().ravel()
    return {n: float(v) for n, v in zip(nodes, out)}
