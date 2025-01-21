# TODO: Refactor this file into a solid documentation file (like the readme)

## Ideas:
- Describe how Cline has been refactored (into Recline) and now uses a layered architecture with proper domain and integration layers.

- All variables and functions must have explicit types to assist AI models working within the sourcecode (less spaghetti)

- Numbered comments should be placed, indicating control flow (1, 2, 3...) to assist AI models working within the sourcecode.

- No ESLint errors. No TS errors.

- Having all the types in explicit files might seem overkill, but will help the AI model understand the project without even having called any tools as all the file paths (which are passed regardless) are descriptive! This will speed the TTE (Time (un)Till Edits)
