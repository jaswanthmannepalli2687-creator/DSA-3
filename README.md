# FlowMax - Network Flow Optimization System (DSA-3)

An interactive, browser-based network flow optimization application implementing the **Edmonds-Karp** algorithm for computing Maximum Flow and finding Minimum Cuts (Max-Flow Min-Cut Theorem).

## 🚀 Features

- **Interactive Flow Network Canvas**: Visual graph representation with nodes, directed edges, and flow capacities.
- **Edmonds-Karp Algorithm**: Implements BFS-based augmenting path search for maximum flow calculation.
- **Step-by-Step Animation**: Visually traces augmenting paths in real time.
- **Min-Cut Computation**: Identifies and highlights bottleneck cut edges in the network.
- **Customizable Graph**: Add vertices, directed edges with capacities, or load a pre-built example network.
- **Residual Capacities & Flow Assignment**: Displays full flow assignments and residual tables along with execution logs.

## 📁 Project Structure

```
├── index.html       # Main UI and canvas layout
├── style.css        # Responsive styling and dark theme
├── script.js        # Graph interactions, Edmonds-Karp algorithm, and canvas rendering
├── README.txt       # Original project instructions
└── README.md        # Project documentation
```

## 🛠️ How to Run

This is a pure client-side web application. No installation, backend, or database is required.

1. **Option 1: Direct Browser**
   - Double-click `index.html` or open it in any modern web browser (Chrome, Edge, Firefox, Safari).

2. **Option 2: VS Code Live Server**
   - Open this folder in VS Code.
   - Install the **Live Server** extension.
   - Right-click `index.html` and choose **"Open with Live Server"**.

## 📖 Technologies Used

- **HTML5 Canvas** for dynamic graph rendering
- **Vanilla CSS3** for modern UI and dark mode styling
- **JavaScript (ES6+)** for graph data structures and algorithm implementation