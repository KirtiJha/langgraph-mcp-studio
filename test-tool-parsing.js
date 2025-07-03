// Quick test to verify tool call parsing logic
const testContent = `[{"name": "sequentialthinking", "arguments": {"thought": "First, I need to get the current date and time in Bangalore. Then, I will use git tools to find recent commits in this repository.", "nextThoughtNeeded": true, "thoughtNumber": 1, "totalThoughts": 2}}]

To get the current date and time in Bangalore, I will use the 'get_current_time' tool with the parameter 'Asia/Kolkata' (the IANA timezone for Bangalore).

For the recent commits in this repository, I will use the 'git_log' tool to list the commits.

Now, let's execute these steps.

[{"name": "get_current_time", "arguments": {"timezone": "Asia/Kolkata"}}, {"name": "git_log", "arguments": {"repo_path": ".", "max_count": 5}}]`;

// Simple regex to find all JSON arrays that contain tool calls
const toolCallArrayRegex = /\[\s*\{[^}]*"name"\s*:\s*"[^"]+[^}]*\}[^\]]*\]/g;
let arrayMatch;
const toolCallArrays = [];

while ((arrayMatch = toolCallArrayRegex.exec(testContent)) !== null) {
  try {
    const toolCallsArray = JSON.parse(arrayMatch[0]);
    if (Array.isArray(toolCallsArray)) {
      console.log("Found tool call array:", toolCallsArray);
      toolCallArrays.push(toolCallsArray);
    }
  } catch (parseError) {
    console.warn("Failed to parse tool call array:", parseError);
  }
}

console.log(`Total arrays found: ${toolCallArrays.length}`);
console.log("All tool calls:", toolCallArrays.flat());
