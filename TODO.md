# Recline TODO

## Purpose of This Document
This document outlines ideas and enhancements planned for future versions of Recline.
By storing these concepts within the repository, collaborators have more context of planning and the development process in general.

### **General**

#### **1. Refactor to event-driven architecture**
  - The user mainly interacts with Recline through the chat interface.
    - This essentially creates a stream of messages. From the user to the assistant and vice versa.
    - The messages trigger user messages trigger core functionality, tool calls and tool calls trigger tool results, etc...
    - Because of this it seems as though event driven architecture (e.g. RxJS) seems like a much better fit for Recline instead of the monolithic Recline.ts and ReclineProvider.ts
    - This should also solve most of (if not all of) the numerous state-based issues Cline suffered from.
    - This way all logic is also very modular and decentralized. Again, making maintenance and the implementation of new features much easier (and safer!)

#### **2. Split the current UI components into cleaner, more focussed (and thus smaller) components.**
  - This will make general maintenance and new feature development much easier.

#### **3. Remove duplicate logic from the UI**
  - For example, the retrieval of openrouter models is now directly done in the front end which seems inefficient.
  - All functionality should be handled in the extension (through the event-driven architecture previously described).
  - The UI should also get a dedicated event-driven implementation with dedicated event busses
  - The webview communicator (ReclineProvider) can then act as a middle-man to translate content from one message bus to the other.

### **Known Issues**
#### **1. Terminal 'proceed while running' seems to be broken**
  - Whilst using vite 6 i saw that the sidebar did not offer the option to 'proceed while running'
  - This MIGHT be related to the way Cline checks if a terminal is 'compiling'. I noticed the "ready" Vite 6 uses was not included as an end marker. This has since been added but needs to be tested.
#### **2. I've managed to get browser use working on copilot, but it seems to be unable to click more than once**

### **New Features**
#### **1. Dynamic Output Limit Management**
- **Objective**: Ensure optimal interaction with models by adapting instructions to their specific output limits.
- **Requirements**:
  - **Dynamic System Prompt Injection**:
    - The system should inject instructions into the prompt based on the model’s output limit.
    - For models with small output limits, provide tailored guidance to maximize information bundling (e.g., following Anthropic guidelines for models like Claude).
    - For models favoring smaller, iterative requests (e.g., Copilot), inject instructions accordingly.
  - **Responsive Breakpoints**:
    - Implement a dynamic classification system to assign models to specific categories.
    - Define and apply model-specific instructions based on their class (e.g., high-capacity bundling vs. incremental interaction).

#### **2. Smarter Context Window Management**
- **Objective**: Optimize the usage of the model's context window for efficient processing and enhanced user experience.
- **Requirements**:
  - **Token-Based Message Selection**:
    - Leverage token count metadata to select the most efficient subset of historical messages for the context window.
  - **Optimization Algorithms**:
    - Implement statistical methods to calculate an optimal balance between recency and token utilization.
    - Support tailored configurations for smaller models to maximize performance while minimizing token usage.
  - **Scalability**:
    - Allow for differentiated behavior between larger models (which may not require aggressive optimizations) and smaller models.

#### **3. Throttling Mechanism**
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

#### **4. Queueing System Integration**
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

#### **5. Configurable Temperature with Auto Mode**
- **Objective**: Provide users with control over the temperature setting while introducing an intelligent auto mode for dynamic temperature adjustments.
- **Requirements**:
  - **Manual Temperature Configuration**:
    - Allow users to manually set the temperature value.
  - **Auto Mode**:
    - Implement an algorithm to infer the optimal temperature based on the nature of the prompt.
    - Examples:
      - Refactoring tasks → Low temperature (precise and deterministic outputs).
      - Designing new features → High temperature (creative and exploratory outputs).

#### **6. Memory Bank with Abstractions and Drivers**
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

##### **7. Retrieval of Recent Git Commits**
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

##### **8. Dynamic System Prompt**
- **Objective**: Implement intelligent system prompt generation to optimize context window usage and improve response relevance.
- **Requirements**:
  - **Keyword Analysis**:
    - Develop parser to identify key terms and topics in user prompts
    - Build dictionary of prompt-relevant content mappings
    - Support fuzzy matching for related terms
  - **Context Management**:
    - Create modular system prompt components
    - Dynamically include/exclude sections based on user query
    - Maintain core system capabilities in base prompt
  - **Optimization**:
    - Reduce context window overhead for unused definitions
    - Prioritize most relevant context for current interaction
    - Monitor prompt size impact on performance
  - **Configuration**:
    - Allow customization of keyword mappings
    - Support priority levels for different content blocks
    - Enable addition of new dynamic sections
  - **Error Handling**:
    - Gracefully handle missing content modules
    - Provide feedback if prompt exceeds size limits
