# ⚡ CodeFlow Technical Project Report
**Date:** February 23, 2026  
**Architect:** Antigravity AI  
**Subject:** Full-Stack Technical Specification & Architectural Overview of 'CodeFlow'

---

## 1. Project Overview
### The Problem
Traditional IDEs are designed for production, not comprehension. For students and junior developers, the jump between "syntax" and "runtime logic" is a cognitive chasm. Understanding how a variable state changes within a nested loop or how a recursion stack unwinds is difficult when looking at static text.

### The Significance
CodeFlow solves the **Logic Transparency Problem**. By converting abstract source code into living, breathing visual structures, it reduces the mental overhead required to debug complex algorithms and understand state mutation.

### Core Idea
The platform acts as a **Time-Travel Visualizer**. It allows users to execute code line-by-line while simultaneously watching a Flow Diagram evolve, a Memory Panel update, and a Step Story unfold.

---

## 2. Core Features Implemented
*   **Monaco Editor Integration:** Embedded VS Code-grade editor with custom themes, breakpoint markers, and real-time syntax highlighting.
*   **Polyglot Execution Engine:** Support for JavaScript, Python, C++, Java, and SQL. Uses a hybrid approach of **Local AST Interpretation** (JS) and **Subprocess Scripting** (Python/Java).
*   **Visual Flowchart Generation:** Dynamic SVG-based flowchart that highlights the active node during execution.
*   **Interactive Terminal Session:** A custom WebSocket-powered terminal that handles runtime `input()` and `stdio` streams.
*   **Step-by-Step Visualization:** 
    *   **Execution Trace:** A history of every logical step taken.
    *   **Memory Panel:** Real-time view of active variables and their current values.
    *   **Call Stack Viewer:** Visualizing the stack frames during function execution.
*   **Glassmorphic UI:** A premium, high-contrast dark theme designed for long sessions of technical focus.

---

## 3. System Architecture
### Frontend Architecture (React + Zustand)
Built using a **Unidirectional Data Flow** pattern.
*   **State Management:** `Zustand` serves as the single source of truth (`executionStore.js`), managing code, execution steps, and UI state.
*   **Reactive UI:** Components like `<FlowChart />` and `<CodeExplainer />` are purely functional, reacting instantly to index changes in the step array.

### Backend Architecture (Node.js + WebSockets)
*   **Protocol:** `ws` (WebSockets) for full-duplex communication, essential for streaming execution headers and steps without the overhead of HTTP.
*   **Engine:** A decoupled `Executor` class on the server that separates code parsing from transmission logic.

### Execution Pipeline Flow
1.  **Ingestion:** User hits 'Run'. Frontend sends source code + inputs via WebSocket.
2.  **Parsing:** Server uses `@babel/parser` to generate an Abstract Syntax Tree (AST).
3.  **Step Generation:** The `Executor` traverses the AST. Instead of just running the code, it captures a "Snapshot" of the system state (`variables`, `line`, `stack`, `output`) at every significant node.
4.  **Streaming:** The server broadcasts these snapshots one-by-one (or in bulk) to the client.
5.  **Rehydration:** Frontend receives the steps, calculates the SVG node positions, and updates the view.

---

## 4. Internal Mechanics
### The Lifecycle of a Run
*   **Auto-Detection:** A regex-based heuristic identifies the language before the user even clicks run.
*   **Static Explanation:** The `CodeExplainer` component performs an immediate "Shallow Parse" to define what each line does in plain English.
*   **Input Handling:** If the system detects an `input()` call, the backend pauses, signals the frontend to show a prompt, and waits for a WebSocket message containing the user response before resuming.

### Flowchart Generation Logic
The `stepGenerator.js` maps AST node types (e.g., `IfStatement`, `ForStatement`) to specific visual shapes:
*   **Oval:** Start/End
*   **Rhombus (Diamond):** Decision logic (Conditions)
*   **Parallelogram:** Input/Output
*   **Rectangle:** Variable assignments/Declarations

---

## 5. Technical Strengths
*   **Low Latency:** WebSocket streaming ensures that as soon as the server executes a step, the UI pulses.
*   **Cross-Language Extensibility:** The architecture uses a "Generic Executor" interface, making it easy to add new languages by simply defining AST-to-Step mapping rules.
*   **Educational Depth:** Unlike a debugger, it shows the "why" via the Step Story and Explainer.

---

## 6. Limitations & Security
*   **Sandbox Isolation:** Currently, code runs in the host Node.js environment. This poses a RCE (Remote Code Execution) risk if deployed publicly without containerization.
*   **Iteration Limits:** Hard-capped at 1000 iterations and 5000 steps to prevent infinite loop memory exhaustion.
*   **Synchronous Execution:** Long-running loops on the server can block the event loop for other users if not handled via worker threads.

---

## 7. Future Scope
*   **AI Integration:** Using LLMs to provide "Why did this crash?" hints at specific execution steps.
*   **Collaborative Live Coding:** Multi-user sessions where an instructor can "drive" the visualization for students.
*   **Interview Mode:** Automated test case validation with complexity analysis (Big O visualization).
*   **LMS Integration:** Exporting interactive traces as SCORM/LTI packages for classroom use.

---

## 8. Advanced Improvements
*   **Microservices Migration:** Move language-specific executors into separate Docker-containerized microservices (e.g., a dedicated Python-Executor pod).
*   **K8s Scaling:** Horizontal scaling of execution pods to handle thousands of concurrent visualizations.
*   **AST Visualizer:** A 3D view of the actual tree structure being traversed.

---

## 9. Testing Strategy
*   **Unit Testing:** Testing the `Executor` class against known competitive programming problems.
*   **Regression Testing:** Ensuring AST changes don't break the SVG layout engine.
*   **Security Auditing:** Fuzzing the input handlers to ensure no shell injection escapes the language environment.

---

## 10. Deployment Strategy
*   **Infrastructure:** AWS/DigitalOcean with a reverse proxy (Nginx) handling SSL termination and WebSocket upgrades.
*   **CI/CD:** GitHub Actions triggers a production build, runs build-check, and pushes the image to a container registry for hot-reloading the backend.
