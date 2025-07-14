# weather-mcp

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This is an [MCP](https://modelcontextprotocol.io/introduction) server for fetching the current weather using an [Open Weather API](https://openweathermap.org/api). This is a simple example to learn how to configure and use MCP servers.

To configure this for Claude Code or Gemini CLI, add the following to their configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "bun",
      "args": ["run", "<path-before-this>/weather-mcp/index.ts"],
      "env": {
        "WEATHER_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

Then listing the mcp servers should show the tools available
