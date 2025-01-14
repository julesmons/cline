# Recline TODO

## Purpose of This Document
This document outlines ideas and enhancements planned for future versions of Recline.
By storing these concepts within the repository, collaborators have more context of planning and the development process in general.

### **1. Dynamic Output Limit Management**
- **Objective**: Ensure optimal interaction with models by adapting instructions to their specific output limits.
- **Requirements**:
  - **Dynamic System Prompt Injection**:
    - The system should inject instructions into the prompt based on the model’s output limit.
    - For models with small output limits, provide tailored guidance to maximize information bundling (e.g., following Anthropic guidelines for models like Claude).
    - For models favoring smaller, iterative requests (e.g., Copilot), inject instructions accordingly.
  - **Responsive Breakpoints**:
    - Implement a dynamic classification system to assign models to specific categories.
    - Define and apply model-specific instructions based on their class (e.g., high-capacity bundling vs. incremental interaction).

### **2. Smarter Context Window Management**
- **Objective**: Optimize the usage of the model's context window for efficient processing and enhanced user experience.
- **Requirements**:
  - **Token-Based Message Selection**:
    - Leverage token count metadata to select the most efficient subset of historical messages for the context window.
  - **Optimization Algorithms**:
    - Implement statistical methods to calculate an optimal balance between recency and token utilization.
    - Support tailored configurations for smaller models to maximize performance while minimizing token usage.
  - **Scalability**:
    - Allow for differentiated behavior between larger models (which may not require aggressive optimizations) and smaller models.

### **3. Throttling Mechanism**
- **Objective**: Enforce provider-specific rate limits to prevent exceeding quotas and ensure consistent operation.
- **Requirements**:
  - **Rate Limiting**:
    - Support configurable limits for requests per second, minute, or hour based on provider constraints.
  - **Queueing System Integration**:
    - Develop a pipeline-based throttling mechanism that works seamlessly with a queueing system.
    - Provide visual feedback to the user when limits are reached:
      - Display countdown timers indicating when further requests can be made.
      - Notify users when limits are close to being reached to encourage more efficient usage.
  - **Strategy Options**:
    - Support multiple throttling strategies, such as token-based, request-based, or combined approaches.

### **4. Queueing System Integration**
- **Objective**: Manage requests effectively to comply with throttling and ensure seamless user interaction.
- **Requirements**:
  - **Pipeline-Based Design**:
    - Design a queueing system that prioritizes requests based on urgency and available quotas.
  - **User Interface Feedback**:
    - Provide real-time feedback on the state of the queue, including:
      - Estimated wait times for queued requests.
      - Progress indicators for request processing.
  - **Seamless Throttler Integration**:
    - Ensure that the queueing system dynamically adjusts to throttling constraints without manual intervention.

### **5. Configurable Temperature with Auto Mode**
- **Objective**: Provide users with control over the temperature setting while introducing an intelligent auto mode for dynamic temperature adjustments.
- **Requirements**:
  - **Manual Temperature Configuration**:
    - Allow users to manually set the temperature value.
  - **Auto Mode**:
    - Implement an algorithm to infer the optimal temperature based on the nature of the prompt.
    - Examples:
      - Refactoring tasks → Low temperature (precise and deterministic outputs).
      - Designing new features → High temperature (creative and exploratory outputs).

### **6. Memory Bank with Abstractions and Drivers**
- **Objective**: Enable the system to maintain a dynamic memory bank that can be utilized by tools to store and retrieve information effectively, supporting various storage backends and abstractions.
- **Requirements**:
  - **Memory Bank Functionality**:
    - Provide tools with the ability to write to and retrieve data from a living memory bank.
    - Ensure the memory bank can store structured data and maintain context across sessions or interactions.
  - **Abstractions**:
    - Define a standard interface for interacting with the memory bank, ensuring tools can operate seamlessly regardless of the underlying storage mechanism.'
      - ListMemoryKeys
      - SetMemory
      - GetMemory
      - ...etc...
  - **Drivers**:
    - Support multiple storage backends through drivers, such as:
      - **Markdown Driver**:
        - Allow tools to create and manage a markdown file in the project root as a memory store.
      - **In-Memory Driver**:
        - Maintain a volatile memory store for short-term, fast-access use cases.
      - **Database or External Store Driver (Optional)**:
        - Provide a placeholder or optional implementation for integration with databases or external memory services.
  - **Extensibility**:
    - Allow developers to add custom drivers to extend the functionality of the memory bank.
  - **Management and Cleanup**:
    - Include mechanisms for memory cleanup and optimization to avoid performance degradation.

#### **7. Retrieval of Recent Git Commits**
- **Objective**: Enable the system to retrieve recent git commits to provide context for the model, improving its ability to reference prior work and understand historical context during interactions.
- **Requirements**:
  - **Git Commit Retrieval Tool**:
    - Implement a tool that fetches the latest git commits from the repository.
    - Provide configurable options to specify:
      - The number of commits to retrieve.
      - Whether to include details such as commit messages, authors, timestamps, and diffs.
  - **Integration with Memory Bank**:
    - Allow the retrieved commit information to be written to the memory bank for future reference.
    - Support indexing and referencing commits in response to user prompts (e.g., “in a previous session we have...”).
  - **User Context Enhancement**:
    - Enable the model to leverage commit history when responding to queries about recent changes or prior sessions.
  - **Error Handling**:
    - Provide feedback if the tool cannot access git commits due to repository issues (e.g., no git initialized, missing permissions).
  - **Optimization**:
    - Fetch commit data efficiently to avoid delays in user interaction.
